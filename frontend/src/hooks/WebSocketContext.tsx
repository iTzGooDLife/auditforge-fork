import React, { createContext, ReactNode } from 'react';
import { Socket } from 'socket.io-client';

import { useWebSocket } from './useWebSocket';

export type WebSocketContextType = {
  socket: Socket | null;
  isConnected: boolean;
  connectionState: 'connecting' | 'connected' | 'disconnected';
};

export const WebSocketContext = createContext<WebSocketContextType | undefined>(
  undefined,
);

type WebSocketProviderProps = {
  children: ReactNode;
};

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({
  children,
}) => {
  const { socket, isConnected, connectionState } = useWebSocket();

  return (
    <WebSocketContext.Provider value={{ socket, isConnected, connectionState }}>
      {children}
    </WebSocketContext.Provider>
  );
};
