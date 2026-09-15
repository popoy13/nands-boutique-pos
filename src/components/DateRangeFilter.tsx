import { todayISO } from "../lib/dates";
export { todayISO };

interface Props {
  dateFrom: string;
  dateTo: string;
  onChangeFrom: (v: string) => void;
  onChangeTo: (v: string) => void;
}

export default function DateRangeFilter({ dateFrom, dateTo, onChangeFrom, onChangeTo }: Props) {
  const active = !!dateFrom || !!dateTo;
  const inputStyle = {
    background: "var(--card)",
    border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
  };
  return (
    <div className="flex items-end gap-2 flex-wrap">
      <div className="flex items-end gap-1.5">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold leading-none" style={{ color: "var(--muted-foreground)" }}>DARI</span>
          <input type="date" value={dateFrom} onChange={e => onChangeFrom(e.target.value)}
            className="text-xs rounded-xl px-2.5 py-2 outline-none" style={inputStyle} />
        </label>
        <span className="text-xs pb-2 px-0.5" style={{ color: "var(--muted-foreground)" }}>s/d</span>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold leading-none" style={{ color: "var(--muted-foreground)" }}>SAMPAI</span>
          <input type="date" value={dateTo} onChange={e => onChangeTo(e.target.value)}
            className="text-xs rounded-xl px-2.5 py-2 outline-none" style={inputStyle} />
        </label>
      </div>
      <div className="flex items-center gap-1.5">
        <button onClick={() => { onChangeFrom(todayISO()); onChangeTo(todayISO()); }}
          className="px-3 py-2 rounded-xl text-xs font-semibold transition-all"
          style={{ background: "var(--accent)", color: "white" }}>
          Hari Ini
        </button>
        {active && (
          <button onClick={() => { onChangeFrom(""); onChangeTo(""); }}
            className="px-2.5 py-2 rounded-xl text-xs font-semibold"
            style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
            Reset
          </button>
        )}
      </div>
    </div>
  );
}