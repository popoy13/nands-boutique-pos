import type { BarcodeSettings } from "../data/settings";

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const cleanBarcode = (raw: string, cfg: BarcodeSettings): string => {
  let c = String(raw ?? "").trim();
  if (cfg.stripPrefix) c = c.replace(new RegExp(`^${escapeRe(cfg.stripPrefix)}`), "");
  if (cfg.stripSuffix) c = c.replace(new RegExp(`${escapeRe(cfg.stripSuffix)}$`), "");
  if (cfg.enterEndsScan) c = c.replace(/[\r\n]+$/g, "");
  return c.trim();
};

let audioCtx: AudioContext | null = null;

const getAudioCtx = (): AudioContext | null => {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (audioCtx.state === "suspended") void audioCtx.resume();
    return audioCtx;
  } catch {
    return null;
  }
};

export const playScanFeedback = (ok: boolean, cfg: BarcodeSettings): void => {
  if (cfg.beep) {
    const ctx = getAudioCtx();
    if (ctx) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = ok ? "sine" : "square";
      osc.frequency.value = ok ? 1760 : 196;
      gain.gain.setValueAtTime(0.14, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    }
  }
  if (ok && cfg.vibrate && navigator.vibrate) navigator.vibrate(60);
};