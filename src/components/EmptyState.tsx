interface Props {
  icon?: string;
  title: string;
  hint?: string;
}

export default function EmptyState({ icon = "📦", title, hint }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-3" style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.12)" }}>
        {icon}
      </div>
      <div className="text-sm font-semibold mb-1">{title}</div>
      {hint && <div className="text-xs max-w-[280px] leading-relaxed" style={{ color: "var(--muted-foreground)" }}>{hint}</div>}
    </div>
  );
}