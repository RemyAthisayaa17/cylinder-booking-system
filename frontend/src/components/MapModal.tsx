import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { X, MapPin } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});


const MAP_HEIGHT_PX = 420;

function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();

  useEffect(() => {
    console.log('[MapModal] RecenterMap → setView', { lat, lng });
    map.setView([lat, lng], 16);

    const raf = requestAnimationFrame(() => map.invalidateSize());
    const t1 = setTimeout(() => map.invalidateSize(), 100);
    const t2 = setTimeout(() => map.invalidateSize(), 300);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [lat, lng, map]);

  useEffect(() => {
    const container = map.getContainer();
    const observer = new ResizeObserver(() => {
      map.invalidateSize();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);

  return null;
}

interface MapModalProps {
  open: boolean;
  onClose: () => void;
  latitude: number;
  longitude: number;
  address: string;
}

export default function MapModal({
  open,
  onClose,
  latitude,
  longitude,
  address,
}: MapModalProps) {
  const mapWrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    console.log('[MapModal] state', { open, latitude, longitude, address });
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open, latitude, longitude, address]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — always pinned, never shrinks, never scrolls away */}
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

        
        <div className="flex-1 min-h-0 overflow-y-auto">
          
          <div
            ref={mapWrapperRef}
            className="w-full"
            style={{ height: `${MAP_HEIGHT_PX}px` }}
          >
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

          {/* Address info — guaranteed fully visible via scroll if needed */}
          <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/60">
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
    </div>
  );
}