import React from 'react';
import { Link } from 'react-router-dom';

const Landing = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <h1 className="text-4xl font-extrabold text-blue-600 mb-4">CivicSense</h1>
        <p className="text-lg text-gray-600 mb-8">
          Report local issues, track their progress, and improve your community.
        </p>
        <div className="space-y-4">
          <Link 
            to="/login" 
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            Login
          </Link>
          <Link 
            to="/register" 
            className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-lg font-medium text-blue-600 bg-white hover:bg-gray-50"
          >
            Register
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Landing;
