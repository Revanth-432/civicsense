import React, { useEffect, useState } from 'react';
import api from '../../services/api';

const StatCards = () => {
  const [stats, setStats] = useState({ totalClusters: 0, totalResolvedClusters: 0, totalSlaBreachedComplaints: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/admin/analytics/overview');
        setStats(res.data.data);
      } catch (err) {
        console.error('Failed to fetch stats', err);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex flex-col items-center">
        <h3 className="text-gray-500 font-medium mb-2">Total Clusters</h3>
        <p className="text-4xl font-bold text-gray-800">{stats.totalClusters}</p>
      </div>
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex flex-col items-center">
        <h3 className="text-gray-500 font-medium mb-2">Resolved Clusters</h3>
        <p className="text-4xl font-bold text-green-600">{stats.totalResolvedClusters}</p>
      </div>
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex flex-col items-center">
        <h3 className="text-gray-500 font-medium mb-2">SLA Breaches</h3>
        <p className="text-4xl font-bold text-red-600">{stats.totalSlaBreachedComplaints}</p>
      </div>
    </div>
  );
};

export default StatCards;
