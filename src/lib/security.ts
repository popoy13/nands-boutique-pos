import { supabase } from "./supabase";

/* ------------------------------------------------------------------ */
/* Audit log — catatan aktivitas penting (login, transaksi, PIN, dll.) */
/* ------------------------------------------------------------------ */

interface AuditActor {
  id: string;
  name?: string;
  role?: string;
}

let auditQueue: Record<string, unknown>[] = [];
let auditFlushing = false;
let auditBusy = false;

async function flushAudit(): Promise<void> {
  if (auditBusy || auditQueue.length === 0) return;
  auditBusy = true;
  const batch = auditQueue.splice(0);
  try {
    const { error } = await supabase.from("audit_log").insert(batch);
    if (error) throw error;
  } catch {
    auditQueue = batch.slice(0, 200).concat(auditQueue);
    return;
  } finally {
    auditBusy = false;
  }
  if (auditQueue.length > 0) setTimeout(() => void flushAudit(), 2000);
}

setInterval(() => { void flushAudit(); }, 10000);

export function recordAudit(
  actor: AuditActor | null | undefined,
  action: string,
  detail?: string,
): void {
  if (!actor || !actor.id) return;
  auditQueue.push({
    employee_id: String(actor.id).slice(0, 80),
    name: String(actor.name ?? "").slice(0, 120),
    role: String(actor.role ?? "").slice(0, 40),
    action: String(action).slice(0, 80),
    detail: (detail ? String(detail) : "").slice(0, 600),
    created_at: new Date().toISOString(),
  });
  if (auditQueue.length >= 25) void flushAudit();
  else setTimeout(() => void flushAudit(), 1200);
}

/* ------------------------------------------------------------------ */
/* Pencabutan sesi lintas perangkat (session version per karyawan)      */
/* ------------------------------------------------------------------ */

const SESSIONS_KEY = "securitySessions";

export async function loadSessionVersions(): Promise<Record<string, number>> {
  try {
    const { data, error } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", SESSIONS_KEY)
      .maybeSingle();
    if (error) return {};
    const v = data?.value;
    return v && typeof v === "object" ? (v as Record<string, number>) : {};
  } catch {
    return {};
  }
}

export async function bumpSessionVersion(
  empId: string,
  current: Record<string, number>,
): Promise<Record<string, number>> {
  const next = { ...current, [empId]: Date.now() };
  const { error } = await supabase
    .from("app_settings")
    .upsert({ key: SESSIONS_KEY, value: next }, { onConflict: "key" });
  if (error) throw error;
  return next;
}

const localVersionKey = (empId: string) => `nands-session-v-${empId}`;

export const getLocalSessionVersion = (empId: string): number => {
  try { return Number(localStorage.getItem(localVersionKey(empId))) || 0; } catch { return 0; }
};

export const setLocalSessionVersion = (empId: string, version: number): void => {
  try {
    if (version > 0) localStorage.setItem(localVersionKey(empId), String(version));
    else localStorage.removeItem(localVersionKey(empId));
  } catch { /* ignore */ }
};

export const clearLocalSessionVersion = (empId: string): void => {
  try { localStorage.removeItem(localVersionKey(empId)); } catch { /* ignore */ }
};