import { useContext } from 'react';

import { WebSocketContext } from './WebSocketContext';

export const useWebSocketContext = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('Network response was not ok');
  }
  return context;
};
