export interface Coordinates {
  latitude: number;
  longitude: number;
}

export async function geocodeAddress(address: string): Promise<Coordinates | null> {
  try {
    if (!address?.trim()) return null;

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "gas-cylinder-booking-system",
        "Accept": "application/json",
      },
    });

    if (!res.ok) {
      console.error("[GEO] HTTP error:", res.status);
      return null;
    }

    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      console.warn("[GEO] No results for:", address);
      return null;
    }

    const first = data[0];

    if (!first?.lat || !first?.lon) {
      console.warn("[GEO] Invalid response format:", first);
      return null;
    }

    const result = {
      latitude: Number(first.lat),
      longitude: Number(first.lon),
    };

    console.log(`[GEO] Resolved "${address}" →`, result);

    return result;
  } catch (err) {
    console.error("[GEO] Failed completely:", err);
    return null;
  }
}