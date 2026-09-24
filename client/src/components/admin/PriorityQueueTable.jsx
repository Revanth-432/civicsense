import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import useComplaintSocket from '../../hooks/useComplaintSocket';

const PriorityQueueTable = () => {
  const [queue, setQueue] = useState([]);

  const fetchQueue = async () => {
    try {
      const res = await api.get('/admin/priority-queue');
      setQueue(res.data.data.queue);
    } catch (err) {
      console.error('Failed to fetch priority queue', err);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  // Pass a dummy ID to integrate hook properly so it can receive global events if emitted there
  useComplaintSocket('admin-dashboard', fetchQueue);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800">Priority Queue</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="p-4 text-sm font-medium text-gray-600">Severity</th>
              <th className="p-4 text-sm font-medium text-gray-600">Category</th>
              <th className="p-4 text-sm font-medium text-gray-600">SLA Deadline</th>
              <th className="p-4 text-sm font-medium text-gray-600">Report Count</th>
              <th className="p-4 text-sm font-medium text-gray-600">Assigned Officer</th>
            </tr>
          </thead>
          <tbody>
            {queue.map(cluster => (
              <tr key={cluster._id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="p-4">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full 
                    ${cluster.severity === 'CRITICAL' ? 'bg-red-100 text-red-800' : ''}
                    ${cluster.severity === 'HIGH' ? 'bg-orange-100 text-orange-800' : ''}
                    ${cluster.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' : ''}
                    ${cluster.severity === 'LOW' ? 'bg-green-100 text-green-800' : ''}
                  `}>
                    {cluster.severity}
                  </span>
                </td>
                <td className="p-4 text-sm text-gray-800">{cluster.category}</td>
                <td className="p-4 text-sm text-gray-500">
                  {cluster.dueAt ? new Date(cluster.dueAt).toLocaleString() : 'N/A'}
                </td>
                <td className="p-4 text-sm text-gray-800">{cluster.reportCount}</td>
                <td className="p-4 text-sm text-gray-800">
                  {cluster.assignedOfficer?.name || 'Unassigned'}
                </td>
              </tr>
            ))}
            {queue.length === 0 && (
              <tr>
                <td colSpan="5" className="p-4 text-center text-gray-500">No active clusters in queue</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PriorityQueueTable;
