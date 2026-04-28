import React from "react";
import { classNames } from "./icons";

export function Chrome({ activePoll, phase, currentUser, onSignOut, isPlayer, playerName }) {
  const displayName = isPlayer ? (playerName || "Player") : currentUser?.profile?.name || currentUser?.email?.split("@")[0] || "Admin";
  const initial = displayName?.[0]?.toUpperCase() || "P";
  const subLabel = isPlayer
    ? "join via QR"
    : currentUser?.profile?.designation
      ? `Admin · ${currentUser.profile.designation}`
      : "Admin";

  const isLive = activePoll && phase && phase !== "done";

  return (
    <div className="chrome">
      <div className="chrome__brand">
        <div className="dot">H</div>
        <span>havells live</span>
        <small>· internal poll runner</small>
      </div>
      <div className="chrome__tabs">
        <button className={classNames("chrome__tab", "is-active")} disabled>
          {isPlayer ? "Player" : "Admin"}
          {isLive && <span className="badge" style={{ background: "var(--red)", color: "white" }}>LIVE</span>}
        </button>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, paddingLeft: 14, marginLeft: 14, borderLeft: "1px solid var(--line-soft)" }}>
        <div style={{
          width: 30, height: 30, borderRadius: "50%",
          background: isPlayer ? "var(--surface-2)" : "linear-gradient(135deg, var(--primary), var(--primary-2))",
          display: "grid", placeItems: "center",
          color: "white", fontWeight: 700, fontSize: 12,
          flexShrink: 0,
        }}>{initial}</div>
        <div style={{ minWidth: 0, lineHeight: 1.2 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 160 }}>
            {displayName}
          </div>
          <div className="muted" style={{ fontSize: 10.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 160 }}>
            {subLabel}
          </div>
        </div>
        <button onClick={onSignOut}
          title={isPlayer ? "Exit" : "Sign out"}
          style={{
            background: "transparent", border: "1px solid var(--line-soft)",
            color: "var(--text-muted)",
            padding: "6px 10px", borderRadius: 8,
            fontSize: 12, fontWeight: 500, cursor: "pointer",
            whiteSpace: "nowrap",
          }}>{isPlayer ? "Exit" : "Sign out"}</button>
      </div>
    </div>
  );
}

export function EmptyState({ title, body, action }) {
  return (
    <div style={{ display: "grid", placeItems: "center", padding: 60, minHeight: "60vh", textAlign: "center" }}>
      <div>
        <div style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>{title}</div>
        <p className="muted" style={{ margin: "0 0 20px", maxWidth: 360 }}>{body}</p>
        {action}
      </div>
    </div>
  );
}

export function DoneScreen({ poll, onExit }) {
  return (
    <div style={{ display: "grid", placeItems: "center", padding: 60, minHeight: "60vh", textAlign: "center" }}>
      <div>
        <div style={{ fontSize: 80, marginBottom: 12 }}>🎯</div>
        <h1 style={{ fontSize: 36, margin: "0 0 10px", letterSpacing: "-0.02em" }}>That's a wrap.</h1>
        <p className="muted" style={{ fontSize: 16, maxWidth: 460, margin: "0 auto 24px" }}>
          {poll.name} is finished. Results are saved to the poll's details page.
        </p>
        <div>
          <button className="btn btn--primary btn--lg" onClick={onExit}>Back to polls</button>
        </div>
      </div>
    </div>
  );
}
