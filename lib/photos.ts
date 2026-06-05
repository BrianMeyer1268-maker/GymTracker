// Machine photos are stored on-device, one localStorage key each, so the main
// data blob stays small and fast to serialize. Photos are downscaled before
// saving to stay well within the localStorage quota.

const PFX = "ironcompass:photo:";

export function photoKey(id: string): string {
  return PFX + id;
}

export function uidPhoto(): string {
  return "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function getPhoto(id: string | undefined | null): string | null {
  if (!id || typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(PFX + id);
  } catch {
    return null;
  }
}

export function setPhoto(id: string, dataUrl: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PFX + id, dataUrl);
  } catch {
    /* quota — ignore */
  }
}

export function deletePhoto(id: string | undefined | null): void {
  if (!id || typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PFX + id);
  } catch {
    /* ignore */
  }
}

export function allPhotos(): Record<string, string> {
  const out: Record<string, string> = {};
  if (typeof window === "undefined") return out;
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key && key.startsWith(PFX)) {
      const val = window.localStorage.getItem(key);
      if (val) out[key.slice(PFX.length)] = val;
    }
  }
  return out;
}

export function restorePhotos(map: Record<string, string> | undefined): void {
  if (!map || typeof window === "undefined") return;
  for (const [id, val] of Object.entries(map)) setPhoto(id, val);
}

/** Read a File (camera/upload), downscale, return a compact JPEG data URL. */
export function downscaleImage(file: File, maxEdge = 720, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read failed"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("decode failed"));
      img.onload = () => {
        const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("no canvas"));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
