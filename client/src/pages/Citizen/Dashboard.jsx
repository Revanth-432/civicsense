import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

const Dashboard = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchComplaints = async () => {
      try {
        const res = await api.get('/complaints');
        setComplaints(res.data.data.complaints);
      } catch (err) {
        setError('Failed to fetch complaints');
      } finally {
        setLoading(false);
      }
    };

    fetchComplaints();
  }, []);

  if (loading) return <div className="text-center py-10">Loading complaints...</div>;
  if (error) return <div className="text-red-500 text-center py-10">{error}</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Complaints</h1>
        <Link 
          to="/complaints/new" 
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          File New Complaint
        </Link>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {complaints.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            You haven't submitted any complaints yet.
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {complaints.map((complaint) => (
              <li key={complaint._id}>
                <Link to={`/complaints/${complaint._id}`} className="block hover:bg-gray-50">
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-blue-600 truncate">
                        #{complaint._id.substring(0, 8).toUpperCase()} - {complaint.category}
                      </p>
                      <div className="ml-2 flex-shrink-0 flex">
                        <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${complaint.status === 'SUBMITTED' ? 'bg-yellow-100 text-yellow-800' : ''}
                          ${complaint.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' : ''}
                          ${complaint.status === 'RESOLVED' ? 'bg-green-100 text-green-800' : ''}
                          ${complaint.status === 'CLOSED' ? 'bg-gray-100 text-gray-800' : ''}
                          ${complaint.status === 'REJECTED' ? 'bg-red-100 text-red-800' : ''}
                        `}>
                          {complaint.status}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex">
                        <p className="flex items-center text-sm text-gray-500">
                          {complaint.description.substring(0, 60)}...
                        </p>
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                        <p>
                          Submitted on {new Date(complaint.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
