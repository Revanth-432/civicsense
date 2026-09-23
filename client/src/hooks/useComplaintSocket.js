import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const useComplaintSocket = (complaintId, onStatusUpdate) => {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!complaintId) return;

    // Initialize socket connection
    socketRef.current = io(SOCKET_URL, {
      withCredentials: true,
    });

    // Join the specific complaint room
    socketRef.current.emit('join_complaint_room', complaintId);

    // Listen for status updates
    socketRef.current.on('STATUS_UPDATED', (data) => {
      if (onStatusUpdate) {
        onStatusUpdate(data);
      }
    });

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [complaintId, onStatusUpdate]);

  return socketRef.current;
};

export default useComplaintSocket;
