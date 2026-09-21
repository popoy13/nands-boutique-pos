export function registerPwa() {
  if (!("serviceWorker" in navigator) || !import.meta.env.PROD) return;
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("./sw.js", { scope: "./" }).catch(error => {
      console.warn("[pwa] service worker registration failed:", error);
    });
  }, { once: true });
}
