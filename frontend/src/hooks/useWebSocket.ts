import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

type UseWebSocketReturn = {
  socket: Socket | null;
  isConnected: boolean;
};

export const useWebSocket = (url?: string): UseWebSocketReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // URL
    const socketUrl = 'wss://localhost:8443';

    // Websocket Connection
    const socket = io(socketUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 5000,
      reconnectionAttempts: Infinity,
      reconnectionDelayMax: 10000,
      timeout: 5000,
    });

    socketRef.current = socket;

    // Connection Events
    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', _reason => {
      setIsConnected(false);
    });

    socket.on('connect_error', _error => {
      setIsConnected(false);
    });

    socket.on('reconnect', _attemptNumber => {
      setIsConnected(true);
    });

    socket.on('reconnect_error', _error => {});

    socket.on('reconnect_failed', () => {
      setIsConnected(false);
    });

    // Cleanup al desmontar
    return () => {
      socket.disconnect();
    };
  }, [url]);

  return {
    socket: socketRef.current,
    isConnected,
  };
};
