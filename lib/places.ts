import type { GymType } from "./types";

/** A nearby-gym candidate (from a places provider or manual entry). */
export interface PlaceCandidate {
  id: string;
  name: string;
  address?: string;
  website?: string;
  lat?: number;
  lng?: number;
  distanceMeters?: number;
  type?: GymType;
  notes?: string;
}

/**
 * Pluggable nearby-gym lookup. Swap in a Google Places / Foursquare / OpenStreetMap
 * provider later by implementing this interface — the UI only talks to `placesProvider`.
 */
export interface PlacesProvider {
  readonly name: string;
  searchNearbyGyms(lat: number, lng: number): Promise<PlaceCandidate[]>;
  searchGymByName(query: string, near?: { lat: number; lng: number }): Promise<PlaceCandidate[]>;
}

/**
 * Manual provider — no external places API yet. "Nearby" returns nothing (the UI
 * falls back to manual entry); name search echoes the typed query as a candidate
 * the user can confirm and hand to the AI importer.
 */
export class ManualPlacesProvider implements PlacesProvider {
  readonly name = "manual";
  async searchNearbyGyms(): Promise<PlaceCandidate[]> {
    return [];
  }
  async searchGymByName(query: string): Promise<PlaceCandidate[]> {
    const q = query.trim();
    if (!q) return [];
    return [{ id: `manual-${q.toLowerCase().replace(/\s+/g, "-").slice(0, 40)}`, name: q }];
  }
}

/** Active provider. Replace with a real API-backed provider when one is added. */
export const placesProvider: PlacesProvider = new ManualPlacesProvider();

export function hasNearbySearch(): boolean {
  return placesProvider.name !== "manual";
}

/**
 * One-shot geolocation — used ONLY when the user taps "Find My Gym". Never tracked
 * continuously; the coordinate is used once to look up nearby gyms and is not stored
 * unless the user saves a confirmed gym.
 */
export function getCurrentLocation(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Location isn't available on this device."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(new Error(err.code === err.PERMISSION_DENIED ? "Location permission was denied." : "Couldn't get your location.")),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 },
    );
  });
}
