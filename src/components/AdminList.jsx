import React, { useMemo, useState } from "react";
import { ICONS, classNames } from "./icons";
import { relativeUpdated } from "../lib/db";

export function AdminList({ polls, onCreate, onEdit, onDetails, onDuplicate, onDelete, onLaunch }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all"); // all | draft | finished

  const filtered = useMemo(() => {
    return polls.filter(p => {
      if (filter !== "all" && p.status !== filter) return false;
      if (query && !p.name.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [polls, query, filter]);

  const counts = useMemo(() => ({
    all: polls.length,
    draft: polls.filter(p => p.status === "draft").length,
    finished: polls.filter(p => p.status === "finished").length,
  }), [polls]);

  return (
    <div style={{ padding: "32px 40px 80px", maxWidth: 1280, margin: "0 auto", width: "100%" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <div className="muted" style={{ fontSize: 13, marginBottom: 6, letterSpacing: 0.04, textTransform: "uppercase", fontWeight: 600 }}>
            Admin Console
          </div>
          <h1 style={{ margin: 0, fontSize: 34, letterSpacing: "-0.02em", fontWeight: 600 }}>
            Live Polls
          </h1>
          <p className="muted" style={{ margin: "8px 0 0", fontSize: 15, maxWidth: 540 }}>
            Spin up a quick pulse-check, run a townhall, or vote on next quarter's priorities.
          </p>
        </div>
        <button className="btn btn--primary btn--lg" onClick={onCreate}>
          {ICONS.plus} New poll
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <div style={{ position: "relative", flex: "0 1 360px" }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-dim)" }}>
            {ICONS.search}
          </span>
          <input
            className="input"
            style={{ paddingLeft: 36 }}
            placeholder="Search polls"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
        <div className="seg">
          {[
            { id: "all", label: "All" },
            { id: "draft", label: "Drafts" },
            { id: "finished", label: "Finished" },
          ].map(t => (
            <button key={t.id}
              className={classNames("seg__btn", filter === t.id && "is-active")}
              onClick={() => setFilter(t.id)}>
              {t.label}
              <span className="muted" style={{ marginLeft: 6, fontSize: 11 }}>{counts[t.id]}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) 130px 140px 180px 240px",
        gap: 16,
        padding: "0 22px 10px",
        fontSize: 11, fontWeight: 600, color: "var(--text-dim)",
        textTransform: "uppercase", letterSpacing: "0.06em",
      }}>
        <div>Poll name</div>
        <div>Status</div>
        <div>Questions</div>
        <div>Last updated</div>
        <div style={{ textAlign: "right" }}>Actions</div>
      </div>

      <div className="col" style={{ gap: 10 }}>
        {filtered.map((p, i) => (
          <PollRow key={p.id} poll={p} delay={i * 40}
            onEdit={onEdit} onDetails={onDetails}
            onDuplicate={onDuplicate} onDelete={onDelete}
            onLaunch={onLaunch}
          />
        ))}
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: 60, color: "var(--text-dim)" }}>
            {polls.length === 0 ? "No polls yet — create your first one." : "No polls match. Try clearing the filter."}
          </div>
        )}
      </div>
    </div>
  );
}

function PollRow({ poll, onEdit, onDetails, onDuplicate, onDelete, onLaunch, delay = 0 }) {
  const isFinished = poll.status === "finished";
  return (
    <div className="card rise" style={{
      padding: "var(--density-row) 22px",
      display: "grid",
      gridTemplateColumns: "minmax(0, 1fr) 130px 140px 180px 240px",
      gap: 16, alignItems: "center",
      animationDelay: `${delay}ms`,
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 15.5, marginBottom: 2, letterSpacing: "-0.005em" }}>
          {poll.name}
        </div>
        <div className="muted" style={{ fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {poll.description}
        </div>
      </div>
      <div>
        <span className={classNames("tag", isFinished ? "tag--finished" : "tag--draft")}>
          <span style={{ width: 6, height: 6, borderRadius: 99, background: "currentColor", opacity: .9 }}/>
          {isFinished ? "Finished" : "Draft"}
        </span>
      </div>
      <div className="muted" style={{ fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: "var(--text)" }}>{poll.questions.length}</span>
        <span>{poll.questions.length === 1 ? "question" : "questions"}</span>
      </div>
      <div className="muted" style={{ fontSize: 14 }}>{relativeUpdated(poll.updated_at)}</div>
      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", alignItems: "center" }}>
        {isFinished ? (
          <button className="btn" onClick={() => onDetails(poll)}>{ICONS.details} Details</button>
        ) : (
          <>
            <button className="btn btn--primary" onClick={() => onLaunch(poll)} title="Launch lobby">
              {ICONS.play} Launch
            </button>
            <button className="btn" onClick={() => onEdit(poll)}>{ICONS.edit} Edit</button>
          </>
        )}
        <button className="btn btn--icon" title="Duplicate" onClick={() => onDuplicate(poll)}>{ICONS.duplicate}</button>
        <button className="btn btn--icon btn--danger" title="Delete" onClick={() => onDelete(poll)}>{ICONS.trash}</button>
      </div>
    </div>
  );
}
