import { useEffect } from 'react';
import { useStore } from '../store';

/**
 * Hook to manage online/offline status and sync pending changes when back online
 * 
 * Sets up event listeners for 'online' and 'offline' events and automatically
 * syncs dirty documents when connection is restored.
 * 
 * @returns void - Sets up listeners and returns cleanup function
 */
export function useOnlineStatus(): void {
  const { setOnline } = useStore();
  
  useEffect(() => {
    // Set initial online status
    setOnline(navigator.onLine);
    
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnline]);
}

