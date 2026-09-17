export const APP_VERSION = "1.0.1";
export const UPDATE_MANIFEST_URL =
  "https://popoy13.github.io/nands-boutique-pos/update.json";

export interface AppUpdate {
  version: string;
  apkUrl: string;
  notes?: string;
}

const compareVersions = (a: string, b: string) => {
  const left = a.split(".").map(Number);
  const right = b.split(".").map(Number);
  for (let i = 0; i < Math.max(left.length, right.length); i += 1) {
    const diff = (left[i] || 0) - (right[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
};

export async function checkForAppUpdate(): Promise<AppUpdate | null> {
  try {
    const response = await fetch(`${UPDATE_MANIFEST_URL}?v=${Date.now()}`, {
      cache: "no-store",
    });
    if (!response.ok) return null;
    const update = (await response.json()) as Partial<AppUpdate>;
    if (!update.version || !update.apkUrl || compareVersions(update.version, APP_VERSION) <= 0) {
      return null;
    }
    return { version: update.version, apkUrl: update.apkUrl, notes: update.notes };
  } catch {
    return null;
  }
}
