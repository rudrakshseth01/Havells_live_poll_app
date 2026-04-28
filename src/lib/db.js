// Data layer: every UI concept maps to a Supabase query here.
// Components never import @supabase/supabase-js directly.
import { supabase, getClientId } from "./supabase";

const PALETTE = ["#7C5CFF", "#F472B6", "#FBBF24", "#34D399", "#22D3EE", "#A78BFA", "#FB7185", "#60A5FA"];
function hashColor(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

// ============================================================
// Profiles
// ============================================================
export async function getMyProfile(userId) {
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  return data;
}

// ============================================================
// Polls (admin)
// ============================================================
export async function listPolls(ownerId) {
  const { data: polls, error } = await supabase
    .from("polls")
    .select("*, questions(*, options(*))")
    .eq("owner_id", ownerId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (polls || []).map(normalizePoll);
}

export async function getPoll(id) {
  const { data, error } = await supabase
    .from("polls")
    .select("*, questions(*, options(*))")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? normalizePoll(data) : null;
}

function normalizePoll(p) {
  const questions = (p.questions || [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((q) => ({
      ...q,
      options: (q.options || []).slice().sort((a, b) => a.position - b.position),
    }));
  return { ...p, questions };
}

export async function createPoll(ownerId, draft) {
  const { data: poll, error } = await supabase
    .from("polls")
    .insert({
      owner_id: ownerId,
      name: draft.name.trim(),
      description: draft.description || "",
      status: "draft",
    })
    .select()
    .single();
  if (error) throw error;
  await replaceQuestions(poll.id, draft.questions || []);
  return getPoll(poll.id);
}

export async function updatePoll(pollId, draft) {
  const { error: e1 } = await supabase
    .from("polls")
    .update({
      name: draft.name.trim(),
      description: draft.description || "",
    })
    .eq("id", pollId);
  if (e1) throw e1;
  await replaceQuestions(pollId, draft.questions || []);
  return getPoll(pollId);
}

// Wipes-and-rewrites questions/options. Simpler than a diff and good enough since
// edits only happen on drafts (not on live or finished polls).
async function replaceQuestions(pollId, questions) {
  await supabase.from("questions").delete().eq("poll_id", pollId);
  for (let qi = 0; qi < questions.length; qi++) {
    const q = questions[qi];
    const { data: qRow, error: qErr } = await supabase
      .from("questions")
      .insert({
        poll_id: pollId,
        position: qi,
        text: q.text || "",
        type: q.type || "multiple",
        timer: q.timer || 30,
        scoring: !!q.scoring,
        research_headline: q.research?.headline || "",
        research_source: q.research?.source || "",
      })
      .select()
      .single();
    if (qErr) throw qErr;

    const opts = (q.options || []).map((o, oi) => ({
      question_id: qRow.id,
      position: oi,
      label: o.label || "",
    }));
    if (opts.length > 0) {
      const { data: optRows, error: oErr } = await supabase
        .from("options")
        .insert(opts)
        .select();
      if (oErr) throw oErr;
      // Resolve correct option (the editor uses local oid like "o1"; we map by position)
      if (q.scoring && q.correct) {
        const correctIdx = (q.options || []).findIndex((o) => o.id === q.correct);
        if (correctIdx >= 0) {
          const correctRow = optRows.find((r) => r.position === correctIdx);
          if (correctRow) {
            await supabase
              .from("questions")
              .update({ correct_option_id: correctRow.id })
              .eq("id", qRow.id);
          }
        }
      }
    }
  }
}

export async function duplicatePoll(ownerId, source) {
  const fresh = {
    name: source.name + " (copy)",
    description: source.description || "",
    questions: (source.questions || []).map((q) => ({
      text: q.text,
      type: q.type,
      timer: q.timer,
      scoring: q.scoring,
      research: { headline: q.research_headline, source: q.research_source },
      options: (q.options || []).map((o, oi) => ({ id: "o" + (oi + 1), label: o.label })),
      correct: q.correct_option_id
        ? "o" + (1 + (q.options || []).findIndex((o) => o.id === q.correct_option_id))
        : null,
    })),
  };
  return createPoll(ownerId, fresh);
}

export async function deletePoll(id) {
  const { error } = await supabase.from("polls").delete().eq("id", id);
  if (error) throw error;
}

// ============================================================
// Sessions (live runs)
// ============================================================
export async function launchSession(pollId) {
  const { data, error } = await supabase.rpc("launch_session", { p_poll_id: pollId });
  if (error) throw error;
  // Supabase returns the row as the function result
  return Array.isArray(data) ? data[0] : data;
}

export async function getSession(id) {
  const { data, error } = await supabase.from("sessions").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getSessionByCode(code) {
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("code", code.toUpperCase())
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function setSessionPhase(sessionId, phase, currentQuestionId = undefined) {
  const patch = { phase };
  if (currentQuestionId !== undefined) {
    patch.current_question_id = currentQuestionId;
    patch.current_question_started_at = new Date().toISOString();
  }
  const { error } = await supabase.from("sessions").update(patch).eq("id", sessionId);
  if (error) throw error;
}

export async function finalizeSession(sessionId) {
  const { error } = await supabase.rpc("finalize_session", { p_session_id: sessionId });
  if (error) throw error;
}

// ============================================================
// Participants (anonymous players)
// ============================================================
export async function joinSession(sessionId, name, emoji) {
  const clientId = getClientId();
  // Upsert keeps (session_id, client_id) idempotent across reconnects.
  const { data, error } = await supabase
    .from("participants")
    .upsert(
      {
        session_id: sessionId,
        client_id: clientId,
        name: name.trim() || "Guest",
        emoji: emoji || "👋",
        color: hashColor(name + clientId),
      },
      { onConflict: "session_id,client_id" }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getMyParticipant(sessionId) {
  const clientId = getClientId();
  const { data } = await supabase
    .from("participants")
    .select("*")
    .eq("session_id", sessionId)
    .eq("client_id", clientId)
    .maybeSingle();
  return data;
}

export async function listParticipants(sessionId) {
  const { data, error } = await supabase
    .from("participants")
    .select("*")
    .eq("session_id", sessionId)
    .order("joined_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

// ============================================================
// Answers
// ============================================================
export async function submitAnswer(sessionId, participantId, questionId, optionId) {
  const { error } = await supabase
    .from("answers")
    .insert({
      session_id: sessionId,
      participant_id: participantId,
      question_id: questionId,
      option_id: optionId,
    });
  if (error && error.code !== "23505") throw error; // 23505 = duplicate (already answered)
}

export async function listAnswersForQuestion(sessionId, questionId) {
  const { data, error } = await supabase
    .from("answers")
    .select("option_id, participant_id")
    .eq("session_id", sessionId)
    .eq("question_id", questionId);
  if (error) throw error;
  return data || [];
}

// Latest finalized session for a poll, plus per-question option counts. Used by AdminDetails.
export async function getFinishedPollResults(pollId) {
  const { data: ses } = await supabase
    .from("sessions")
    .select("id, ended_at")
    .eq("poll_id", pollId)
    .not("ended_at", "is", null)
    .order("ended_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!ses) return { sessionId: null, participants: 0, results: {} };

  const [{ count }, { data: answers }] = await Promise.all([
    supabase.from("participants").select("*", { count: "exact", head: true }).eq("session_id", ses.id),
    supabase.from("answers").select("question_id, option_id").eq("session_id", ses.id),
  ]);

  const results = {};
  for (const a of answers || []) {
    if (!results[a.question_id]) results[a.question_id] = {};
    results[a.question_id][a.option_id] = (results[a.question_id][a.option_id] || 0) + 1;
  }
  return { sessionId: ses.id, participants: count || 0, results, endedAt: ses.ended_at };
}

// ============================================================
// Reactions (lobby emoji)
// ============================================================
export async function sendReaction(sessionId, participantId, name, emoji) {
  await supabase.from("reactions").insert({
    session_id: sessionId,
    participant_id: participantId,
    name: name || "Guest",
    emoji,
    x: 5 + Math.random() * 90,
  });
}

// ============================================================
// Realtime subscriptions
// ============================================================
export function subscribeSession(sessionId, onChange) {
  const ch = supabase
    .channel(`session:${sessionId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "sessions", filter: `id=eq.${sessionId}` },
      (payload) => onChange(payload.new)
    )
    .subscribe();
  return () => {
    supabase.removeChannel(ch);
  };
}

export function subscribeParticipants(sessionId, onChange) {
  const ch = supabase
    .channel(`participants:${sessionId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "participants", filter: `session_id=eq.${sessionId}` },
      onChange
    )
    .subscribe();
  return () => {
    supabase.removeChannel(ch);
  };
}

export function subscribeAnswers(sessionId, onInsert) {
  const ch = supabase
    .channel(`answers:${sessionId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "answers", filter: `session_id=eq.${sessionId}` },
      (payload) => onInsert(payload.new)
    )
    .subscribe();
  return () => {
    supabase.removeChannel(ch);
  };
}

export function subscribeReactions(sessionId, onInsert) {
  const ch = supabase
    .channel(`reactions:${sessionId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "reactions", filter: `session_id=eq.${sessionId}` },
      (payload) => onInsert(payload.new)
    )
    .subscribe();
  return () => {
    supabase.removeChannel(ch);
  };
}

// ============================================================
// Helpers
// ============================================================
export function relativeUpdated(iso) {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.round(ms / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d} day${d === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString();
}

export function buildJoinUrl(code) {
  const base =
    typeof window !== "undefined"
      ? `${window.location.origin}`
      : "https://havells.live";
  return `${base}/?join=${code}`;
}
