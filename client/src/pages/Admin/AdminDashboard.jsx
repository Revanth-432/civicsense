import React from 'react';
import StatCards from '../../components/admin/StatCards';
import ModelAgreementChart from '../../components/admin/ModelAgreementChart';
import IncidentHeatmap from '../../components/admin/IncidentHeatmap';
import PriorityQueueTable from '../../components/admin/PriorityQueueTable';

const AdminDashboard = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Officer Dashboard</h1>
      
      {/* Top row: Stat Cards */}
      <StatCards />
      
      {/* Middle row: Map and Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <IncidentHeatmap />
        <ModelAgreementChart />
      </div>
      
      {/* Bottom row: Priority Queue Table */}
      <PriorityQueueTable />
    </div>
  );
};

export default AdminDashboard;
