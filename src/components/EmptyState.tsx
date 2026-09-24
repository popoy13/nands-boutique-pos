interface Props {
  icon?: string;
  title: string;
  hint?: string;
  compact?: boolean;
}

export default function EmptyState({ icon = "📦", title, hint, compact }: Props) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? "py-6 px-4" : "py-14 px-4"}`}>
      <div className={`rounded-2xl flex items-center justify-center mb-2.5 ${compact ? "w-10 h-10 text-lg" : "w-14 h-14 text-2xl mb-3"}`} style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.12)" }}>
        {icon}
      </div>
      <div className="text-sm font-semibold mb-1">{title}</div>
      {hint && <div className={`text-xs ${compact ? "max-w-[260px]" : "max-w-[280px]"} leading-relaxed`} style={{ color: "var(--muted-foreground)" }}>{hint}</div>}
    </div>
  );
}