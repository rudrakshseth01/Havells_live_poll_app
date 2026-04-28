// Admin sign-in / sign-up via Supabase Auth. Players don't sign up — they scan
// the host's QR code and join with a name + emoji.
import React, { useState } from "react";
import { supabase } from "../lib/supabase";

export function AuthScreen({ onAuth, onPlayerJoin }) {
  const [mode, setMode] = useState("signin"); // signin | signup
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [designation, setDesignation] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function reset() { setError(""); }

  async function handleSignUp(e) {
    e.preventDefault();
    reset();
    if (!email.trim() || !name.trim() || !designation.trim() || !password) {
      setError("All fields are required.");
      return;
    }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { name: name.trim(), designation: designation.trim() } },
    });
    setBusy(false);
    if (error) { setError(error.message); return; }
    if (!data.session) {
      setError("Account created. Check your email to confirm, then sign in.");
      setMode("signin");
      return;
    }
    onAuth(data.user);
  }

  async function handleSignIn(e) {
    e.preventDefault();
    reset();
    if (!email.trim() || !password) { setError("Enter your email and password."); return; }
    setBusy(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setBusy(false);
    if (error) { setError(error.message); return; }
    onAuth(data.user);
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "grid",
      placeItems: "center",
      padding: 32,
      background: "radial-gradient(1200px 600px at 20% -10%, rgba(124,92,255,.18), transparent 60%), radial-gradient(900px 500px at 100% 100%, rgba(34,211,238,.12), transparent 60%), var(--bg)",
    }}>
      <div style={{
        width: "100%", maxWidth: 460,
        background: "var(--surface)",
        border: "1px solid var(--line-soft)",
        borderRadius: 24,
        padding: 36,
        boxShadow: "0 30px 60px rgba(0,0,0,.4), 0 0 0 1px rgba(255,255,255,.02) inset",
      }}>
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: "linear-gradient(135deg, var(--primary), var(--primary-2))",
            display: "grid", placeItems: "center", color: "white", fontWeight: 800, fontSize: 20,
            boxShadow: "0 8px 20px rgba(124,92,255,.35)",
          }}>H</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em" }}>havells live</div>
            <div className="muted" style={{ fontSize: 12 }}>admin sign in</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: "flex", gap: 4, padding: 4,
          background: "var(--bg)",
          borderRadius: 12,
          marginBottom: 24,
        }}>
          {[["signin", "Sign in"], ["signup", "Sign up"]].map(([id, label]) => (
            <button key={id}
              type="button"
              onClick={() => { setMode(id); reset(); }}
              style={{
                flex: 1,
                padding: "10px 16px",
                background: mode === id ? "var(--surface)" : "transparent",
                border: mode === id ? "1px solid var(--line-soft)" : "1px solid transparent",
                color: mode === id ? "var(--text)" : "var(--text-muted)",
                fontSize: 14, fontWeight: 600,
                borderRadius: 8, cursor: "pointer",
                transition: "all .15s",
              }}>{label}</button>
          ))}
        </div>

        <h1 style={{ fontSize: 24, margin: "0 0 6px", letterSpacing: "-0.015em", fontWeight: 600 }}>
          {mode === "signin" ? "Welcome back" : "Create admin account"}
        </h1>
        <p className="muted" style={{ fontSize: 14, margin: "0 0 22px" }}>
          {mode === "signin"
            ? "Sign in to host polls. Players just scan the QR — no account needed."
            : "Admins host polls. Players join by scanning a QR — no sign-up required."}
        </p>

        <form onSubmit={mode === "signin" ? handleSignIn : handleSignUp} className="col" style={{ gap: 14 }}>
          <Field label="Email">
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@havells.com"
              type="email" autoComplete="email" autoFocus
              style={inputStyle}/>
          </Field>

          {mode === "signup" && (
            <>
              <Field label="Name">
                <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Priya Sharma"
                  style={inputStyle}/>
              </Field>
              <Field label="Designation">
                <input value={designation} onChange={e => setDesignation(e.target.value)} placeholder="e.g. Sales Lead, North"
                  style={inputStyle}/>
              </Field>
            </>
          )}

          <Field label="Password">
            <div style={{ position: "relative" }}>
              <input type={showPwd ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                style={{ ...inputStyle, paddingRight: 64 }}/>
              <button type="button" onClick={() => setShowPwd(s => !s)}
                style={{
                  position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                  background: "transparent", border: "none", color: "var(--text-muted)",
                  fontSize: 12, cursor: "pointer", padding: "4px 8px",
                }}>{showPwd ? "Hide" : "Show"}</button>
            </div>
          </Field>

          {error && (
            <div style={{
              padding: "10px 14px",
              background: "rgba(248,113,113,.10)",
              border: "1px solid rgba(248,113,113,.3)",
              borderRadius: 10,
              fontSize: 13, color: "var(--red)",
            }}>{error}</div>
          )}

          <button type="submit" className="btn btn--primary btn--lg" disabled={busy}
            style={{ marginTop: 6, width: "100%", justifyContent: "center", opacity: busy ? 0.6 : 1 }}>
            {busy ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        {/* Player path — no auth */}
        <div style={{
          marginTop: 22, padding: "16px 18px",
          background: "var(--bg)",
          border: "1px dashed var(--line-soft)",
          borderRadius: 12,
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
            Joining as a player?
          </div>
          <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.5, marginBottom: 10 }}>
            Scan the QR code shown by your host — no sign-up needed.
          </div>
          <button type="button" onClick={onPlayerJoin}
            style={{
              background: "transparent",
              border: "1px solid var(--line-soft)",
              color: "var(--text)",
              padding: "8px 14px", borderRadius: 8,
              fontSize: 12.5, fontWeight: 500, cursor: "pointer",
            }}>
            Open player view →
          </button>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  background: "var(--bg)",
  border: "1px solid var(--line-soft)",
  borderRadius: 10,
  color: "var(--text)",
  fontSize: 14,
  fontFamily: "inherit",
  outline: "none",
  transition: "border-color .15s",
};

function Field({ label, children }) {
  return (
    <label style={{ display: "block" }}>
      <div className="muted" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
        {label}
      </div>
      {children}
    </label>
  );
}
