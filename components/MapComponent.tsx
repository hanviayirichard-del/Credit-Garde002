import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Credit } from '../types';

interface MapComponentProps {
  credits: Credit[];
}

const MapComponent: React.FC<MapComponentProps> = ({ credits }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const routingLine = useRef<L.Polyline | null>(null);
  const [isRouting, setIsRouting] = useState(false);

  // Expose trace function to window for popup access
  useEffect(() => {
    (window as any).tracePath = (lat: number, lng: number) => {
      if (!mapInstance.current || !userPos) {
        alert("Position utilisateur non disponible");
        return;
      }

      // Remove existing line
      if (routingLine.current) {
        mapInstance.current.removeLayer(routingLine.current);
      }

      // Create new polyline (simple straight line for "trace")
      routingLine.current = L.polyline([userPos, [lat, lng]], {
        color: '#2563eb',
        weight: 6,
        opacity: 0.7,
        dashArray: '10, 10',
        lineJoin: 'round'
      }).addTo(mapInstance.current);

      // Fit bounds to show both
      mapInstance.current.fitBounds(routingLine.current.getBounds(), { padding: [50, 50] });
      setIsRouting(true);
    };

    return () => {
      delete (window as any).tracePath;
    };
  }, [userPos]);

  const clearRoute = () => {
    if (routingLine.current && mapInstance.current) {
      mapInstance.current.removeLayer(routingLine.current);
      routingLine.current = null;
      setIsRouting(false);
    }
  };

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    // Initialize map
    mapInstance.current = L.map(mapRef.current).setView([6.1372, 1.2125], 13); // Default to Lomé

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(mapInstance.current);

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstance.current) return;

    // Clear existing markers (except tile layer)
    mapInstance.current.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        mapInstance.current?.removeLayer(layer);
      }
    });

    // Add markers for credits with coordinates
    credits.forEach((credit) => {
      if (credit.latitude && credit.longitude) {
        const repaidCap = (credit.repayments || []).reduce((acc, r) => acc + (Number(r.capital) || 0), 0);
        const isSettled = repaidCap >= (Number(credit.creditAccordeChiffre) || 0);
        const color = isSettled ? '#f59e0b' : '#10b981'; // Orange for settled, Green for active

        const markerHtml = `
          <div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.3);"></div>
        `;

        const customIcon = L.divIcon({
          html: markerHtml,
          className: '',
          iconSize: [12, 12],
          iconAnchor: [6, 6]
        });

        L.marker([credit.latitude, credit.longitude], { icon: customIcon })
          .addTo(mapInstance.current!)
          .bindPopup(`
            <div style="font-family: sans-serif; padding: 5px; min-width: 150px;">
              <strong style="display: block; margin-bottom: 5px; text-transform: uppercase; font-size: 12px;">${credit.clientName}</strong>
              <div style="font-size: 10px; color: #64748b;">Dossier: ${credit.dossierNo}</div>
              <div style="font-size: 10px; color: #64748b;">Zone: ${credit.zone}</div>
              <div style="font-size: 10px; color: ${color}; font-weight: bold; margin-top: 5px; margin-bottom: 8px;">${isSettled ? 'SOLDÉ' : 'ACTIF'}</div>
              <button 
                onclick="window.tracePath(${credit.latitude}, ${credit.longitude})"
                style="width: 100%; background: #2563eb; color: white; border: none; padding: 6px; border-radius: 6px; font-size: 10px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;"
              >
                <span>📍</span> Tracer l'itinéraire
              </button>
            </div>
          `);
      }
    });

    // Try to get user position
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude } = position.coords;
        setUserPos([latitude, longitude]);
        if (mapInstance.current) {
          const userIcon = L.divIcon({
            html: `<div style="background-color: #2563eb; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 8px rgba(37,99,235,0.5);"></div>`,
            className: '',
            iconSize: [16, 16],
            iconAnchor: [8, 8]
          });
          L.marker([latitude, longitude], { icon: userIcon })
            .addTo(mapInstance.current)
            .bindPopup("Votre position");
        }
      }, (err) => console.warn("Geolocation error:", err));
    }
  }, [credits]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div ref={mapRef} className="w-full h-full z-0" />
      
      {/* Clear Route Button */}
      {isRouting && (
        <button 
          onClick={clearRoute}
          className="absolute bottom-32 left-1/2 -translate-x-1/2 z-[5000] bg-red-500 text-white px-6 py-3 rounded-2xl shadow-2xl font-black text-xs uppercase tracking-widest hover:bg-red-600 transition-all active:scale-95 flex items-center gap-2"
        >
          <span>❌</span> Supprimer l'itinéraire
        </button>
      )}

      {/* Legend */}
      <div className="absolute top-6 left-6 z-[1000] bg-white/90 backdrop-blur-md p-6 rounded-3xl shadow-xl border border-white/20 min-w-[200px]">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-slate-900 p-2 rounded-lg">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <span className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">LÉGENDE</span>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-blue-600 border-2 border-white shadow-sm"></div>
            <span className="text-xs font-bold text-slate-600">Votre position</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow-sm"></div>
            <span className="text-xs font-bold text-slate-600">Client Actif</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-amber-500 border-2 border-white shadow-sm"></div>
            <span className="text-xs font-bold text-slate-600">Client Inactif</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapComponent;
