import React, { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "./lib/supabase";
import * as db from "./lib/db";
import { AuthScreen } from "./components/Auth";
import { Chrome, EmptyState, DoneScreen } from "./components/Chrome";
import { AdminList } from "./components/AdminList";
import { AdminEdit } from "./components/AdminEdit";
import { AdminDetails } from "./components/AdminDetails";
import { AdminLobby } from "./components/AdminLobby";
import { AdminLive } from "./components/AdminLive";
import {
  PlayerJoin, PlayerLobby, PlayerVote, PlayerResearch, PlayerFinished, PlayerCodeEntry,
} from "./components/Player";

function getJoinCodeFromUrl() {
  const url = new URL(window.location.href);
  return url.searchParams.get("join")?.toUpperCase() || null;
}

function clearJoinFromUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete("join");
  window.history.replaceState({}, "", url.toString());
}

export function App() {
  // ─── Routing entry point ───
  // ?join=CODE in URL → player flow; otherwise admin flow.
  const [route, setRoute] = useState(() =>
    getJoinCodeFromUrl() ? "player" : "admin"
  );
  const [initialJoinCode, setInitialJoinCode] = useState(() => getJoinCodeFromUrl());

  if (route === "player") {
    return <PlayerApp initialCode={initialJoinCode} onExit={() => {
      clearJoinFromUrl();
      setInitialJoinCode(null);
      setRoute("admin");
    }} />;
  }
  return <AdminApp onPlayerJoin={() => setRoute("player")} />;
}

/* ============================================================
   ADMIN APP
   ============================================================ */
function AdminApp({ onPlayerJoin }) {
  const [authState, setAuthState] = useState({ ready: false, user: null });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthState({ ready: true, user: data.session?.user || null });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setAuthState({ ready: true, user: session?.user || null });
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!authState.ready) {
    return <div style={{ display: "grid", placeItems: "center", height: "100vh", color: "var(--text-muted)" }}>Loading…</div>;
  }

  if (!authState.user) {
    return <AuthScreen onAuth={(user) => setAuthState({ ready: true, user })} onPlayerJoin={onPlayerJoin} />;
  }

  return <AdminWorkspace user={authState.user} onSignOut={async () => {
    await supabase.auth.signOut();
    setAuthState({ ready: true, user: null });
  }} />;
}

function AdminWorkspace({ user, onSignOut }) {
  const [profile, setProfile] = useState(null);
  const [polls, setPolls] = useState([]);
  const [view, setView] = useState("list"); // list | edit | details | lobby | live | done
  const [editingPoll, setEditingPoll] = useState(null);
  const [detailsPoll, setDetailsPoll] = useState(null);
  const [activePoll, setActivePoll] = useState(null);
  const [activeSession, setActiveSession] = useState(null);

  const reloadPolls = useCallback(async () => {
    const list = await db.listPolls(user.id);
    setPolls(list);
  }, [user.id]);

  useEffect(() => {
    db.getMyProfile(user.id).then(setProfile);
    reloadPolls();
  }, [user.id, reloadPolls]);

  // Auto-rejoin a live session if the admin reloads mid-run
  useEffect(() => {
    if (activeSession) return;
    (async () => {
      const { data } = await supabase
        .from("sessions")
        .select("*")
        .eq("owner_id", user.id)
        .is("ended_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!data) return;
      const poll = await db.getPoll(data.poll_id);
      if (!poll) return;
      setActiveSession(data);
      setActivePoll(poll);
      setView(data.phase === "lobby" ? "lobby" : "live");
    })();
  }, [user.id, activeSession]);

  // ─── Actions ───
  function startCreate() { setEditingPoll(null); setView("edit"); }
  function startEdit(p) { setEditingPoll(p); setView("edit"); }
  function viewDetails(p) { setDetailsPoll(p); setView("details"); }

  async function savePoll(draft) {
    const saved = draft.id
      ? await db.updatePoll(draft.id, draft)
      : await db.createPoll(user.id, draft);
    await reloadPolls();
    setView("list");
    return saved;
  }

  async function duplicatePoll(p) {
    await db.duplicatePoll(user.id, p);
    await reloadPolls();
  }

  async function deletePoll(p) {
    if (!confirm(`Delete "${p.name}"?`)) return;
    await db.deletePoll(p.id);
    await reloadPolls();
    if (view === "edit") setView("list");
  }

  async function launchPoll(p) {
    if (!p?.id) return;
    if (!p.questions || p.questions.length === 0) {
      alert("Add at least one question before launching.");
      return;
    }
    const fresh = await db.getPoll(p.id);
    const session = await db.launchSession(p.id);
    setActivePoll(fresh);
    setActiveSession(session);
    setView("lobby");
  }

  async function exitLive() {
    if (activeSession && activeSession.phase !== "done") {
      const yes = confirm("End this live session?");
      if (!yes) return;
      try { await db.finalizeSession(activeSession.id); } catch (e) { /* ignore */ }
    }
    setActivePoll(null);
    setActiveSession(null);
    setView("list");
    await reloadPolls();
  }

  // Body
  let body;
  if (view === "edit") {
    body = (
      <AdminEdit
        initial={editingPoll}
        existingNames={polls.map((p) => ({ id: p.id, name: p.name }))}
        onCancel={() => setView("list")}
        onSave={savePoll}
        onLaunch={(saved) => launchPoll(saved)}
        onDelete={deletePoll}
      />
    );
  } else if (view === "details" && detailsPoll) {
    body = <AdminDetails poll={detailsPoll} onBack={() => setView("list")} onDuplicate={duplicatePoll} />;
  } else if (view === "lobby" && activePoll && activeSession) {
    body = <AdminLobbyContainer
      poll={activePoll}
      session={activeSession}
      onSessionUpdate={setActiveSession}
      onStart={async () => {
        const firstQ = activePoll.questions[0];
        await db.setSessionPhase(activeSession.id, "voting", firstQ.id);
        setActiveSession({ ...activeSession, phase: "voting", current_question_id: firstQ.id, current_question_started_at: new Date().toISOString() });
        setView("live");
      }}
      onExit={exitLive}
    />;
  } else if (view === "live" && activePoll && activeSession) {
    body = <AdminLiveContainer
      poll={activePoll}
      session={activeSession}
      onSessionUpdate={setActiveSession}
      onExit={exitLive}
      onDone={() => setView("done")}
    />;
  } else if (view === "done" && activePoll) {
    body = <DoneScreen poll={activePoll} onExit={exitLive} />;
  } else {
    body = <AdminList
      polls={polls}
      onCreate={startCreate}
      onEdit={startEdit}
      onDetails={viewDetails}
      onDuplicate={duplicatePoll}
      onDelete={deletePoll}
      onLaunch={launchPoll}
    />;
  }

  return (
    <div>
      <Chrome
        currentUser={{ ...user, profile }}
        onSignOut={onSignOut}
        activePoll={activePoll}
        phase={activeSession?.phase}
      />
      <div className="stage">{body}</div>
    </div>
  );
}

/* ============================================================
   ADMIN LOBBY CONTAINER — wires realtime participants + reactions
   ============================================================ */
function AdminLobbyContainer({ poll, session, onSessionUpdate, onStart, onExit }) {
  const [participants, setParticipants] = useState([]);
  const [reactions, setReactions] = useState([]);

  useEffect(() => {
    db.listParticipants(session.id).then(setParticipants);
    const offS = db.subscribeSession(session.id, (next) => onSessionUpdate({ ...session, ...next }));
    const offP = db.subscribeParticipants(session.id, (payload) => {
      setParticipants((prev) => {
        if (payload.eventType === "DELETE") return prev.filter((p) => p.id !== payload.old.id);
        if (payload.eventType === "INSERT") {
          if (prev.some((p) => p.id === payload.new.id)) return prev;
          return [...prev, payload.new];
        }
        return prev.map((p) => (p.id === payload.new.id ? payload.new : p));
      });
    });
    const offR = db.subscribeReactions(session.id, (r) => {
      setReactions((rs) => [...rs, r]);
      setTimeout(() => setReactions((rs) => rs.filter((x) => x.id !== r.id)), 2800);
    });
    return () => { offS(); offP(); offR(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id]);

  return (
    <AdminLobby
      poll={poll}
      session={session}
      participants={participants}
      reactions={reactions}
      onStart={onStart}
      onExit={onExit}
    />
  );
}

/* ============================================================
   ADMIN LIVE CONTAINER — wires timer, distribution, phase transitions
   ============================================================ */
function AdminLiveContainer({ poll, session, onSessionUpdate, onExit, onDone }) {
  const currentQ = useMemo(() => {
    if (!session.current_question_id) return poll.questions[0];
    return poll.questions.find((q) => q.id === session.current_question_id) || poll.questions[0];
  }, [poll, session.current_question_id]);
  const qIndex = poll.questions.findIndex((q) => q.id === currentQ.id);

  const [participants, setParticipants] = useState([]);
  const [answers, setAnswers] = useState([]); // for current question only

  useEffect(() => {
    db.listParticipants(session.id).then(setParticipants);
    const off = db.subscribeParticipants(session.id, (payload) => {
      setParticipants((prev) => {
        if (payload.eventType === "DELETE") return prev.filter((p) => p.id !== payload.old.id);
        if (payload.eventType === "INSERT") {
          if (prev.some((p) => p.id === payload.new.id)) return prev;
          return [...prev, payload.new];
        }
        return prev.map((p) => (p.id === payload.new.id ? payload.new : p));
      });
    });
    return off;
  }, [session.id]);

  // Subscribe to session changes (phase / current_question)
  useEffect(() => {
    return db.subscribeSession(session.id, (next) => onSessionUpdate({ ...session, ...next }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id]);

  // Reset answers when question changes; subscribe to inserts on current question
  useEffect(() => {
    if (!currentQ) return;
    let alive = true;
    setAnswers([]);
    db.listAnswersForQuestion(session.id, currentQ.id).then((a) => { if (alive) setAnswers(a); });
    const off = db.subscribeAnswers(session.id, (a) => {
      if (a.question_id !== currentQ.id) return;
      setAnswers((prev) => prev.some((x) => x.participant_id === a.participant_id) ? prev : [...prev, a]);
    });
    return () => { alive = false; off(); };
  }, [session.id, currentQ?.id]);

  // Distribution = count of answers per option (in option position order)
  const distribution = useMemo(() => {
    if (!currentQ) return [];
    const arr = currentQ.options.map(() => 0);
    for (const a of answers) {
      const idx = currentQ.options.findIndex((o) => o.id === a.option_id);
      if (idx >= 0) arr[idx] += 1;
    }
    return arr;
  }, [currentQ, answers]);
  const answeredCount = answers.length;

  // Timer (client-side countdown anchored to current_question_started_at)
  const [secondsLeft, setSecondsLeft] = useState(currentQ?.timer || 0);
  useEffect(() => {
    if (session.phase !== "voting" || !currentQ) return;
    const startedAt = session.current_question_started_at
      ? new Date(session.current_question_started_at).getTime()
      : Date.now();
    const tick = () => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const left = Math.max(0, currentQ.timer - elapsed);
      setSecondsLeft(left);
    };
    tick();
    const i = setInterval(tick, 250);
    return () => clearInterval(i);
  }, [session.phase, currentQ?.id, currentQ?.timer, session.current_question_started_at]);

  // Auto-advance to research when time runs out OR everyone answered
  useEffect(() => {
    if (session.phase !== "voting" || !currentQ) return;
    const total = participants.length;
    const everyoneAnswered = total > 0 && answeredCount >= total;
    if (secondsLeft <= 0 || everyoneAnswered) {
      const t = setTimeout(async () => {
        try { await db.setSessionPhase(session.id, "research"); } catch {}
      }, 600);
      return () => clearTimeout(t);
    }
  }, [session.phase, secondsLeft, answeredCount, participants.length, currentQ?.id, session.id]);

  async function next() {
    if (session.phase === "voting") {
      await db.setSessionPhase(session.id, "research");
      return;
    }
    // research phase → next question or done
    const nextIdx = qIndex + 1;
    if (nextIdx >= poll.questions.length) {
      await db.finalizeSession(session.id);
      onDone();
      return;
    }
    const nextQ = poll.questions[nextIdx];
    await db.setSessionPhase(session.id, "voting", nextQ.id);
  }

  return (
    <AdminLive
      poll={poll}
      qIndex={qIndex}
      phase={session.phase}
      distribution={distribution}
      answeredCount={answeredCount}
      secondsLeft={secondsLeft}
      totalPlayers={participants.length}
      onNext={next}
      onExit={onExit}
      motion={1}
    />
  );
}

/* ============================================================
   PLAYER APP — code entry, join, lobby/vote/research/done
   ============================================================ */
function PlayerApp({ initialCode, onExit }) {
  const [stage, setStage] = useState(initialCode ? "resolving" : "code");
  const [session, setSession] = useState(null);
  const [poll, setPoll] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Resolve initial code from URL (or from manual entry)
  const resolveCode = useCallback(async (code) => {
    setBusy(true); setError("");
    try {
      const ses = await db.getSessionByCode(code);
      if (!ses) { setError("No live game with that code."); setStage("code"); return; }
      if (ses.ended_at) { setError("That game has already ended."); setStage("code"); return; }
      const p = await db.getPoll(ses.poll_id);
      setSession(ses); setPoll(p); setStage("join");
    } catch (e) {
      setError(e.message || "Couldn't reach the server.");
      setStage("code");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (initialCode) resolveCode(initialCode);
  }, [initialCode, resolveCode]);

  if (stage === "resolving") {
    return <div style={{ display: "grid", placeItems: "center", height: "100vh", color: "var(--text-muted)" }}>Looking up game…</div>;
  }

  if (stage === "code") {
    return (
      <div>
        <Chrome isPlayer onSignOut={onExit} />
        <div className="stage">
          <PlayerCodeEntry initialCode={initialCode || ""} onSubmit={resolveCode} busy={busy} error={error} />
        </div>
      </div>
    );
  }

  return (
    <PlayerSessionWorkspace
      session={session}
      poll={poll}
      onExit={onExit}
      onSessionUpdate={setSession}
    />
  );
}

function PlayerSessionWorkspace({ session, poll, onExit, onSessionUpdate }) {
  const [stage, setStage] = useState("join"); // join | active
  const [name, setName] = useState("");
  const [picked, setPicked] = useState("👋");
  const [participant, setParticipant] = useState(null);
  const [busy, setBusy] = useState(false);

  // Restore previous participant for this session (so refreshes keep you in)
  useEffect(() => {
    db.getMyParticipant(session.id).then((p) => {
      if (p) {
        setParticipant(p);
        setName(p.name);
        setPicked(p.emoji);
        setStage("active");
      }
    });
  }, [session.id]);

  async function doJoin() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const p = await db.joinSession(session.id, name, picked);
      setParticipant(p);
      setStage("active");
    } catch (e) {
      alert(e.message || "Couldn't join.");
    } finally {
      setBusy(false);
    }
  }

  if (stage === "join") {
    return (
      <div>
        <Chrome isPlayer onSignOut={onExit} playerName={name} />
        <div className="stage">
          <PlayerJoin
            poll={poll}
            name={name} setName={setName}
            picked={picked} setPicked={setPicked}
            onJoin={doJoin}
            busy={busy}
          />
        </div>
      </div>
    );
  }

  return (
    <PlayerLive
      session={session}
      poll={poll}
      participant={participant}
      onExit={onExit}
      onSessionUpdate={onSessionUpdate}
    />
  );
}

function PlayerLive({ session, poll, participant, onExit, onSessionUpdate }) {
  const currentQ = useMemo(() => {
    if (!session.current_question_id) return poll.questions[0];
    return poll.questions.find((q) => q.id === session.current_question_id) || poll.questions[0];
  }, [poll, session.current_question_id]);
  const qIndex = poll.questions.findIndex((q) => q.id === currentQ.id);

  const [participants, setParticipants] = useState([]);
  const [reactions, setReactions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [myPick, setMyPick] = useState(null);

  // Realtime: session, participants, reactions
  useEffect(() => {
    db.listParticipants(session.id).then(setParticipants);
    const offS = db.subscribeSession(session.id, (next) => onSessionUpdate({ ...session, ...next }));
    const offP = db.subscribeParticipants(session.id, (payload) => {
      setParticipants((prev) => {
        if (payload.eventType === "DELETE") return prev.filter((p) => p.id !== payload.old.id);
        if (payload.eventType === "INSERT") {
          if (prev.some((p) => p.id === payload.new.id)) return prev;
          return [...prev, payload.new];
        }
        return prev.map((p) => (p.id === payload.new.id ? payload.new : p));
      });
    });
    const offR = db.subscribeReactions(session.id, (r) => {
      setReactions((rs) => [...rs, r]);
      setTimeout(() => setReactions((rs) => rs.filter((x) => x.id !== r.id)), 2800);
    });
    return () => { offS(); offP(); offR(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id]);

  // Reset and subscribe to answers for current question
  useEffect(() => {
    if (!currentQ) return;
    let alive = true;
    setAnswers([]);
    setMyPick(null);
    db.listAnswersForQuestion(session.id, currentQ.id).then((a) => {
      if (!alive) return;
      setAnswers(a);
      const mine = a.find((x) => x.participant_id === participant.id);
      if (mine) setMyPick(mine.option_id);
    });
    const off = db.subscribeAnswers(session.id, (a) => {
      if (a.question_id !== currentQ.id) return;
      setAnswers((prev) => prev.some((x) => x.participant_id === a.participant_id) ? prev : [...prev, a]);
      if (a.participant_id === participant.id) setMyPick(a.option_id);
    });
    return () => { alive = false; off(); };
  }, [session.id, currentQ?.id, participant.id]);

  // Distribution
  const distribution = useMemo(() => {
    if (!currentQ) return [];
    const arr = currentQ.options.map(() => 0);
    for (const a of answers) {
      const idx = currentQ.options.findIndex((o) => o.id === a.option_id);
      if (idx >= 0) arr[idx] += 1;
    }
    return arr;
  }, [currentQ, answers]);
  const answeredCount = answers.length;

  // Timer
  const [secondsLeft, setSecondsLeft] = useState(currentQ?.timer || 0);
  useEffect(() => {
    if (session.phase !== "voting" || !currentQ) return;
    const startedAt = session.current_question_started_at
      ? new Date(session.current_question_started_at).getTime()
      : Date.now();
    const tick = () => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      setSecondsLeft(Math.max(0, currentQ.timer - elapsed));
    };
    tick();
    const i = setInterval(tick, 250);
    return () => clearInterval(i);
  }, [session.phase, currentQ?.id, currentQ?.timer, session.current_question_started_at]);

  async function pickAnswer(optionId) {
    if (myPick) return;
    setMyPick(optionId);
    try {
      await db.submitAnswer(session.id, participant.id, currentQ.id, optionId);
    } catch (e) {
      // Revert on error
      setMyPick(null);
      alert(e.message || "Couldn't submit answer.");
    }
  }

  async function sendReaction(emoji) {
    try { await db.sendReaction(session.id, participant.id, participant.name, emoji); } catch {}
  }

  // Pick which screen to show
  let phoneBody;
  if (session.phase === "lobby") {
    phoneBody = (
      <PlayerLobby
        poll={poll}
        name={participant.name}
        picked={participant.emoji}
        onSendReaction={sendReaction}
        totalPlayers={participants.length}
        reactions={reactions}
      />
    );
  } else if (session.phase === "voting") {
    phoneBody = (
      <PlayerVote
        poll={poll}
        qIndex={qIndex}
        secondsLeft={secondsLeft}
        distribution={distribution}
        answered={answeredCount}
        totalPlayers={participants.length}
        onPick={pickAnswer}
        picked={myPick}
        motion={1}
      />
    );
  } else if (session.phase === "research") {
    phoneBody = (
      <PlayerResearch
        poll={poll}
        qIndex={qIndex}
        distribution={distribution}
        playerPick={myPick}
      />
    );
  } else {
    phoneBody = <PlayerFinished poll={poll} />;
  }

  return (
    <div>
      <Chrome isPlayer onSignOut={onExit} playerName={participant.name}
        activePoll={poll} phase={session.phase} />
      <div className="stage">{phoneBody}</div>
    </div>
  );
}
