import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import api from '../../services/api';
import 'leaflet/dist/leaflet.css';

const severityColors = {
  CRITICAL: '#c0392b',
  HIGH: '#e67e22',
  MEDIUM: '#f1c40f',
  LOW: '#2ecc71'
};

const IncidentHeatmap = () => {
  const [markers, setMarkers] = useState([]);

  useEffect(() => {
    const fetchHeatmap = async () => {
      try {
        const res = await api.get('/admin/analytics/heatmap');
        setMarkers(res.data.data.heatmapData);
      } catch (err) {
        console.error('Failed to fetch heatmap data', err);
      }
    };
    fetchHeatmap();
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 flex flex-col" style={{ height: '400px' }}>
      <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">Incident Heatmap</h3>
      <div className="flex-grow overflow-hidden rounded">
        <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ height: '100%', width: '100%', zIndex: 1 }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
          {markers.map((marker, idx) => {
            if (!marker.location || !marker.location.coordinates) return null;
            const position = [marker.location.coordinates[1], marker.location.coordinates[0]];
            const color = severityColors[marker.severity] || '#3388ff';
            
            return (
              <CircleMarker
                key={marker._id || idx}
                center={position}
                radius={8}
                fillColor={color}
                color={color}
                weight={1}
                opacity={1}
                fillOpacity={0.8}
              >
                <Popup>
                  <div className="p-1">
                    <strong className="block text-sm">{marker.category}</strong>
                    <span className="text-xs text-gray-500">Severity: {marker.severity}</span>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
};

export default IncidentHeatmap;
