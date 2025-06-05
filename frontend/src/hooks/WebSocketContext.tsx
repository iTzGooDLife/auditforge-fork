import React, { createContext, ReactNode } from 'react';
import { Socket } from 'socket.io-client';

import { useWebSocket } from './useWebSocket';

export type WebSocketContextType = {
  socket: Socket | null;
  isConnected: boolean;
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
  const { socket, isConnected } = useWebSocket();
  return (
    <WebSocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </WebSocketContext.Provider>
  );
};
