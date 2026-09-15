const SHA256 = async (str: string): Promise<string> => {
  const buf = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
};

const SALT = "nands-pos-2026-v1";

export const hashPin = (pin: string): Promise<string> => SHA256(`${SALT}:${pin}`);

export const verifyPin = async (pin: string, storedHash: string): Promise<boolean> => {
  const h = await hashPin(pin);
  return h === storedHash;
};

const WEAK_PINS = new Set([
  "0000", "1111", "1212", "1234", "1122", "2222", "3333", "4444",
  "5555", "6666", "7777", "8888", "9999", "0001", "1010", "1230",
  "0102", "1201", "2002", "0201", "1100", "2200", "3300", "4400",
]);

export const isWeakPin = (pin: string): boolean => {
  if (WEAK_PINS.has(pin)) return true;
  if (/^(\d)\1{3}$/.test(pin)) return true;
  const seq = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  for (let i = 0; i <= seq.length - 4; i++) {
    const fwd = seq.slice(i, i + 4).join("");
    const rev = seq.slice(i, i + 4).reverse().join("");
    if (pin === fwd || pin === rev) return true;
  }
  return false;
};

const ATTEMPTS_KEY = "nands-attempts";

interface AttemptRecord {
  count: number;
  lockedUntil: number;
}

const getAttempts = (empId: string): AttemptRecord => {
  try {
    const raw = localStorage.getItem(ATTEMPTS_KEY);
    const all = raw ? JSON.parse(raw) : {};
    return all[empId] || { count: 0, lockedUntil: 0 };
  } catch {
    return { count: 0, lockedUntil: 0 };
  }
};

const saveAttempt = (empId: string, rec: AttemptRecord): void => {
  try {
    const raw = localStorage.getItem(ATTEMPTS_KEY);
    const all = raw ? JSON.parse(raw) : {};
    all[empId] = rec;
    localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
};

export const isLocked = (empId: string): { locked: boolean; secondsLeft: number } => {
  const rec = getAttempts(empId);
  if (rec.lockedUntil > Date.now()) {
    return { locked: true, secondsLeft: Math.ceil((rec.lockedUntil - Date.now()) / 1000) };
  }
  return { locked: false, secondsLeft: 0 };
};

export const recordFailedAttempt = (empId: string): { locked: boolean; secondsLeft: number } => {
  const rec = getAttempts(empId);
  const now = Date.now();
  if (rec.lockedUntil > now) {
    return { locked: true, secondsLeft: Math.ceil((rec.lockedUntil - now) / 1000) };
  }
  rec.count += 1;
  if (rec.count >= 10) {
    rec.lockedUntil = now + 15 * 60 * 1000;
    rec.count = 0;
  } else if (rec.count >= 5) {
    rec.lockedUntil = now + 5 * 60 * 1000;
    rec.count = 0;
  }
  saveAttempt(empId, rec);
  if (rec.lockedUntil > now) {
    return { locked: true, secondsLeft: Math.ceil((rec.lockedUntil - now) / 1000) };
  }
  return { locked: false, secondsLeft: 0 };
};

export const clearAttempts = (empId: string): void => {
  try {
    const raw = localStorage.getItem(ATTEMPTS_KEY);
    const all = raw ? JSON.parse(raw) : {};
    delete all[empId];
    localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
};
