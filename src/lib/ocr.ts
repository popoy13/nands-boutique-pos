export interface OcrSuggestion {
  codes: string[];
  amount?: number;
}

const TESSERACT_CDN = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";

let tessPromise: Promise<Record<string, unknown>> | null = null;

function loadTesseract(): Promise<Record<string, unknown>> {
  const win = window as unknown as Record<string, unknown>;
  const existing = win.Tesseract as Record<string, unknown> | undefined;
  if (existing) return Promise.resolve(existing);
  if (!tessPromise) {
    tessPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = TESSERACT_CDN;
      s.async = true;
      s.onload = () => {
        const T = win.Tesseract as Record<string, unknown> | undefined;
        if (T) resolve(T);
        else reject(new Error("Mesin OCR tidak tersedia"));
      };
      s.onerror = () => {
        tessPromise = null;
        reject(new Error("Gagal memuat mesin OCR (periksa jaringan)"));
      };
      document.head.appendChild(s);
    });
  }
  return tessPromise;
}

const CODE_KEYWORDS =
  /referen|trx|transaksi|transaction|trans|kode|nomor|reff|resi|receipt|payment.?id|auth|resev|id\b|no\./i;
const AMOUNT_KEYWORDS =
  /total|jumlah|bayar|setor|setoran|nominal|biaya|diterima|pembayaran|transfer|debit|rupiah/i;
const DATE_RE = /^\d{6,8}([\/\-.\s]\d{1,4}){1,2}$/;
const PHONE_RE = /^(62|0)8\d{6,}$/;

function parseAmountStr(raw: string): number | undefined {
  const clean = raw.replace(/rp\.?/i, "").replace(/[^\d.,]/g, "");
  if (!clean) return undefined;
  const hasDot = clean.includes(".");
  const hasComma = clean.includes(",");
  let norm = clean;
  if (hasDot && hasComma) norm = clean.replace(/\./g, "").replace(",", ".");
  else if (hasDot && !hasComma) norm = clean.replace(/\./g, "");
  else if (hasComma && !hasDot) norm = clean.replace(/,/g, "");
  const n = Number(norm);
  return Number.isFinite(n) && n >= 1000 ? n : undefined;
}

export function parseStrukSuggestions(text: string): OcrSuggestion {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const codes: string[] = [];
  const addCode = (c: string) => {
    const clean = String(c).replace(/[^\d]/g, "");
    if (!clean || clean.length < 5 || clean.length > 22) return;
    if (codes.includes(clean)) return;
    if (DATE_RE.test(clean)) return;
    if (PHONE_RE.test(clean)) return;
    if (/^(19|20)\d{2}$/.test(clean)) return;
    codes.push(clean);
  };

  for (const line of lines) {
    if (!CODE_KEYWORDS.test(line)) continue;
    const m = line.match(/(?:referen|ref|trx|transaksi|transaction|trans|kode|nomor|reff|resi|receipt|payment.?id|resev|id|no\.?)\D{0,12}(\d[\d\s.,-]{3,})/i);
    if (m) {
      addCode(m[1].split(/[\s,;|/]+/)[0]);
      const raw = m[1].replace(/[^\d]/g, "");
      if (raw.length >= 5 && raw.length <= 22) addCode(raw);
    }
  }

  if (codes.length < 3) {
    for (const line of lines) {
      if (CODE_KEYWORDS.test(line)) continue;
      const runs = line.match(/(\d[\d\s]{4,})/g) ?? [];
      for (const run of runs) {
        const candidate = run.replace(/[\s.,-]/g, "");
        if (/^\d+$/.test(candidate) && candidate.length >= 8 && candidate.length <= 20) addCode(candidate);
      }
    }
  }

  let amount: number | undefined;
  if (!amount) {
    for (const line of lines) {
      const amtRe = line.match(/(?:rp\.?\s*)([\d][\d.,]{3,})/i);
      if (amtRe) {
        const v = parseAmountStr(amtRe[1]);
        if (v) { amount = v; break; }
      }
    }
  }
  if (!amount) {
    for (const line of lines) {
      const amtRe = line.match(new RegExp(`${AMOUNT_KEYWORDS.source}\\D{0,12}(?:rp\\.?\\s*)?([\\d][\\d.,]{3,})`, "i"));
      if (amtRe) {
        const v = parseAmountStr(amtRe[1]);
        if (v) { amount = v; break; }
      }
    }
  }

  return { codes: codes.slice(0, 4), amount };
}

export interface StrukReadResult {
  text: string;
  suggestions: OcrSuggestion;
}

export async function readStruk(dataUrl: string): Promise<StrukReadResult> {
  const T = await loadTesseract();
  const createWorker = T.createWorker as (langs?: string, oem?: number, opts?: object) => Promise<{
    recognize: (img: string) => Promise<{ data: { text: string } }>;
    terminate: () => Promise<unknown>;
  }>;
  const worker = await createWorker("eng", 1, { logger: () => {} });
  try {
    const { data } = await worker.recognize(dataUrl);
    const text = String(data.text ?? "");
    return { text, suggestions: parseStrukSuggestions(text) };
  } finally {
    await worker.terminate();
  }
}