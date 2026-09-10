import { useState, useRef } from "react";
import type { Store } from "../data/types";
import type { AppSettings } from "../data/settings";
import { defaultSettings } from "../data/settings";

interface Props {
  settings: AppSettings;
  stores: Store[];
  onSaveSettings: (s: AppSettings) => void;
  onSaveStores: (stores: Store[]) => void;
  canEdit: boolean;
}

type Tab = "printer" | "attendance" | "brand";

const field = {
  background: "var(--background)",
  border: "1.5px solid var(--border)",
} as const;

export default function SettingsView({ settings, stores, onSaveSettings, onSaveStores, canEdit }: Props) {
  const [tab, setTab] = useState<Tab>("printer");
  const [toast, setToast] = useState("");
  const logoRef = useRef<HTMLInputElement>(null);

  const [draftPrinter, setDraftPrinter] = useState({ ...settings.printer });
  const [draftBrand, setDraftBrand] = useState({ ...settings.brand });
  const [draftStores, setDraftStores] = useState<Store[]>(stores.map(s => ({ ...s, openHour: s.openHour ?? "08:00", closeHour: s.closeHour ?? "21:00" })));

  const showToast = (msg: string, ok = true) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  if (!canEdit) return null;

  const savePrinter = () => { onSaveSettings({ ...settings, printer: { ...draftPrinter, paperWidth: Number(draftPrinter.paperWidth) } }); showToast("Setelan printer disimpan"); };
  const saveBrand = () => { onSaveSettings({ ...settings, brand: draftBrand }); showToast("Menu utama diperbarui"); };
  const saveAttendance = () => { onSaveStores(draftStores); showToast("Jam operasional toko tersimpan"); };

  const setStoreDraft = (id: string, key: keyof Store, val: string) => {
    setDraftStores(prev => prev.map(s => s.id === id ? ({ ...s, [key]: val } as Store) : s));
  };

  return (
    <div className="h-full overflow-y-auto px-5 py-5">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-sm font-medium text-white shadow-lg" style={{ background: "#16a34a" }}>
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 18 }}>Setelan</div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap mb-5">
        {([
          { id: "printer", label: "Printer", icon: <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg> },
          { id: "attendance", label: "Absensi", icon: <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg> },
          { id: "brand", label: "Menu Utama", icon: <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
        ] as { id: Tab; label: string; icon: React.ReactNode }[]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all"
            style={{ background: tab === t.id ? "var(--foreground)" : "var(--card)", color: tab === t.id ? "white" : "var(--muted-foreground)", border: `1.5px solid ${tab === t.id ? "var(--foreground)" : "var(--border)"}` }}>
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* PRINTER */}
      {tab === "printer" && (
        <div className="max-w-2xl p-5 rounded-2xl" style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 600, fontSize: 13 }} className="mb-1">Setelan Printer</div>
          <div className="text-xs mb-5" style={{ color: "var(--muted-foreground)" }}>Pengaturan pencetakan struk untuk kasir.</div>

          <div className="mb-4">
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted-foreground)" }}>NAMA PRINTER</label>
            <input type="text" value={draftPrinter.printerName} onChange={e => setDraftPrinter(p => ({ ...p, printerName: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={field} />
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted-foreground)" }}>LEBAR KERTAS (MM)</label>
              <select value={draftPrinter.paperWidth} onChange={e => setDraftPrinter(p => ({ ...p, paperWidth: Number(e.target.value) }))}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={field}>
                {[58, 72, 80].map(w => <option key={w} value={w}>{w} mm</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted-foreground)" }}>JUMLAH SALINAN</label>
              <select value={draftPrinter.copies} onChange={e => setDraftPrinter(p => ({ ...p, copies: Number(e.target.value) }))}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={field}>
                {[1, 2, 3].map(c => <option key={c} value={c}>{c}x</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl mb-4" style={{ background: "var(--background)" }}>
            <div>
              <div className="text-sm font-semibold">Cetak otomatis</div>
              <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>Struk langsung dicetak setelah pembayaran berhasil</div>
            </div>
            <button onClick={() => setDraftPrinter(p => ({ ...p, autoPrint: !p.autoPrint }))}
              className="w-11 h-6 rounded-full relative transition-all shrink-0"
              style={{ background: draftPrinter.autoPrint ? "var(--accent)" : "var(--muted)" }}>
              <span className="absolute top-0.5 w-5 h-5 rounded-full transition-all" style={{ left: draftPrinter.autoPrint ? 22 : 2, background: "white" }} />
            </button>
          </div>

          <button onClick={savePrinter} className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all" style={{ background: "var(--foreground)" }}>
            Simpan Setelan Printer
          </button>
        </div>
      )}

      {/* ATTENDANCE */}
      {tab === "attendance" && (
        <div className="max-w-2xl p-5 rounded-2xl" style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 600, fontSize: 13 }} className="mb-1">Jam Operasional Toko</div>
          <div className="text-xs mb-5" style={{ color: "var(--muted-foreground)" }}>Atur jam buka/tutup tiap toko. Dipakai untuk menilai absensi karyawan di penempatannya.</div>

          <div className="flex flex-col gap-3 mb-5">
            {draftStores.map(s => (
              <div key={s.id} className="p-4 rounded-xl" style={{ background: "var(--background)" }}>
                <div className="text-sm font-semibold mb-3">{s.name.replace("NAND'S BOUTIQUE - ", "")}</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted-foreground)" }}>JAM BUKA</label>
                    <input type="time" value={s.openHour} onChange={e => setStoreDraft(s.id, "openHour", e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl text-sm outline-none font-mono" style={field} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted-foreground)" }}>JAM TUTUP</label>
                    <input type="time" value={s.closeHour} onChange={e => setStoreDraft(s.id, "closeHour", e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl text-sm outline-none font-mono" style={field} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button onClick={saveAttendance} className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all" style={{ background: "var(--foreground)" }}>
            Simpan Jam Operasional
          </button>
        </div>
      )}

      {/* BRAND / MAIN MENU */}
      {tab === "brand" && (
        <div className="max-w-2xl p-5 rounded-2xl" style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 600, fontSize: 13 }} className="mb-1">Menu Utama</div>
          <div className="text-xs mb-5" style={{ color: "var(--muted-foreground)" }}>Ubah logo, nama, dan deskripsi aplikasi.</div>

          <div className="mb-4">
            <label className="block text-xs font-semibold mb-2" style={{ color: "var(--muted-foreground)" }}>LOGO</label>
            <div className="flex items-center gap-4">
              <img src={draftBrand.logo} alt="Logo" className="w-16 h-16 rounded-2xl object-cover shrink-0" style={{ background: "var(--secondary)" }} />
              <div className="flex flex-col gap-2">
                <input ref={logoRef} type="file" accept="image/*" className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => { setDraftBrand(b => ({ ...b, logo: ev.target?.result as string })); };
                    reader.readAsDataURL(file);
                    e.target.value = "";
                  }} />
                <button onClick={() => logoRef.current?.click()} className="px-3 py-2 rounded-xl text-xs font-semibold text-white" style={{ background: "var(--foreground)" }}>
                  Unggah Logo
                </button>
                <button onClick={() => setDraftBrand(b => ({ ...b, logo: defaultSettings.brand.logo }))}
                  className="px-3 py-2 rounded-xl text-xs font-semibold" style={{ background: "var(--secondary)" }}>
                  Reset Logo
                </button>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted-foreground)" }}>NAMA APLIKASI</label>
            <input type="text" value={draftBrand.name} onChange={e => setDraftBrand(b => ({ ...b, name: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={field} />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted-foreground)" }}>DESKRIPSI / TAGLINE</label>
            <input type="text" value={draftBrand.tagline} onChange={e => setDraftBrand(b => ({ ...b, tagline: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={field} />
          </div>

          <button onClick={saveBrand} className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all" style={{ background: "var(--foreground)" }}>
            Simpan Menu Utama
          </button>
        </div>
      )}
    </div>
  );
}