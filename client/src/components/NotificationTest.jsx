import React, { useEffect } from 'react';
import { io } from 'socket.io-client';

const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
  withCredentials: true,
});

const NotificationTest = () => {
  useEffect(() => {
    const mockUserId = '507f1f77bcf86cd799439011';
    
    socket.emit('join_user_room', mockUserId);
    
    const handleNewNotification = (data) => {
      console.log('🔔 REAL-TIME NOTIFICATION:', data);
    };

    socket.on('NEW_NOTIFICATION', handleNewNotification);

    return () => {
      socket.off('NEW_NOTIFICATION', handleNewNotification);
    };
  }, []);

  const triggerNotification = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/notifications/test-trigger`, {
        method: 'POST',
      });
      const data = await response.json();
      console.log('Trigger response:', data);
    } catch (error) {
      console.error('Error triggering notification:', error);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 10, right: 10, zIndex: 9999, background: '#fff', padding: '10px', border: '1px solid black' }}>
      <h4>Notification Test</h4>
      <button onClick={triggerNotification}>Trigger Notification</button>
    </div>
  );
};

export default NotificationTest;
