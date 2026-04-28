import React, { useEffect, useState } from "react";
import { ICONS } from "./icons";
import { getFinishedPollResults, relativeUpdated } from "../lib/db";

export function AdminDetails({ poll, onBack, onDuplicate }) {
  const [data, setData] = useState({ participants: 0, results: {}, endedAt: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getFinishedPollResults(poll.id).then((d) => {
      if (alive) { setData(d); setLoading(false); }
    });
    return () => { alive = false; };
  }, [poll.id]);

  return (
    <div style={{ padding: "32px 40px 80px", maxWidth: 1100, margin: "0 auto", width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
        <button className="btn btn--ghost" onClick={onBack}>{ICONS.back}</button>
        <div style={{ flex: 1 }}>
          <div className="muted" style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Poll details · finished
          </div>
          <h1 style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em" }}>
            {poll.name}
          </h1>
        </div>
        <button className="btn" onClick={() => onDuplicate(poll)}>{ICONS.duplicate} Duplicate</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 28 }}>
        {[
          { label: "Status",      value: <span className="tag tag--finished">Finished</span> },
          { label: "Participants", value: data.participants || "—", mono: true },
          { label: "Questions",   value: poll.questions.length, mono: true },
          { label: "Run on",      value: relativeUpdated(data.endedAt || poll.updated_at) },
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: 18 }}>
            <div className="muted" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {s.label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 600, marginTop: 6, fontFamily: s.mono ? "JetBrains Mono, monospace" : undefined, letterSpacing: "-0.01em" }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <div className="col" style={{ gap: 18 }}>
        {poll.questions.map((q, qi) => {
          const counts = data.results[q.id] || {};
          const optionCounts = q.options.map((o) => counts[o.id] || 0);
          const total = optionCounts.reduce((a, b) => a + b, 0) || 1;
          return (
            <div key={q.id} className="card" style={{ padding: 26 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 18 }}>
                <span className="mono" style={{ color: "var(--text-dim)", fontSize: 13 }}>Q{qi + 1}</span>
                <h3 style={{ margin: 0, fontSize: 19, fontWeight: 600 }}>{q.text}</h3>
              </div>
              <div className="col" style={{ gap: 12 }}>
                {q.options.map((o, oi) => {
                  const v = optionCounts[oi];
                  const pct = Math.round((v / total) * 100);
                  return (
                    <div key={o.id}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 14, gap: 12, alignItems: "baseline" }}>
                        <span style={{ minWidth: 0, overflowWrap: "anywhere", wordBreak: "break-word" }}><span className="muted mono" style={{ marginRight: 8 }}>{String.fromCharCode(65 + oi)}</span>{o.label}</span>
                        <span className="mono" style={{ flexShrink: 0, whiteSpace: "nowrap" }}><span style={{ color: "var(--text-muted)" }}>{v} votes · </span><strong>{pct}%</strong></span>
                      </div>
                      <div className="bar-track">
                        <div className="bar-fill" style={{
                          width: pct + "%",
                          background: oi === 0
                            ? "linear-gradient(90deg, var(--primary), var(--cyan))"
                            : `linear-gradient(90deg, ${["#22D3EE","#F472B6","#34D399","#FBBF24","#A78BFA"][oi % 5]}, var(--primary))`,
                        }}/>
                      </div>
                    </div>
                  );
                })}
              </div>
              {q.research_headline && (
                <div style={{ marginTop: 18, padding: "14px 16px", background: "var(--bg-2)", borderRadius: 12, borderLeft: "3px solid var(--cyan)" }}>
                  <div className="muted" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.06, marginBottom: 4 }}>
                    Research insight
                  </div>
                  <div className="serif" style={{ fontSize: 18 }}>"{q.research_headline}"</div>
                  {q.research_source && <div className="dim" style={{ fontSize: 12, marginTop: 4 }}>— {q.research_source}</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {loading && (
        <div className="dim" style={{ marginTop: 24, textAlign: "center", fontSize: 13 }}>Loading results…</div>
      )}
    </div>
  );
}
