import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchTicketMapPoints } from '@/api/tickets';
import { fetchOffices } from '@/api/offices';
import TicketDetail from '@/components/TicketDetail';
import type { TicketMapPoint, Office } from '@/types/models';

const SENTIMENT_COLOR: Record<string, string> = {
    'Позитивный': '#22c55e',
    'Негативный': '#ef4444',
    'Нейтральный': '#3b82f6',
};

function makeDot(color: string, size = 12) {
    return L.divIcon({
        html: `<div style="width:${size}px;height:${size}px;background:${color};border:2px solid white;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,.35)"></div>`,
        className: '',
        iconAnchor: [size / 2, size / 2],
    });
}

const officeMarker = L.divIcon({
    html: `<div style="width:16px;height:16px;background:#3b82f6;border:2.5px solid white;border-radius:3px;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
    className: '',
    iconAnchor: [8, 8],
});

const LEGEND: [string, string][] = [
    ['#22c55e', 'Позитивный'],
    ['#ef4444', 'Негативный'],
    ['#3b82f6', 'Нейтральный'],
    ['#9ca3af', 'Неизвестно'],
];

export default function MapPage() {
    const [points, setPoints] = useState<TicketMapPoint[]>([]);
    const [offices, setOffices] = useState<Office[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    useEffect(() => {
        fetchTicketMapPoints().then(setPoints).catch(console.error);
        fetchOffices().then(setOffices).catch(console.error);
    }, []);

    return (
        <div className="flex-1 flex flex-col relative" style={{ margin: '-24px', height: 'calc(100vh - 0px)' }}>
            {/* Counter overlay */}
            <div className="absolute top-3 left-3 z-[1000] bg-white/90 backdrop-blur-sm rounded-xl px-3 py-2 shadow text-[12px] font-semibold text-foreground border border-[hsl(var(--border))]">
                {points.length} тикетов на карте
            </div>

            {/* Legend overlay */}
            <div className="absolute top-3 right-3 z-[1000] bg-white/90 backdrop-blur-sm rounded-xl px-3 py-2 shadow border border-[hsl(var(--border))] space-y-1.5">
                {LEGEND.map(([color, label]) => (
                    <div key={label} className="flex items-center gap-2 text-[11px] text-foreground">
                        <div style={{ background: color, width: 10, height: 10, borderRadius: '50%', border: '1.5px solid white', boxShadow: '0 1px 3px rgba(0,0,0,.3)', flexShrink: 0 }} />
                        {label}
                    </div>
                ))}
                <div className="flex items-center gap-2 text-[11px] text-foreground border-t border-[hsl(var(--border))] pt-1.5 mt-0.5">
                    <div style={{ background: '#3b82f6', width: 10, height: 10, borderRadius: 2, border: '1.5px solid white', flexShrink: 0 }} />
                    Офис
                </div>
            </div>

            <MapContainer
                center={[48.0, 66.0]}
                zoom={5}
                style={{ flex: 1, height: '100%', width: '100%' }}
                zoomControl={true}
                attributionControl={false}
            >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                {/* Office markers */}
                {offices.filter(o => o.lat && o.lon).map(o => (
                    <Marker key={o.id} position={[o.lat!, o.lon!]} icon={officeMarker}>
                        <Popup>
                            <strong style={{ fontSize: 13 }}>{o.name}</strong>
                            <br />
                            <span style={{ fontSize: 11, color: '#6b7280' }}>{o.city}</span>
                        </Popup>
                    </Marker>
                ))}

                {/* Ticket markers */}
                {points.map(p => (
                    <Marker
                        key={p.id}
                        position={[p.lat, p.lon]}
                        icon={makeDot(SENTIMENT_COLOR[p.sentiment ?? ''] ?? '#9ca3af')}
                    >
                        <Popup>
                            <div style={{ minWidth: 190, maxWidth: 220 }}>
                                <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, lineHeight: 1.3 }}>{p.subject}</p>
                                {p.type && (
                                    <p style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>{p.type}</p>
                                )}
                                {p.sentiment && (
                                    <p style={{ fontSize: 11, marginBottom: 2 }}>{p.sentiment}</p>
                                )}
                                {p.priority_1_10 != null && (
                                    <p style={{ fontSize: 11, color: '#6b7280' }}>Приоритет: {p.priority_1_10}/10</p>
                                )}
                                <button
                                    onClick={() => setSelectedId(p.id)}
                                    style={{ marginTop: 8, fontSize: 12, color: '#3b82f6', cursor: 'pointer', background: 'none', border: 'none', padding: 0, fontWeight: 600 }}
                                >
                                    Открыть →
                                </button>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>

            {selectedId && (
                <TicketDetail
                    ticketId={selectedId}
                    onClose={() => setSelectedId(null)}
                />
            )}
        </div>
    );
}
