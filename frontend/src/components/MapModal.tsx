import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { X, MapPin } from 'lucide-react';
import L from 'leaflet';

// ── Fix Leaflet's default marker icon broken by bundlers ─────────────────────
// Leaflet tries to resolve icon URLs at runtime using its own internal path
// logic, which breaks in Vite/webpack. We override with CDN URLs instead.
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// ── Sub-component: re-centers map when coords change ─────────────────────────
function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 16);
  }, [lat, lng, map]);
  return null;
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface MapModalProps {
  open: boolean;
  onClose: () => void;
  latitude: number;
  longitude: number;
  address: string;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function MapModal({
  open,
  onClose,
  latitude,
  longitude,
  address,
}: MapModalProps) {
  // Prevent body scroll while modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4"
      onClick={onClose}
    >
      {/* Dialog — stop click propagation so clicking inside doesn't close */}
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
              <MapPin size={16} className="text-brand-600" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">Delivery Location</p>
              <p className="text-xs text-gray-400">Interactive map</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
            aria-label="Close map"
          >
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        {/* Map — takes up most of the dialog */}
        <div className="flex-1" style={{ minHeight: '340px', height: '380px' }}>
          <MapContainer
            center={[latitude, longitude]}
            zoom={16}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
            attributionControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={[latitude, longitude]}>
              <Popup>
                <span className="text-xs">{address}</span>
              </Popup>
            </Marker>
            <RecenterMap lat={latitude} lng={longitude} />
          </MapContainer>
        </div>

        {/* Footer — address label */}
        <div className="px-5 py-4 border-t border-gray-100 flex-shrink-0 bg-gray-50/60">
          <div className="flex items-start gap-2">
            <MapPin size={14} className="text-brand-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-700 leading-relaxed">{address}</p>
          </div>
          <p className="text-xs text-gray-400 mt-1 ml-5">
            {latitude.toFixed(6)}, {longitude.toFixed(6)}
          </p>
        </div>
      </div>
    </div>
  );
}