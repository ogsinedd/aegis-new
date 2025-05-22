import { useEffect } from 'react';
import { toast } from 'sonner';

const STREAM_URL = `${import.meta.env.VITE_API_URL?.replace(/^http/, 'ws')}/containers/stream`;

export interface ContainerStatusUpdate {
  type: 'container_status_update' | 'host_status_update'; // Add more types as needed
  payload: {
    host_id: string;
    container_id?: string; // Optional for host_status_update
    status: string; // idle, online, scanning, scanned, error, etc.
    scan_id?: string; // Optional, for container scans
    // ... any other relevant fields
  };
}

let socket: WebSocket | null = null;
let listeners: Array<(update: ContainerStatusUpdate) => void> = [];

const connectSocket = () => {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return;
  }

  socket = new WebSocket(STREAM_URL);

  socket.onopen = () => {
    console.log('WebSocket connection established');
    toast.success('Real-time updates connected.', { duration: 2000 });
  };

  socket.onmessage = (event) => {
    try {
      const update = JSON.parse(event.data as string) as ContainerStatusUpdate;
      listeners.forEach(listener => listener(update));
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  };

  socket.onerror = (error) => {
    console.error('WebSocket error:', error);
    toast.error('Real-time updates connection error.');
  };

  socket.onclose = () => {
    console.log('WebSocket connection closed. Attempting to reconnect...');
    toast.info('Real-time updates disconnected. Attempting to reconnect...', { duration: 2000 });
    // Simple reconnect logic, consider more robust backoff strategy for production
    setTimeout(connectSocket, 5000);
  };
};

const addListener = (callback: (update: ContainerStatusUpdate) => void) => {
  listeners.push(callback);
};

const removeListener = (callback: (update: ContainerStatusUpdate) => void) => {
  listeners = listeners.filter(l => l !== callback);
};

// Call connectSocket once when the module is loaded
// This makes it a singleton connection for the app
connectSocket();

export const useWebSocketListener = (onUpdate: (update: ContainerStatusUpdate) => void) => {
  useEffect(() => {
    addListener(onUpdate);
    // Ensure socket is connected if not already
    if (!socket || socket.readyState === WebSocket.CLOSED) {
        connectSocket();
    }
    return () => {
      removeListener(onUpdate);
      // Optionally, close socket if no listeners are left, but for a persistent connection, 
      // we might want to keep it open. For now, it tries to stay open.
    };
  }, [onUpdate]);
};

// Utility to send messages if needed (e.g., for subscribing to specific topics)
// export const sendWebSocketMessage = (message: any) => {
//   if (socket && socket.readyState === WebSocket.OPEN) {
//     socket.send(JSON.stringify(message));
//   } else {
//     console.error('WebSocket is not connected.');
//   }
// }; 
