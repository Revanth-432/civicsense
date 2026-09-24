import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../../services/api';

const COLORS = ['#2ecc71', '#e74c3c'];

const ModelAgreementChart = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchChartData = async () => {
      try {
        const res = await api.get('/admin/analytics/model-agreement');
        const { acceptedCount, correctedCount } = res.data.data;
        setData([
          { name: 'AI Accepted', value: acceptedCount },
          { name: 'Human Corrected', value: correctedCount },
        ]);
      } catch (err) {
        console.error('Failed to fetch model agreement data', err);
      }
    };
    fetchChartData();
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 flex flex-col" style={{ height: '400px' }}>
      <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">Model Agreement Rate</h3>
      <div className="flex-grow">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={80}
              outerRadius={110}
              fill="#8884d8"
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ModelAgreementChart;
