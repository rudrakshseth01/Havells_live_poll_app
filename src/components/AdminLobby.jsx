import React from "react";
import { ICONS } from "./icons";
import { QrCode } from "./QrCode";
import { buildJoinUrl } from "../lib/db";

export function AdminLobby({ poll, session, participants, reactions, onStart, onExit }) {
  const joinUrl = buildJoinUrl(session.code);

  return (
    <div style={{ minHeight: "100%", padding: "32px 48px", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 24 }}>
        <button className="btn btn--ghost" onClick={onExit}>{ICONS.back} Exit lobby</button>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
          <span className="tag tag--live">LOBBY · OPEN</span>
          <div className="row" style={{ gap: 6 }}>
            {ICONS.users}
            <span className="mono" style={{ fontSize: 15, fontWeight: 600 }}>{participants.length}</span>
            <span className="muted" style={{ fontSize: 13 }}>joined</span>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1fr)", gap: 36, flex: 1 }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div className="muted" style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
            Now starting
          </div>
          <h1 style={{ margin: 0, fontSize: 56, lineHeight: 1.05, letterSpacing: "-0.025em", fontWeight: 600, maxWidth: 700 }}>
            {poll.name}
          </h1>
          <p className="muted" style={{ marginTop: 14, fontSize: 18, maxWidth: 540, lineHeight: 1.45 }}>
            {poll.description}
          </p>

          <div style={{ display: "flex", gap: 32, alignItems: "center", marginTop: 36 }}>
            <div className="gradient-border" style={{ padding: 14, borderRadius: 26 }}>
              <QrCode value={joinUrl} size={220} />
            </div>
            <div>
              <div className="muted" style={{ fontSize: 14, marginBottom: 8 }}>Or join at</div>
              <div className="mono" style={{ fontSize: 18, fontWeight: 600, letterSpacing: "0.02em", wordBreak: "break-all", maxWidth: 360 }}>
                {joinUrl}
              </div>
              <div style={{ marginTop: 18 }}>
                <div className="muted" style={{ fontSize: 14, marginBottom: 8 }}>Game code</div>
                <div style={{ display: "inline-flex", gap: 6 }}>
                  {session.code.split("").map((ch, i) => (
                    <div key={i} className="mono" style={{
                      width: 44, height: 56,
                      background: "var(--surface)",
                      border: "1px solid var(--line)",
                      borderRadius: 10,
                      display: "grid", placeItems: "center",
                      fontSize: 26, fontWeight: 600,
                      color: "var(--text)",
                    }}>{ch}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 40, display: "flex", gap: 12, alignItems: "center" }}>
            <button className="btn btn--primary btn--xl" onClick={onStart} disabled={participants.length === 0}
              style={{ opacity: participants.length === 0 ? 0.45 : 1 }}>
              Start poll {ICONS.arrow}
            </button>
            <span className="muted" style={{ fontSize: 13 }}>
              {participants.length === 0 ? "Waiting for players to join…" : "Players are ready when you are."}
            </span>
          </div>
        </div>

        <div className="card" style={{ display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
          <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--line-soft)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>In the lobby</div>
              <div className="muted" style={{ fontSize: 12 }}>Reactions float live as players tap</div>
            </div>
            <div className="mono" style={{ fontSize: 13, color: "var(--text-muted)" }}>
              {participants.length} <span className="dim">/ ∞</span>
            </div>
          </div>

          <div style={{ position: "relative", flex: 1, overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
              {reactions.map((r) => (
                <div key={r.id} className="reaction"
                  style={{ left: r.x + "%", "--tx": "0px", "--drift": (Math.random() * 80 - 40) + "px" }}>
                  <span>{r.emoji}</span>
                  {r.name && <span className="reaction__name">{r.name}</span>}
                </div>
              ))}
            </div>

            <div style={{ padding: 18, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10, overflowY: "auto", maxHeight: "100%" }}>
              {participants.map((p, i) => (
                <div key={p.id} className="rise" style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--line-soft)",
                  borderRadius: 12, padding: "10px 12px",
                  display: "flex", alignItems: "center", gap: 10,
                  animationDelay: `${i * 30}ms`,
                }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 10,
                    background: p.color || "#7C5CFF", display: "grid", placeItems: "center",
                    color: "white", fontWeight: 700, fontSize: 13,
                  }}>{p.name[0]?.toUpperCase()}</div>
                  <div style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {p.name}
                  </div>
                  <span style={{ fontSize: 16 }}>{p.emoji}</span>
                </div>
              ))}
              {participants.length === 0 && (
                <div className="dim" style={{ gridColumn: "1 / -1", textAlign: "center", padding: 60, fontSize: 14 }}>
                  Waiting for players…
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
