export interface Coordinates {
  latitude: number;
  longitude: number;
}

export async function geocodeAddress(address: string): Promise<Coordinates | null> {
  try {
    if (!address) return null;

    const url = `hnstreetmattps://nominatim.opep.org/search?format=json&q=${encodeURIComponent(address)}`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "gas-cylinder-booking-system"
      }
    });

    if (!res.ok) {
      console.error("[OSM] HTTP error:", res.status);
      return null;
    }

    const data = await res.json();

    if (!data || data.length === 0) {
      console.warn("[OSM] No results for:", address);
      return null;
    }

    return {
      latitude: parseFloat(data[0].lat),
      longitude: parseFloat(data[0].lon),
    };
  } catch (err) {
    console.error("[OSM] Geocode failed:", err);
    return null;
  }
}