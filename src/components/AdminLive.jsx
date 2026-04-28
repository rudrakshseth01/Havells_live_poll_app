import React from "react";
import { ICONS, classNames } from "./icons";

export function AdminLive({ poll, qIndex, phase, distribution, answeredCount, secondsLeft, totalPlayers, onNext, onExit, motion = 1 }) {
  const q = poll.questions[qIndex];
  const isQuizQ = !!(q?.scoring && q?.correct_option_id);
  const total = totalPlayers || 1;
  const totalVotes = distribution.reduce((a, b) => (a || 0) + (b || 0), 0);
  const pctDenom = Math.max(total, totalVotes, 1);

  const optionPalette = ["#7C5CFF", "#22D3EE", "#F472B6", "#34D399", "#FBBF24", "#A78BFA", "#FB7185", "#60A5FA"];

  if (!q) return null;

  return (
    <div style={{ minHeight: "100%", padding: "28px 48px", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 22 }}>
        <button className="btn btn--ghost" onClick={onExit}>{ICONS.back} Exit</button>
        <div className="muted mono" style={{ marginLeft: 14, fontSize: 13 }}>
          Q{qIndex + 1} / {poll.questions.length}
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
          <span className={classNames("tag", isQuizQ ? "tag--quiz" : "tag--poll")}>
            {isQuizQ ? "✦ Quiz · scored" : "◆ Poll"}
          </span>
          {phase === "voting" && <span className="tag tag--live">LIVE</span>}
          {phase === "research" && <span className="tag tag--finished">RESULTS</span>}
          <div className="row" style={{ gap: 6 }}>
            {ICONS.users}
            <span className="mono" style={{ fontSize: 15, fontWeight: 600 }}>
              {answeredCount}<span className="dim">/{total}</span>
            </span>
            <span className="muted" style={{ fontSize: 13 }}>answered</span>
          </div>
        </div>
      </div>

      {phase !== "research" ? (
        <>
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span className="muted" style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Time remaining
              </span>
              <span className="mono" style={{ fontSize: 14, fontWeight: 600, color: secondsLeft <= 5 ? "var(--red)" : "var(--text)" }}>
                {Math.max(0, secondsLeft)}s
              </span>
            </div>
            <div className="bar-track" style={{ height: 8 }}>
              <div className="bar-fill" style={{
                width: `${(Math.max(0, secondsLeft) / q.timer) * 100}%`,
                background: secondsLeft <= 5
                  ? "linear-gradient(90deg, var(--red), var(--amber))"
                  : "linear-gradient(90deg, var(--primary), var(--cyan))",
                transition: `width 1s linear`,
              }}/>
            </div>
          </div>

          <h1 style={{ margin: "0 0 32px", fontSize: 44, lineHeight: 1.1, letterSpacing: "-0.02em", fontWeight: 600, maxWidth: 1100 }}>
            {q.text}
          </h1>

          <div className="col" style={{ gap: 14, flex: 1 }}>
            {q.options.map((o, i) => {
              const v = distribution[i] || 0;
              const pct = Math.round((v / pctDenom) * 100);
              const color = optionPalette[i % optionPalette.length];
              return (
                <div key={o.id} style={{
                  position: "relative",
                  background: "var(--surface)",
                  border: "1px solid var(--line-soft)",
                  borderRadius: 18, padding: "20px 24px",
                  overflow: "hidden",
                }}>
                  {!isQuizQ && (
                    <div style={{
                      position: "absolute", inset: 0,
                      width: pct + "%",
                      background: `linear-gradient(90deg, ${color}26, ${color}10)`,
                      transition: `width ${0.6 * motion}s cubic-bezier(.2,.8,.2,1)`,
                    }} />
                  )}
                  <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 16, minWidth: 0 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10, background: color,
                      display: "grid", placeItems: "center", color: "white", fontWeight: 700, fontSize: 16, flexShrink: 0,
                    }}>{String.fromCharCode(65 + i)}</div>
                    <div style={{
                      flex: 1, minWidth: 0, fontSize: 20, fontWeight: 500,
                      overflowWrap: "anywhere", wordBreak: "break-word",
                    }}>{o.label}</div>
                    {!isQuizQ ? (
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div className="mono" style={{ fontSize: 24, fontWeight: 600, lineHeight: 1 }}>{pct}%</div>
                        <div className="muted mono" style={{ fontSize: 11, marginTop: 4 }}>{v} votes</div>
                      </div>
                    ) : (
                      <div className="muted mono" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", flexShrink: 0 }}>
                        Hidden
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", alignItems: "center", marginTop: 28, gap: 14 }}>
            <span className="muted" style={{ fontSize: 13 }}>
              {secondsLeft > 0 && answeredCount < total
                ? `Auto-advances when timer ends or all players answer`
                : `All set — ready to reveal the insight.`}
            </span>
            <button className="btn btn--primary btn--lg" style={{ marginLeft: "auto" }} onClick={onNext}>
              {isQuizQ ? "Reveal answer" : "Reveal insight"} {ICONS.arrow}
            </button>
          </div>
        </>
      ) : (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", maxWidth: 1100, margin: "0 auto", width: "100%", paddingTop: 8 }}>
          <div className="muted" style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>
            {isQuizQ
              ? `Correct answer · ${distribution[q.options.findIndex(o => o.id === q.correct_option_id)] || 0} of ${total} got it right`
              : `Results · ${totalVotes} of ${total} ${total === 1 ? "player" : "players"} answered`}
          </div>
          <h2 style={{ margin: "0 0 22px", fontSize: 30, fontWeight: 600, letterSpacing: "-0.015em", lineHeight: 1.2 }}>
            {q.text}
          </h2>
          <div className="col" style={{ gap: 18, marginBottom: 28 }}>
            {q.options.map((o, i) => {
              const v = distribution[i] || 0;
              const pct = Math.round((v / pctDenom) * 100);
              const color = optionPalette[i % optionPalette.length];
              const isCorrect = isQuizQ && o.id === q.correct_option_id;
              const maxV = Math.max(0, ...distribution.map(x => x || 0));
              const firstWinnerIdx = distribution.findIndex(x => (x || 0) === maxV);
              const isWinner = !isQuizQ && v === maxV && v > 0 && i === firstWinnerIdx;
              const dim = isQuizQ && !isCorrect;
              const fillColor = isCorrect ? "52, 211, 153" : null;
              return (
                <div key={o.id} style={{
                  position: "relative",
                  background: "var(--surface)",
                  border: `1px solid ${isCorrect ? "rgba(52,211,153,0.35)" : isWinner ? "rgba(124,92,255,0.25)" : "var(--line-soft)"}`,
                  borderRadius: 18, padding: "20px 24px",
                  overflow: "hidden",
                  opacity: dim ? 0.5 : 1, transition: "opacity .3s",
                }}>
                  <div style={{
                    position: "absolute", inset: 0,
                    width: pct + "%",
                    background: isCorrect
                      ? `linear-gradient(90deg, rgba(${fillColor},0.55), rgba(${fillColor},0.22))`
                      : `linear-gradient(90deg, ${color}99, ${color}33)`,
                    transition: `width ${0.8 * motion}s cubic-bezier(.2,.8,.2,1)`,
                  }} />
                  <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 16, minWidth: 0 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10,
                      background: isCorrect ? "var(--green)" : color,
                      display: "grid", placeItems: "center", color: "white", fontWeight: 700, fontSize: 16, flexShrink: 0,
                    }}>{isCorrect
                      ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                      : String.fromCharCode(65 + i)}</div>
                    <div style={{
                      flex: 1, minWidth: 0, fontSize: 20, fontWeight: isWinner || isCorrect ? 600 : 500,
                      overflowWrap: "anywhere", wordBreak: "break-word",
                      display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
                    }}>
                      <span>{o.label}</span>
                      {isCorrect && <span className="tag tag--finished" style={{ fontSize: 10 }}>Correct</span>}
                      {isWinner && <span style={{
                        display: "inline-flex", alignItems: "center",
                        fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
                        padding: "4px 8px", borderRadius: 6,
                        background: "var(--primary)", color: "white",
                        textTransform: "uppercase",
                        boxShadow: "0 2px 8px rgba(124,92,255,.35)",
                      }}>Top pick</span>}
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div className="mono" style={{ fontSize: 24, fontWeight: 700, lineHeight: 1 }}>{pct}%</div>
                      <div className="muted mono" style={{ fontSize: 11, marginTop: 4 }}>{v} {v === 1 ? "vote" : "votes"}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {q.research_headline && (
            <div style={{
              padding: "26px 30px",
              background: "linear-gradient(135deg, rgba(34,211,238,.10), rgba(124,92,255,.06))",
              borderRadius: 18,
              border: "1px solid rgba(34,211,238,.2)",
              maxHeight: 280,
              overflowY: "auto",
            }}>
              <div className="muted" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10, color: "var(--cyan)" }}>
                ✦ Did you know
              </div>
              <div className="serif" style={{ fontSize: 30, lineHeight: 1.35, letterSpacing: "-0.01em", display: "block" }}>
                "{q.research_headline}"
              </div>
              {q.research_source && (
                <div className="muted" style={{ fontSize: 14, marginTop: 18, fontStyle: "italic", display: "block" }}>— {q.research_source}</div>
              )}
            </div>
          )}

          <div style={{ marginTop: "auto", paddingTop: 24, display: "flex", justifyContent: "flex-end" }}>
            <button className="btn btn--primary btn--xl" onClick={onNext}>
              {qIndex < poll.questions.length - 1 ? "Next question" : "Finish poll"} {ICONS.arrow}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
