import { createClient } from "@supabase/supabase-js";
const supabase = createClient("https://tbvutqehssdwyqescteb.supabase.co", "sb_publishable_ccu_oJWKXd-IR-au3oySVw_9tABiXn_");
(async () => {
  const q = await supabase.from("attendance_records").select("id");
  const ids = (q.data ?? []).map(r => String(r.id));
  if (ids.length) {
    const del = await supabase.from("attendance_records").delete().in("id", ids);
    console.log("cleanup:", del.error ? "ERROR " + JSON.stringify(del.error) : "deleted " + ids.length);
  } else {
    console.log("cleanup: kosong");
  }
  const r = await supabase.from("attendance_records").select("id");
  console.log("remaining:", (r.data ?? []).length);
})().catch(e => { console.error("FATAL:", e); process.exit(1); });