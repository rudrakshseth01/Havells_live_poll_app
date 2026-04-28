import React, { useMemo, useState } from "react";
import { ICONS, classNames } from "./icons";

// Normalize a Supabase poll row into the editor's local shape (option ids "o1","o2",...).
function fromDb(p) {
  return {
    id: p.id,
    name: p.name || "",
    description: p.description || "",
    status: p.status,
    questions: (p.questions || []).map((q) => {
      const localOpts = (q.options || []).map((o, oi) => ({
        id: "o" + (oi + 1),
        label: o.label || "",
        _dbId: o.id,
      }));
      const correctLocal = q.correct_option_id
        ? localOpts.find((o) => o._dbId === q.correct_option_id)?.id || null
        : null;
      return {
        id: q.id,
        text: q.text || "",
        type: q.type || "multiple",
        timer: q.timer || 30,
        scoring: !!q.scoring,
        correct: correctLocal,
        options: localOpts.map(({ _dbId, ...rest }) => rest),
        research: { headline: q.research_headline || "", source: q.research_source || "" },
      };
    }),
  };
}

function makeQuestion() {
  return {
    id: "q_" + Math.random().toString(36).slice(2, 7),
    text: "",
    type: "multiple",
    timer: 30,
    scoring: false,
    correct: null,
    options: [
      { id: "o1", label: "" },
      { id: "o2", label: "" },
    ],
    research: { headline: "", source: "" },
  };
}

export function AdminEdit({ initial, existingNames, onCancel, onSave, onLaunch, onDelete }) {
  const [poll, setPoll] = useState(() =>
    initial ? fromDb(initial) : {
      id: null,
      name: "",
      description: "",
      status: "draft",
      questions: [makeQuestion()],
    }
  );
  const [activeIdx, setActiveIdx] = useState(0);
  const [busy, setBusy] = useState(false);

  const nameError = useMemo(() => {
    const trimmed = poll.name.trim();
    if (!trimmed) return null;
    const conflict = existingNames.find(n =>
      n.id !== poll.id && n.name.toLowerCase() === trimmed.toLowerCase());
    return conflict ? "A poll with this name already exists." : null;
  }, [poll.name, existingNames, poll.id]);

  function update(patch) { setPoll(p => ({ ...p, ...patch })); }
  function updateQ(idx, patch) {
    setPoll(p => ({
      ...p,
      questions: p.questions.map((q, i) => i === idx ? { ...q, ...patch } : q)
    }));
  }
  function setQType(idx, type) {
    setPoll(p => ({
      ...p,
      questions: p.questions.map((q, i) => {
        if (i !== idx) return q;
        let options = q.options;
        if (type === "truefalse") options = [{ id: "o1", label: "True" }, { id: "o2", label: "False" }];
        else if (type === "rating") options = [1,2,3,4,5].map((n,k) => ({ id: "o"+(k+1), label: String(n) }));
        else if (q.options.length < 2) options = [{ id: "o1", label: "" }, { id: "o2", label: "" }];
        return { ...q, type, options, correct: null };
      })
    }));
  }
  function addOption(idx) {
    setPoll(p => ({
      ...p,
      questions: p.questions.map((q, i) => {
        if (i !== idx || q.options.length >= 8) return q;
        return { ...q, options: [...q.options, { id: "o" + (q.options.length + 1), label: "" }] };
      })
    }));
  }
  function removeOption(idx, oid) {
    setPoll(p => ({
      ...p,
      questions: p.questions.map((q, i) => {
        if (i !== idx) return q;
        if (q.options.length <= 2) return q;
        return { ...q, options: q.options.filter(o => o.id !== oid) };
      })
    }));
  }
  function addQuestion() {
    setPoll(p => ({ ...p, questions: [...p.questions, makeQuestion()] }));
    setActiveIdx(poll.questions.length);
  }
  function deleteQuestion(idx) {
    if (poll.questions.length <= 1) return;
    setPoll(p => ({ ...p, questions: p.questions.filter((_, i) => i !== idx) }));
    setActiveIdx(Math.max(0, idx - 1));
  }

  const canSave = poll.name.trim() && !nameError && !busy;
  const q = poll.questions[activeIdx];

  async function doSave(thenLaunch) {
    if (!canSave) return;
    setBusy(true);
    try {
      const saved = await onSave(poll);
      if (thenLaunch && saved) await onLaunch(saved);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ padding: "32px 40px 80px", maxWidth: 1280, margin: "0 auto", width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
        <button className="btn btn--ghost" onClick={onCancel}>{ICONS.back}</button>
        <div style={{ flex: 1 }}>
          <div className="muted" style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            {initial ? "Edit poll" : "New poll"}
          </div>
          <h1 style={{ margin: "4px 0 0", fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em" }}>
            {poll.name || "Untitled poll"}
          </h1>
        </div>
        <button className="btn" onClick={onCancel}>Cancel</button>
        {onLaunch && (
          <button
            className="btn btn--primary"
            onClick={() => doSave(true)}
            disabled={!canSave}
            style={{ opacity: canSave ? 1 : 0.45, cursor: canSave ? "pointer" : "not-allowed" }}
            title="Save and launch this poll live"
          >
            {ICONS.play} Launch live
          </button>
        )}
        {initial && onDelete && (
          <button className="btn btn--danger" onClick={() => onDelete(initial)}>
            {ICONS.trash} Delete game
          </button>
        )}
        <button
          className="btn btn--primary"
          disabled={!canSave}
          style={{ opacity: canSave ? 1 : 0.45, cursor: canSave ? "pointer" : "not-allowed" }}
          onClick={() => doSave(false)}
        >
          {ICONS.check} {busy ? "Saving…" : "Save draft"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 24 }}>
        <div className="col" style={{ gap: 16 }}>
          <div className="card" style={{ padding: 18 }}>
            <label className="label">Poll name</label>
            <input className="input" placeholder="e.g. Q3 Strategy Pulse"
              value={poll.name}
              onChange={e => update({ name: e.target.value })}
            />
            {nameError && (
              <div style={{ color: "var(--red)", fontSize: 12, marginTop: 6 }}>{nameError}</div>
            )}

            <label className="label" style={{ marginTop: 16 }}>Description</label>
            <textarea
              className="input"
              rows={3}
              style={{ resize: "vertical", minHeight: 70 }}
              placeholder="What's this poll for?"
              value={poll.description}
              onChange={e => update({ description: e.target.value })}
            />
          </div>

          <div className="card" style={{ padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div className="label" style={{ margin: 0 }}>Questions</div>
              <button className="btn btn--ghost" style={{ padding: "4px 8px", fontSize: 12 }} onClick={addQuestion}>
                {ICONS.plus} Add
              </button>
            </div>
            <div className="col" style={{ gap: 6 }}>
              {poll.questions.map((qq, i) => (
                <button
                  key={qq.id}
                  onClick={() => setActiveIdx(i)}
                  style={{
                    background: i === activeIdx ? "var(--primary-soft)" : "transparent",
                    border: "1px solid " + (i === activeIdx ? "rgba(124,92,255,.4)" : "var(--line-soft)"),
                    color: "var(--text)",
                    borderRadius: 10,
                    padding: "10px 12px",
                    textAlign: "left",
                    display: "flex", alignItems: "center", gap: 10,
                    fontSize: 13,
                  }}
                >
                  <span className="mono" style={{
                    width: 22, height: 22, borderRadius: 6, display: "grid", placeItems: "center",
                    background: i === activeIdx ? "var(--primary)" : "var(--surface-2)",
                    color: i === activeIdx ? "white" : "var(--text-muted)",
                    fontSize: 11, fontWeight: 600,
                  }}>{i + 1}</span>
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {qq.text || <span className="dim">Untitled question</span>}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {q && (
          <div className="card rise" key={q.id} style={{ padding: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div className="muted" style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Question {activeIdx + 1} of {poll.questions.length}
              </div>
              {poll.questions.length > 1 && (
                <button className="btn btn--ghost btn--danger" style={{ padding: "6px 10px", fontSize: 13 }}
                  onClick={() => deleteQuestion(activeIdx)}>
                  {ICONS.trash} Remove
                </button>
              )}
            </div>

            <label className="label">Question</label>
            <input
              className="input input--lg"
              placeholder="Type the question players will see…"
              value={q.text}
              onChange={e => updateQ(activeIdx, { text: e.target.value })}
            />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 18 }}>
              <div>
                <label className="label">Question type</label>
                <div className="seg" style={{ width: "100%" }}>
                  {[
                    { id: "multiple",  label: "Multiple choice" },
                    { id: "truefalse", label: "True / False" },
                    { id: "rating",    label: "Rating 1–5" },
                  ].map(t => (
                    <button key={t.id}
                      style={{ flex: 1 }}
                      className={classNames("seg__btn", q.type === t.id && "is-active")}
                      onClick={() => setQType(activeIdx, t.id)}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Timer · {q.timer}s</label>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <input type="range" min="10" max="90" step="5"
                    value={q.timer}
                    onChange={e => updateQ(activeIdx, { timer: +e.target.value })}
                    style={{ flex: 1, accentColor: "var(--primary)" }}
                  />
                  <div className="mono" style={{
                    width: 56, textAlign: "center", padding: "6px 0",
                    background: "var(--surface-2)", borderRadius: 8, fontSize: 13,
                  }}>{q.timer}s</div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 22 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <label className="label" style={{ marginBottom: 0 }}>Options</label>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-muted)", cursor: q.type === "rating" ? "not-allowed" : "pointer" }}>
                    <input type="checkbox" checked={q.scoring}
                      disabled={q.type === "rating"}
                      onChange={e => updateQ(activeIdx, { scoring: e.target.checked, correct: null })}
                      style={{ accentColor: "var(--primary)" }}
                    />
                    Score this question
                  </label>
                  {q.type === "multiple" && q.options.length < 8 && (
                    <button className="btn btn--ghost" style={{ padding: "4px 10px", fontSize: 13 }}
                      onClick={() => addOption(activeIdx)}>
                      {ICONS.plus} Add option
                    </button>
                  )}
                </div>
              </div>

              <div className="col" style={{ gap: 8 }}>
                {q.options.map((opt, i) => (
                  <div key={opt.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: ["var(--primary)", "var(--cyan)", "var(--pink)", "var(--green)", "var(--amber)", "#A78BFA", "#FB7185", "#60A5FA"][i % 8],
                      display: "grid", placeItems: "center", color: "white", fontWeight: 700, fontSize: 12,
                    }}>{String.fromCharCode(65 + i)}</div>
                    <input
                      className="input"
                      readOnly={q.type === "truefalse" || q.type === "rating"}
                      placeholder={q.type === "rating" ? `Rating ${i + 1}` : `Option ${String.fromCharCode(65 + i)}`}
                      value={opt.label}
                      onChange={e => updateQ(activeIdx, {
                        options: q.options.map(o => o.id === opt.id ? { ...o, label: e.target.value } : o)
                      })}
                      style={{ flex: 1 }}
                    />
                    {q.scoring && q.type !== "rating" && (
                      <button
                        title={q.correct === opt.id ? "Correct answer" : "Set as correct"}
                        onClick={() => updateQ(activeIdx, { correct: q.correct === opt.id ? null : opt.id })}
                        style={{
                          padding: "9px 16px 9px 10px",
                          borderRadius: 999,
                          background: q.correct === opt.id ? "var(--green)" : "transparent",
                          border: "1.5px solid " + (q.correct === opt.id ? "var(--green)" : "var(--line)"),
                          color: q.correct === opt.id ? "#0B1220" : "var(--text-muted)",
                          fontWeight: 700,
                          fontSize: 12,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          cursor: "pointer",
                          display: "flex", alignItems: "center", gap: 8,
                          whiteSpace: "nowrap",
                          boxShadow: q.correct === opt.id ? "0 4px 14px rgba(52,211,153,.35)" : "none",
                          transition: "all .15s",
                        }}>
                        <span style={{
                          width: 18, height: 18, borderRadius: 99,
                          display: "grid", placeItems: "center",
                          background: q.correct === opt.id ? "#0B1220" : "transparent",
                          border: q.correct === opt.id ? "0" : "1.5px solid currentColor",
                          color: q.correct === opt.id ? "var(--green)" : "currentColor",
                        }}>
                          {q.correct === opt.id && (
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                          )}
                        </span>
                        {q.correct === opt.id ? "Correct" : "Set correct"}
                      </button>
                    )}
                    {q.type === "multiple" && q.options.length > 2 && (
                      <button className="btn btn--icon btn--ghost btn--danger" onClick={() => removeOption(activeIdx, opt.id)}>
                        {ICONS.close}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 24, padding: 18, background: "var(--bg-2)", borderRadius: 14, border: "1px dashed var(--line)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div style={{ color: "var(--cyan)" }}>{ICONS.sparkles}</div>
                <label className="label" style={{ margin: 0 }}>Research insight (shown after question)</label>
              </div>
              <textarea
                className="input"
                rows={2}
                style={{ resize: "vertical", marginBottom: 8 }}
                placeholder="A fact, stat, or insight to share once voting closes."
                value={q.research?.headline || ""}
                onChange={e => updateQ(activeIdx, { research: { ...q.research, headline: e.target.value } })}
              />
              <input
                className="input"
                style={{ fontSize: 13 }}
                placeholder="Source (e.g. McKinsey 2025 study)"
                value={q.research?.source || ""}
                onChange={e => updateQ(activeIdx, { research: { ...q.research, source: e.target.value } })}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
