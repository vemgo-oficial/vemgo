"use client";

import { useMemo } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type Point = { lat: number; lng: number };

const pinIcon = L.divIcon({
  className: "",
  html: '<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#f97316;border:3px solid #fff;box-shadow:0 2px 8px #0008"></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 22],
});

function MapClickPicker({ point, onPick }: { point: Point | null; onPick: (point: Point) => void }) {
  useMapEvents({
    click(event) {
      onPick({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });
  return point ? <Marker position={[point.lat, point.lng]} icon={pinIcon} /> : null;
}

export default function ProfessionalManualLocationMap({
  center,
  point,
  onPick,
}: {
  center: [number, number];
  point: Point | null;
  onPick: (point: Point) => void;
}) {
  const initialCenter = useMemo(() => center, [center]);
  return (
    <div className="h-[360px] overflow-hidden rounded-xl border border-white/10">
      <MapContainer center={initialCenter} zoom={point ? 16 : 11} scrollWheelZoom className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickPicker point={point} onPick={onPick} />
      </MapContainer>
    </div>
  );
}
