import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { ArrowLeft } from 'lucide-react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon in Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

const ComplaintDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [newStatus, setNewStatus] = useState('');
  const [newPriority, setNewPriority] = useState('');
  const [note, setNote] = useState('');
  const [updating, setUpdating] = useState(false);

  const priorityOptions = ['LOW', 'MEDIUM', 'HIGH'];

  const statusOptions = [
    'SUBMITTED', 'VERIFIED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REJECTED'
  ];

  useEffect(() => {
    const fetchComplaint = async () => {
      try {
        const res = await api.get(`/complaints/${id}`);
        setComplaint(res.data.data.complaint);
        setNewStatus(res.data.data.complaint.status);
        setNewPriority(res.data.data.complaint.priority || 'LOW');
      } catch (err) {
        setError('Failed to load complaint details');
      } finally {
        setLoading(false);
      }
    };
    fetchComplaint();
  }, [id]);

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
      const res = await api.patch(`/complaints/${id}/status`, { 
        status: newStatus, 
        priority: newPriority,
        note 
      });
      setComplaint(res.data.data.complaint);
      setNote('');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <div className="text-center py-10">Loading...</div>;
  if (error) return <div className="text-red-500 text-center py-10">{error}</div>;
  if (!complaint) return <div className="text-center py-10">Complaint not found</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <button 
        onClick={() => navigate(-1)} 
        className="flex items-center text-blue-600 hover:text-blue-800 mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-1" /> Back
      </button>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Complaint #{complaint._id.substring(0, 8).toUpperCase()}
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              {complaint.category}
            </p>
          </div>
          <div className="flex space-x-2">
            <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${
              complaint.priority === 'HIGH' ? 'bg-red-100 text-red-800' :
              complaint.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
              'bg-green-100 text-green-800'
            }`}>
              {complaint.priority || 'LOW'} PRIORITY
            </span>
            <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
              {complaint.status}
            </span>
          </div>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Citizen</dt>
              <dd className="mt-1 text-sm text-gray-900">{complaint.citizenId.name} ({complaint.citizenId.email})</dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Submitted On</dt>
              <dd className="mt-1 text-sm text-gray-900">{new Date(complaint.createdAt).toLocaleString()}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-gray-500">Description</dt>
              <dd className="mt-1 text-sm text-gray-900">{complaint.description}</dd>
            </div>
            
            {complaint.address && (
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Address</dt>
                <dd className="mt-1 text-sm text-gray-900">{complaint.address}</dd>
              </div>
            )}

            {complaint.location && complaint.location.coordinates && (
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500 mb-2">Location Map</dt>
                <dd className="mt-1">
                  <div className="h-64 w-full rounded-md overflow-hidden border border-gray-300 relative z-0">
                    <MapContainer 
                      center={[complaint.location.coordinates[1], complaint.location.coordinates[0]]} 
                      zoom={15} 
                      style={{ height: '100%', width: '100%' }}
                      scrollWheelZoom={false}
                      dragging={false}
                      zoomControl={false}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <Marker position={[complaint.location.coordinates[1], complaint.location.coordinates[0]]} />
                    </MapContainer>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Coordinates: {complaint.location.coordinates[1].toFixed(6)}, {complaint.location.coordinates[0].toFixed(6)}
                  </p>
                </dd>
              </div>
            )}
            {complaint.imageUrl && (
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500 mb-2">Image Attachment</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  <img src={complaint.imageUrl} alt="Complaint" className="max-w-md h-auto rounded-lg shadow-sm" />
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {['admin', 'officer'].includes(user?.role) && (
        <div className="mt-8 bg-white shadow sm:rounded-lg p-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">Update Status</h4>
          <form onSubmit={handleUpdateStatus} className="space-y-4 max-w-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700">New Status</label>
              <select 
                value={newStatus} 
                onChange={(e) => setNewStatus(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
              >
                {statusOptions.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Update Priority</label>
              <select 
                value={newPriority} 
                onChange={(e) => setNewPriority(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
              >
                {priorityOptions.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Note (Optional)</label>
              <textarea 
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                className="mt-1 p-2 block w-full shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm border border-gray-300 rounded-md"
                placeholder="Add a note about this status change..."
              />
            </div>
            <button 
              type="submit" 
              disabled={updating || (newStatus === complaint.status && newPriority === complaint.priority)}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {updating ? 'Updating...' : 'Update Details'}
            </button>
          </form>
        </div>
      )}

      <div className="mt-8 bg-white shadow sm:rounded-lg p-6">
        <h4 className="text-md font-medium text-gray-900 mb-4">Status History</h4>
        <div className="flow-root">
          <ul className="-mb-8">
            {complaint.statusHistory.map((history, idx) => (
              <li key={history._id}>
                <div className="relative pb-8">
                  {idx !== complaint.statusHistory.length - 1 ? (
                    <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true"></span>
                  ) : null}
                  <div className="relative flex space-x-3">
                    <div>
                      <span className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center ring-8 ring-white">
                        <span className="text-white text-xs font-bold">{history.newStatus.charAt(0)}</span>
                      </span>
                    </div>
                    <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                      <div>
                        <p className="text-sm text-gray-500">
                          Status changed to <span className="font-medium text-gray-900">{history.newStatus}</span>
                          {history.oldStatus && <span> from {history.oldStatus}</span>}
                        </p>
                        {history.note && <p className="mt-1 text-sm text-gray-600">Note: {history.note}</p>}
                        <p className="mt-1 text-xs text-gray-400">By {history.changedBy?.name || 'Unknown'}</p>
                      </div>
                      <div className="text-right text-sm whitespace-nowrap text-gray-500">
                        {new Date(history.timestamp || history.createdAt || history._id.getTimestamp?.() || Date.now()).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ComplaintDetail;
