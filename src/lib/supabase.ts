import { createClient } from "@supabase/supabase-js";

// Kredensial dapat dioverride lewat env saat build (VITE_SUPABASE_URL /
// VITE_SUPABASE_ANON_KEY). Fallback menjaga aplikasi tetap berjalan pada
// deployment yang belum memakai env. Gunakan publishable/anon key saja.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://tbvutqehssdwyqescteb.supabase.co";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_ccu_oJWKXd-IR-au3oySVw_9tABiXn_";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
