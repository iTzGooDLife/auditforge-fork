import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

type ConnectionState = 'connecting' | 'connected' | 'disconnected';

type UseWebSocketReturn = {
  socket: Socket | null;
  isConnected: boolean;
  connectionState: ConnectionState;
};

export const useWebSocket = (): UseWebSocketReturn => {
  const [connectionState, setConnectionState] =
    useState<ConnectionState>('connecting');
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socketUrl = import.meta.env.VITE_WS_URL;

    // WebSocket Connection
    const socket = io(socketUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
      reconnectionDelayMax: 10000,
      timeout: 3000,
    });

    socketRef.current = socket;

    // Connection Events
    socket.on('connect', () => {
      setConnectionState('connected');
    });

    socket.on('disconnect', reason => {
      // Show overlay only if disconnection is involuntary
      if (reason !== 'io client disconnect') {
        setConnectionState('disconnected');
      }
    });

    socket.on('connect_error', () => {
      setConnectionState('disconnected');
    });

    socket.on('reconnect', () => {
      setConnectionState('connected');
    });

    socket.on('reconnect_error', () => {
      setConnectionState('disconnected');
    });

    socket.on('reconnect_failed', () => {
      setConnectionState('disconnected');
    });

    // Dismount cleanup
    return () => {
      socket.disconnect();
    };
  }, []);

  return {
    socket: socketRef.current,
    isConnected: connectionState === 'connected',
    connectionState,
  };
};
