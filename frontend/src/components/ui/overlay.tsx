import { t } from 'i18next';
import { WifiOff } from 'lucide-react';
import React, { useEffect, useState } from 'react';

type ConnectionOverlayProps = {
  isConnected: boolean;
  connectionState: 'connecting' | 'connected' | 'disconnected';
};

export const ConnectionOverlay: React.FC<ConnectionOverlayProps> = ({
  isConnected,
  connectionState,
}) => {
  const [showOverlay, setShowOverlay] = useState(false);

  // Doesn't show overlay during initial load
  useEffect(() => {
    if (connectionState === 'disconnected') {
      const timer = setTimeout(() => {
        setShowOverlay(true);
      }, 1000);

      return () => clearTimeout(timer);
    } else if (connectionState === 'connected') {
      setShowOverlay(false);
    }
  }, [connectionState]);

  if (!showOverlay || isConnected) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 pointer-events-auto">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-md" />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className={`
            flex flex-col items-center gap-4 px-8 py-6 rounded-xl shadow-2xl border-2 max-w-sm w-full
            bg-red-500 text-white border-red-600 transition-all ease-in-out animate-pulse duration-[4s]
          `}
        >
          <WifiOff className="w-12 h-12" />
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold">
              {t('msg.reconnectingBackend')}
            </h3>
            <p className="text-sm opacity-90">
              {t('msg.wrongContactingBackend')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectionOverlay;
