import React, { useContext } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LogOut, Home, FileText, PlusCircle } from 'lucide-react';

const AppLayout = () => {
  const { user, logout } = useContext(AuthContext);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span className="text-xl font-bold text-blue-600">CivicSense</span>
              
              <div className="hidden md:ml-6 md:flex md:space-x-8">
                {user?.role === 'citizen' ? (
                  <>
                    <Link to="/dashboard" className="text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-blue-500 text-sm font-medium">
                      <Home className="mr-2 h-4 w-4"/> Dashboard
                    </Link>
                    <Link to="/complaints/new" className="text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-blue-500 text-sm font-medium">
                      <PlusCircle className="mr-2 h-4 w-4"/> New Complaint
                    </Link>
                  </>
                ) : (
                  <>
                    <Link to="/admin/dashboard" className="text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-blue-500 text-sm font-medium">
                      <Home className="mr-2 h-4 w-4"/> Admin Dashboard
                    </Link>
                  </>
                )}
              </div>
            </div>
            
            <div className="flex items-center">
              <span className="text-gray-700 mr-4">Hi, {user?.name}</span>
              <button 
                onClick={logout}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <LogOut className="mr-2 h-4 w-4" /> Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
