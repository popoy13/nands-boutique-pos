import { useEffect, useState } from "react";
import { assetUrl } from "../lib/assets";

const ROLE_COLOR: Record<string, string> = { admin: "#7c3aed", manager: "#2563eb", manager_operasional: "#0d9488", kasir: "#7c3aed", staff: "#16a34a" };

interface Props {
  src?: string;
  name: string;
  role?: string;
  className?: string;
}

export default function Avatar({ src, name, role, className = "" }: Props) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [src]);
  if (!src || failed) {
    return (
      <div className={`rounded-full flex items-center justify-center text-white font-bold shrink-0 ${className}`}
        style={{ background: ROLE_COLOR[role ?? ""] ?? "var(--foreground)" }}>
        {(name || "?").charAt(0)}
      </div>
    );
  }
  return (
    <img src={assetUrl(src)} alt={name} draggable={false} onError={() => setFailed(true)}
      className={`rounded-full object-cover shrink-0 ${className}`} />
  );
}