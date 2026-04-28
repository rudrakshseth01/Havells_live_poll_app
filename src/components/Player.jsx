import React from "react";
import { ICONS, REACTION_EMOJIS, classNames } from "./icons";

// In production the player is already on a real phone — wrap the content in a
// plain centered column instead of the prototype's fake-phone chrome.
function PlayerShell({ children }) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      minHeight: "100%",
      width: "100%",
      maxWidth: 480,
      margin: "0 auto",
      position: "relative",
    }}>
      {children}
    </div>
  );
}

export function PlayerJoin({ poll, name, setName, picked, setPicked, onJoin, busy }) {
  return (
    <PlayerShell>
      <div style={{ padding: "20px 22px 30px", flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: "linear-gradient(135deg, var(--primary), var(--cyan))" }} />
          <div style={{ fontWeight: 600, fontSize: 15 }}>havells live</div>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 4px" }}>
          <div className="muted" style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
            You're joining
          </div>
          <h1 style={{ margin: "0 0 30px", fontSize: 26, lineHeight: 1.15, letterSpacing: "-0.015em", fontWeight: 600 }}>
            {poll.name}
          </h1>

          <label className="label">Your name</label>
          <input
            className="input input--lg"
            placeholder="What should we call you?"
            value={name}
            onChange={e => setName(e.target.value)}
          />

          <label className="label" style={{ marginTop: 20 }}>Pick a vibe</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6 }}>
            {REACTION_EMOJIS.map(e => (
              <button key={e} onClick={() => setPicked(e)}
                style={{
                  fontSize: 20, padding: 8,
                  background: picked === e ? "var(--primary-soft)" : "var(--surface)",
                  border: "1.5px solid " + (picked === e ? "var(--primary)" : "var(--line-soft)"),
                  borderRadius: 10, cursor: "pointer",
                }}>{e}</button>
            ))}
          </div>
        </div>
        <button className="btn btn--primary btn--xl"
          disabled={!name.trim() || busy} onClick={onJoin}
          style={{ width: "100%", justifyContent: "center", opacity: (!name.trim() || busy) ? 0.4 : 1, cursor: (!name.trim() || busy) ? "not-allowed" : "pointer" }}>
          {busy ? "Joining…" : "Join lobby"}
        </button>
      </div>
    </PlayerShell>
  );
}

export function PlayerLobby({ poll, name, picked, onSendReaction, totalPlayers, reactions = [] }) {
  return (
    <PlayerShell>
      <div style={{ padding: "20px 22px 26px", flex: 1, display: "flex", flexDirection: "column", position: "relative" }}>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 1 }}>
          {reactions.map((r) => (
            <div key={r.id} className="reaction"
              style={{ left: r.x + "%", "--tx": "0px", "--drift": (Math.random() * 60 - 30) + "px" }}>
              <span>{r.emoji}</span>
              {r.name && <span className="reaction__name">{r.name}</span>}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative", zIndex: 2 }}>
          <div className="row" style={{ gap: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: "linear-gradient(135deg, var(--primary), var(--cyan))" }} />
            <div style={{ fontWeight: 600, fontSize: 14 }}>havells live</div>
          </div>
          <div className="row" style={{ gap: 6, color: "var(--text-muted)", fontSize: 12 }}>
            {ICONS.users}
            <span className="mono">{totalPlayers}</span>
          </div>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "center", position: "relative", zIndex: 2 }}>
          <div style={{ fontSize: 64, marginBottom: 12 }}>{picked}</div>
          <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em" }}>You're in, {name}!</div>
          <div className="muted" style={{ fontSize: 14, marginTop: 6, padding: "0 16px" }}>
            Hang tight — we'll start once everyone's joined.
          </div>

          <div style={{ marginTop: 32 }}>
            <div className="muted" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
              Send a reaction
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6, padding: "0 14px" }}>
              {REACTION_EMOJIS.map(e => (
                <button key={e} onClick={() => onSendReaction(e)}
                  style={{
                    fontSize: 22, padding: 10,
                    background: "var(--surface)",
                    border: "1px solid var(--line-soft)",
                    borderRadius: 12, cursor: "pointer",
                    transition: "transform .12s",
                  }}
                  onMouseDown={ev => ev.currentTarget.style.transform = "scale(.92)"}
                  onMouseUp={ev => ev.currentTarget.style.transform = ""}
                  onMouseLeave={ev => ev.currentTarget.style.transform = ""}
                >{e}</button>
              ))}
            </div>
          </div>
        </div>

        <div style={{
          padding: "12px 14px", background: "var(--surface)", borderRadius: 12,
          border: "1px solid var(--line-soft)",
          display: "flex", alignItems: "center", gap: 10,
          position: "relative", zIndex: 2,
        }}>
          <div style={{ width: 8, height: 8, borderRadius: 99, background: "var(--green)", animation: "pulse 1.4s ease-in-out infinite" }} />
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Waiting for the host to start…
          </div>
        </div>
      </div>
    </PlayerShell>
  );
}

export function PlayerVote({ poll, qIndex, secondsLeft, distribution, answered, totalPlayers, onPick, picked, motion = 1 }) {
  const q = poll.questions[qIndex];
  const isQuizQ = !!(q?.scoring && q?.correct_option_id);
  const total = totalPlayers || 1;
  const totalVotes = distribution.reduce((a, b) => (a || 0) + (b || 0), 0);
  const pctDenom = Math.max(total, totalVotes, 1);
  const optionPalette = ["#7C5CFF", "#22D3EE", "#F472B6", "#34D399", "#FBBF24"];

  if (!q) return null;

  return (
    <PlayerShell>
      <div style={{ padding: "16px 18px", flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <div className="muted mono" style={{ fontSize: 11 }}>Q{qIndex + 1}/{poll.questions.length}</div>
            <span className={classNames("tag", isQuizQ ? "tag--quiz" : "tag--poll")} style={{ fontSize: 9, padding: "3px 7px" }}>
              {isQuizQ ? "✦ Quiz" : "◆ Poll"}
            </span>
          </div>
          <div className="row" style={{ gap: 6 }}>
            <span style={{ color: secondsLeft <= 5 ? "var(--red)" : "var(--text-muted)" }}>{ICONS.clock}</span>
            <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: secondsLeft <= 5 ? "var(--red)" : "var(--text)" }}>
              {Math.max(0, secondsLeft)}s
            </span>
          </div>
        </div>

        <div className="bar-track" style={{ height: 4, marginBottom: 18 }}>
          <div style={{
            height: "100%",
            width: `${(Math.max(0, secondsLeft) / q.timer) * 100}%`,
            background: secondsLeft <= 5 ? "var(--red)" : "var(--primary)",
            borderRadius: 99,
            transition: "width 1s linear",
          }}/>
        </div>

        <div style={{ fontSize: 18, lineHeight: 1.3, fontWeight: 600, marginBottom: 18, letterSpacing: "-0.005em" }}>
          {q.text}
        </div>

        <div className="col" style={{ gap: 8, flex: 1 }}>
          {q.options.map((o, i) => {
            const isPicked = picked === o.id;
            const color = optionPalette[i % optionPalette.length];
            return (
              <button
                key={o.id}
                onClick={() => onPick(o.id)}
                disabled={picked !== null && !isPicked}
                style={{
                  textAlign: "left", padding: "14px 14px",
                  background: isPicked ? color : "var(--surface)",
                  border: "1.5px solid " + (isPicked ? color : "var(--line-soft)"),
                  color: isPicked ? "white" : "var(--text)",
                  borderRadius: 14,
                  display: "flex", alignItems: "center", gap: 12, minWidth: 0,
                  fontSize: 15, fontWeight: 500,
                  cursor: picked && !isPicked ? "not-allowed" : "pointer",
                  opacity: picked && !isPicked ? 0.5 : 1,
                  transition: "all .15s",
                }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: 7,
                  background: isPicked ? "rgba(255,255,255,.2)" : color,
                  display: "grid", placeItems: "center",
                  color: "white", fontWeight: 700, fontSize: 12, flexShrink: 0,
                }}>{String.fromCharCode(65 + i)}</div>
                <span style={{
                  flex: 1, minWidth: 0,
                  overflowWrap: "anywhere", wordBreak: "break-word",
                  whiteSpace: "normal",
                }}>{o.label}</span>
                {isPicked && <span style={{ flexShrink: 0 }}>{ICONS.check}</span>}
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: 16, padding: "12px 14px", background: "var(--surface)", border: "1px solid var(--line-soft)", borderRadius: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: isQuizQ ? 0 : 8 }}>
            <span className="muted" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {isQuizQ ? "Answers locked in" : "Live · everyone's answers"}
            </span>
            <span className="mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>
              {answered}/{total}
            </span>
          </div>
          {!isQuizQ && (
            <div style={{ display: "flex", height: 14, borderRadius: 99, overflow: "hidden", background: "var(--surface-2)" }}>
              {q.options.map((o, i) => {
                const v = distribution[i] || 0;
                const pct = (v / pctDenom) * 100;
                return (
                  <div key={o.id}
                    style={{
                      width: pct + "%",
                      background: optionPalette[i % optionPalette.length],
                      transition: `width ${0.5 * motion}s cubic-bezier(.2,.8,.2,1)`,
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PlayerShell>
  );
}

export function PlayerResearch({ poll, qIndex, distribution = [], playerPick }) {
  const q = poll.questions[qIndex];
  const isQuizQ = !!(q?.scoring && q?.correct_option_id);
  const safeDist = distribution.map(x => x || 0);
  const totalVotes = safeDist.reduce((a, b) => a + b, 0) || 1;
  const optionPalette = ["#7C5CFF", "#22D3EE", "#F472B6", "#34D399", "#FBBF24"];
  const winnerIdx = safeDist.indexOf(Math.max(0, ...safeDist));
  const playerCorrect = isQuizQ && playerPick && playerPick === q.correct_option_id;

  if (!q) return null;

  return (
    <PlayerShell>
      <div style={{ padding: "16px 18px", flex: 1, display: "flex", flexDirection: "column", overflow: "auto" }}>
        {isQuizQ && playerPick && (
          <div style={{
            padding: "16px 18px",
            background: playerCorrect ? "rgba(52,211,153,.14)" : "rgba(248,113,113,.12)",
            border: "1.5px solid " + (playerCorrect ? "rgba(52,211,153,.45)" : "rgba(248,113,113,.4)"),
            borderRadius: 14, marginBottom: 14,
            textAlign: "center",
          }}>
            <div style={{ fontSize: 32, marginBottom: 4 }}>{playerCorrect ? "✅" : "❌"}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: playerCorrect ? "var(--green)" : "var(--red)", letterSpacing: "-0.01em" }}>
              {playerCorrect ? "Correct!" : "Not quite."}
            </div>
          </div>
        )}
        {isQuizQ && !playerPick && (
          <div style={{ padding: "12px 14px", background: "var(--surface)", borderRadius: 12, marginBottom: 12, textAlign: "center", border: "1px dashed var(--line)" }}>
            <div className="muted" style={{ fontSize: 13 }}>You didn't lock in an answer</div>
          </div>
        )}
        <div className="muted" style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
          {isQuizQ ? "Correct answer" : "Results"}
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.3, marginBottom: 14 }}>
          {q.text}
        </div>

        <div className="col" style={{ gap: 10, marginBottom: 18 }}>
          {q.options.map((o, i) => {
            const v = distribution[i] || 0;
            const pct = Math.round((v / totalVotes) * 100);
            const color = optionPalette[i % optionPalette.length];
            const isCorrect = isQuizQ && o.id === q.correct_option_id;
            const isWinner = !isQuizQ && i === winnerIdx && v > 0;
            const dim = isQuizQ && !isCorrect;
            const fillRgb = isCorrect ? "52, 211, 153" : null;
            return (
              <div key={o.id} style={{
                position: "relative",
                background: "var(--surface)",
                border: `1px solid ${isCorrect ? "rgba(52,211,153,0.4)" : isWinner ? "rgba(124,92,255,0.3)" : "var(--line-soft)"}`,
                borderRadius: 12, padding: "12px 14px",
                overflow: "hidden",
                opacity: dim ? 0.5 : 1, transition: "opacity .3s",
              }}>
                <div style={{
                  position: "absolute", inset: 0,
                  width: pct + "%",
                  background: isCorrect
                    ? `linear-gradient(90deg, rgba(${fillRgb},0.55), rgba(${fillRgb},0.22))`
                    : `linear-gradient(90deg, ${color}99, ${color}33)`,
                  transition: "width .6s cubic-bezier(.2,.8,.2,1)",
                }} />
                <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: 7,
                    background: isCorrect ? "var(--green)" : color,
                    display: "grid", placeItems: "center", color: "white", fontWeight: 700, fontSize: 11, flexShrink: 0,
                  }}>{isCorrect
                    ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                    : String.fromCharCode(65 + i)}</div>
                  <div style={{
                    flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: isWinner || isCorrect ? 700 : 500,
                    color: isCorrect ? "var(--green)" : undefined,
                    overflowWrap: "anywhere", wordBreak: "break-word",
                    display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap",
                  }}>
                    <span>{o.label}</span>
                    {isCorrect && <span style={{
                      fontSize: 8, fontWeight: 700, letterSpacing: "0.08em",
                      padding: "2px 5px", borderRadius: 4,
                      background: "rgba(52,211,153,.18)", color: "var(--green)",
                      border: "1px solid rgba(52,211,153,.35)",
                    }}>CORRECT</span>}
                    {isWinner && <span style={{
                      fontSize: 8, fontWeight: 700, letterSpacing: "0.08em",
                      padding: "3px 6px", borderRadius: 5,
                      background: "var(--primary)", color: "white",
                      textTransform: "uppercase",
                      boxShadow: "0 2px 6px rgba(124,92,255,.35)",
                    }}>Top pick</span>}
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div className="mono" style={{ fontSize: 16, fontWeight: 700, lineHeight: 1, color: isCorrect ? "var(--green)" : undefined }}>{pct}%</div>
                    <div className="muted mono" style={{ fontSize: 9, marginTop: 2 }}>{v} {v === 1 ? "vote" : "votes"}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {q.research_headline && (
          <div style={{
            padding: "16px 18px",
            background: "linear-gradient(135deg, rgba(34,211,238,.10), rgba(124,92,255,.06))",
            borderRadius: 14,
            border: "1px solid rgba(34,211,238,.2)",
            maxHeight: 200,
            overflowY: "auto",
          }}>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8, color: "var(--cyan)" }}>
              ✦ Did you know
            </div>
            <div className="serif" style={{ fontSize: 19, lineHeight: 1.3, letterSpacing: "-0.005em" }}>
              "{q.research_headline}"
            </div>
            {q.research_source && (
              <div className="muted" style={{ fontSize: 11, marginTop: 8, fontStyle: "italic" }}>— {q.research_source}</div>
            )}
          </div>
        )}
      </div>
    </PlayerShell>
  );
}

export function PlayerFinished({ poll }) {
  return (
    <PlayerShell>
      <div style={{ padding: "20px 22px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "center" }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
        <h1 style={{ fontSize: 28, margin: "0 0 8px", letterSpacing: "-0.015em" }}>That's a wrap!</h1>
        <p className="muted" style={{ fontSize: 14, padding: "0 8px", lineHeight: 1.5 }}>
          Thanks for joining {poll.name}. Your responses are part of the story now.
        </p>
      </div>
    </PlayerShell>
  );
}

export function PlayerCodeEntry({ initialCode = "", onSubmit, busy, error }) {
  const [code, setCode] = React.useState(initialCode);
  return (
    <PlayerShell>
      <div style={{ padding: "20px 22px", flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 28 }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: "linear-gradient(135deg, var(--primary), var(--cyan))" }} />
          <div style={{ fontWeight: 600, fontSize: 15 }}>havells live</div>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <h1 style={{ margin: "0 0 8px", fontSize: 28, letterSpacing: "-0.015em", fontWeight: 600 }}>
            Enter game code
          </h1>
          <p className="muted" style={{ margin: "0 0 22px", fontSize: 14 }}>
            Your host will share a 6-character code, or just scan the QR.
          </p>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
            placeholder="ABC123"
            maxLength={8}
            className="input input--lg mono"
            style={{ fontSize: 24, letterSpacing: "0.16em", textAlign: "center", fontWeight: 600 }}
          />
          {error && (
            <div style={{
              marginTop: 10, padding: "8px 12px",
              background: "rgba(248,113,113,.10)",
              border: "1px solid rgba(248,113,113,.3)",
              borderRadius: 10, fontSize: 12, color: "var(--red)",
            }}>{error}</div>
          )}
        </div>
        <button className="btn btn--primary btn--xl"
          disabled={code.length < 4 || busy} onClick={() => onSubmit(code)}
          style={{ width: "100%", justifyContent: "center", opacity: (code.length < 4 || busy) ? 0.4 : 1 }}>
          {busy ? "Joining…" : "Join"}
        </button>
      </div>
    </PlayerShell>
  );
}
