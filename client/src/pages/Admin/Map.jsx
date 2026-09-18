import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import api from '../../services/api';
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

const AdminMap = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: '',
    status: '',
    priority: '',
  });

  const defaultCenter = [17.3850, 78.4867];

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (filters.category) queryParams.append('category', filters.category);
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.priority) queryParams.append('priority', filters.priority);

      const response = await api.get(`/complaints?${queryParams.toString()}`);
      setComplaints(response.data.data.complaints);
    } catch (error) {
      console.error('Failed to fetch complaints:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [filters]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      <div className="bg-white p-4 shadow-sm z-10 relative flex flex-wrap gap-4 items-center">
        <h2 className="text-xl font-bold mr-4">Complaint Map</h2>
        
        <div className="flex gap-4 flex-wrap">
          <div>
            <label className="text-sm text-gray-500 mr-2">Category:</label>
            <select name="category" value={filters.category} onChange={handleFilterChange} className="border rounded p-1">
              <option value="">All</option>
              <option value="POTHOLE">Pothole</option>
              <option value="GARBAGE">Garbage</option>
              <option value="ROAD_DAMAGE">Road Damage</option>
              <option value="STREET_LIGHT">Street Light</option>
              <option value="WATER_LEAK">Water Leak</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          
          <div>
            <label className="text-sm text-gray-500 mr-2">Status:</label>
            <select name="status" value={filters.status} onChange={handleFilterChange} className="border rounded p-1">
              <option value="">All</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="VERIFIED">Verified</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          <div>
            <label className="text-sm text-gray-500 mr-2">Priority:</label>
            <select name="priority" value={filters.priority} onChange={handleFilterChange} className="border rounded p-1">
              <option value="">All</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full relative z-0">
        <MapContainer center={defaultCenter} zoom={12} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MarkerClusterGroup>
            {complaints.map(complaint => {
              if (!complaint.location || !complaint.location.coordinates) return null;
              // GeoJSON coordinates are [longitude, latitude]
              const [lng, lat] = complaint.location.coordinates;
              return (
                <Marker key={complaint._id} position={[lat, lng]}>
                  <Popup>
                    <div className="p-1">
                      <p className="font-bold">ID: {complaint._id.substring(0, 8)}</p>
                      <p><strong>Category:</strong> {complaint.category}</p>
                      <p><strong>Status:</strong> {complaint.status}</p>
                      <p><strong>Priority:</strong> {complaint.priority}</p>
                      <div className="mt-2">
                        <Link to={`/complaints/${complaint._id}`} className="text-blue-600 hover:underline">
                          View Details
                        </Link>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MarkerClusterGroup>
        </MapContainer>
      </div>
    </div>
  );
};

export default AdminMap;
