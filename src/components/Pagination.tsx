import { useMemo } from "react";

interface Props {
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
  rowLabel?: string;
}

const DEFAULT_OPTIONS = [10, 25, 50, 100];
const MAX_PAGE_BUTTONS = 5;

const pageList = (current: number, count: number): number[] => {
  if (count <= MAX_PAGE_BUTTONS) return Array.from({ length: count }, (_, i) => i + 1);
  const half = Math.floor(MAX_PAGE_BUTTONS / 2);
  let start = Math.max(1, current - half);
  let end = start + MAX_PAGE_BUTTONS - 1;
  if (end > count) { end = count; start = Math.max(1, end - MAX_PAGE_BUTTONS + 1); }
  const pages: number[] = [];
  if (start > 1) pages.push(1);
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < count) pages.push(count);
  return pages;
};

const SEP = "…";

export default function Pagination({ total, page, pageSize, onPageChange, onPageSizeChange, pageSizeOptions = DEFAULT_OPTIONS, rowLabel = "data" }: Props) {
  const count = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, count);
  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, total);
  const pages = useMemo(() => pageList(safePage, count), [safePage, count]);

  const btn = (active: boolean): React.CSSProperties => ({
    minWidth: 32,
    height: 32,
    padding: "0 8px",
    borderRadius: 10,
    fontSize: 12,
    fontWeight: 600,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: active ? "var(--accent)" : "var(--card)",
    color: active ? "white" : "var(--foreground)",
    border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
    cursor: "pointer",
  });

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3" style={{ borderTop: "1px solid var(--border)", background: "var(--background)" }}>
      <div className="flex items-center gap-2 text-xs" style={{ color: "var(--muted-foreground)" }}>
        <span className="whitespace-nowrap">Menampilkan {from}–{to} dari {total} {rowLabel}</span>
        <select
          value={pageSize}
          onChange={e => { onPageSizeChange(Number(e.target.value)); onPageChange(1); }}
          className="text-xs rounded-lg px-2 py-1.5 outline-none"
          style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" }}
          aria-label="Baris per halaman"
        >
          {pageSizeOptions.map(o => <option key={o} value={o}>{o} / halaman</option>)}
        </select>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage <= 1}
          style={{ ...btn(false), opacity: safePage <= 1 ? 0.35 : 1 }}
          aria-label="Halaman sebelumnya"
        >
          ‹
        </button>
        {pages.map((p, i) => (
          <span key={p} style={{ display: "inline-flex", alignItems: "center" }}>
            {i > 0 && pages[i - 1] !== p - 1 && <span style={{ fontSize: 12, color: "var(--muted-foreground)", padding: "0 2px" }}>{SEP}</span>}
            <button
              onClick={() => onPageChange(p)}
              style={btn(p === safePage)}
              aria-current={p === safePage ? "page" : undefined}
            >
              {p}
            </button>
          </span>
        ))}
        <button
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage >= count}
          style={{ ...btn(false), opacity: safePage >= count ? 0.35 : 1 }}
          aria-label="Halaman berikutnya"
        >
          ›
        </button>
      </div>
    </div>
  );
}