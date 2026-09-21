import { Capacitor, registerPlugin } from "@capacitor/core";

interface LocalNotificationsPlugin {
  requestPermissions?(): Promise<{ display: string }>;
  createChannel?(options: { id: string; name: string; description?: string; importance?: number }): Promise<void>;
  schedule(options: { notifications: Array<{ id: number; title: string; body: string; channelId?: string; extra?: Record<string, string> }> }): Promise<void>;
}

const LocalNotifications = registerPlugin<LocalNotificationsPlugin>("LocalNotifications");
let nextId = 1000;

export async function requestNotificationPermission(): Promise<void> {
  if (typeof Notification !== "undefined" && Notification.permission === "default") {
    await Notification.requestPermission();
  }
  if (Capacitor.isNativePlatform()) {
    try {
      await LocalNotifications.requestPermissions?.();
      await LocalNotifications.createChannel?.({
        id: "nands-updates",
        name: "NANDS Boutique",
        description: "Pesan chat dan transaksi baru",
        importance: 4,
      });
    } catch (error) {
      console.warn("[notifications] izin/channel Android gagal:", error);
    }
  }
}

export async function notifyUser(title: string, body: string, url?: string): Promise<void> {
  if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    const notification = new Notification(title, { body, tag: `nands-${title}` });
    if (url) notification.onclick = () => { window.focus(); window.location.href = url; };
  }
  if (Capacitor.isNativePlatform()) {
    try {
      await LocalNotifications.schedule({
        notifications: [{ id: nextId++, title, body, channelId: "nands-updates", extra: url ? { url } : undefined }],
      });
    } catch (error) {
      console.warn("[notifications] notifikasi Android gagal:", error);
    }
  }
}
