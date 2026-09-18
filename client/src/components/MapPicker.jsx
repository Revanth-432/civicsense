import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon in Leaflet with Webpack/Vite
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

// Component to handle map clicks and moving the marker
const MapEvents = ({ setPosition }) => {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
};

// Component to dynamically recenter map
const RecenterAutomatically = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng]);
  }, [lat, lng, map]);
  return null;
};

const MapPicker = ({ position, setPosition }) => {
  const [loadingLocation, setLoadingLocation] = useState(false);
  
  // Default to Hyderabad if no position is set yet
  const defaultCenter = [17.3850, 78.4867];
  const center = position || defaultCenter;

  const handleUseCurrentLocation = (e) => {
    e.preventDefault();
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition([pos.coords.latitude, pos.coords.longitude]);
        setLoadingLocation(false);
      },
      (err) => {
        alert("Unable to retrieve your location. Please ensure you have granted permission.");
        setLoadingLocation(false);
        console.error(err);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
  };

  const handleMarkerDragEnd = (e) => {
    const marker = e.target;
    const pos = marker.getLatLng();
    setPosition([pos.lat, pos.lng]);
  };

  return (
    <div className="space-y-4">
      <button
        onClick={handleUseCurrentLocation}
        disabled={loadingLocation}
        className="w-full sm:w-auto px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 flex items-center justify-center font-medium"
      >
        {loadingLocation ? (
          <span>Getting Location...</span>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            Use My Current Location
          </>
        )}
      </button>

      <div className="h-64 w-full rounded-md overflow-hidden border border-gray-300 relative z-0">
        <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {position && (
            <Marker
              position={position}
              draggable={true}
              eventHandlers={{
                dragend: handleMarkerDragEnd,
              }}
            />
          )}
          <MapEvents setPosition={setPosition} />
          {position && <RecenterAutomatically lat={position[0]} lng={position[1]} />}
        </MapContainer>
      </div>
      
      {position && (
        <p className="text-xs text-gray-500 text-center">
          Latitude: {position[0].toFixed(6)}, Longitude: {position[1].toFixed(6)}
          <br/>
          (You can drag the marker to adjust the exact location)
        </p>
      )}
    </div>
  );
};

export default MapPicker;
