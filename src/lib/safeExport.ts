const RISKY_PREFIX = /^[=+\-@\t\r\n]/;

export function safeCell(value: unknown): unknown {
  if (typeof value === "string" && RISKY_PREFIX.test(value)) return `'${value}`;
  return value;
}

export function safeRows<T extends Record<string, unknown>>(rows: T[]): T[] {
  return rows.map((row) => {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(row)) out[key] = safeCell(row[key]);
    return out as T;
  });
}

export function sanitizeCsv(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return RISKY_PREFIX.test(text) ? `'${text}` : text;
}
