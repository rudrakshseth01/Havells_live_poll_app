import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anon) {
  console.error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example → .env.local and fill in your Supabase project credentials."
  );
}

export const supabase = createClient(url || "http://localhost", anon || "anon", {
  auth: { persistSession: true, autoRefreshToken: true },
  realtime: { params: { eventsPerSecond: 10 } },
});

export function getClientId() {
  let id = localStorage.getItem("hvlClientId");
  if (!id) {
    id = "c_" + Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
    localStorage.setItem("hvlClientId", id);
  }
  return id;
}
