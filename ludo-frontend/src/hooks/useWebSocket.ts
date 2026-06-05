import { useEffect, useState, useCallback, useRef } from 'react';
import { Client, type StompSubscription } from '@stomp/stompjs';
import { useAuthStore } from '../store/useAuthStore';

// Singleton STOMP client instance at the module level to avoid duplicate connections
let stompClient: Client | null = null;
const subscribers = new Set<() => void>();

const getWSUrl = (token: string | null) => {
  const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';

  // Production: VITE_WS_BASE_URL set in Vercel env vars (e.g. wss://xxx.railway.app)
  if (import.meta.env.VITE_WS_BASE_URL) {
    return `${import.meta.env.VITE_WS_BASE_URL}/ws${tokenParam}`;
  }

  // Automatically derive from VITE_API_BASE_URL if it is available
  if (import.meta.env.VITE_API_BASE_URL) {
    try {
      const url = new URL(import.meta.env.VITE_API_BASE_URL);
      const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//${url.host}/ws${tokenParam}`;
    } catch (e) {
      console.error('Failed to parse VITE_API_BASE_URL for WebSocket', e);
    }
  }

  // Docker Compose / same-origin: derive from page URL so Nginx can proxy
  const isSecure = window.location.protocol === 'https:';
  const protocol = isSecure ? 'wss:' : 'ws:';
  // In development, Spring Boot runs on localhost:8080
  const host = import.meta.env.DEV ? 'localhost:8080' : window.location.host;
  return `${protocol}//${host}/ws${tokenParam}`;
};

export function useWebSocket() {
  const { accessToken, isAuthenticated } = useAuthStore();
  const [isConnected, setIsConnected] = useState(stompClient?.connected || false);
  const activeSubscriptions = useRef<Map<string, StompSubscription>>(new Map());

  // Helper to trigger status updates for all active hooks
  const updateConnectionStatus = useCallback(() => {
    const connected = stompClient?.connected || false;
    setIsConnected(connected);
    subscribers.forEach((cb) => cb());
  }, []);

  useEffect(() => {
    const handler = () => {
      setIsConnected(stompClient?.connected || false);
    };
    subscribers.add(handler);
    return () => {
      subscribers.delete(handler);
    };
  }, []);

  const connect = useCallback(() => {
    if (!isAuthenticated || stompClient?.active) {
      return;
    }

    const brokerURL = getWSUrl(accessToken);

    stompClient = new Client({
      brokerURL,
      connectHeaders: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        console.log('STOMP Connected successfully');
        updateConnectionStatus();
      },
      onDisconnect: () => {
        console.log('STOMP Disconnected');
        updateConnectionStatus();
      },
      onStompError: (frame) => {
        console.error('Broker reported error: ' + frame.headers['message']);
        console.error('Additional details: ' + frame.body);
        updateConnectionStatus();
      },
      onWebSocketClose: () => {
        updateConnectionStatus();
      }
    });

    stompClient.activate();
  }, [accessToken, isAuthenticated, updateConnectionStatus]);

  const disconnect = useCallback(() => {
    if (stompClient) {
      // Clear local subscriptions
      activeSubscriptions.current.forEach((sub) => sub.unsubscribe());
      activeSubscriptions.current.clear();
      stompClient.deactivate();
      stompClient = null;
      updateConnectionStatus();
    }
  }, [updateConnectionStatus]);

  const subscribe = useCallback((destination: string, callback: (message: unknown) => void) => {
    if (!stompClient || !stompClient.connected) {
      console.warn('Cannot subscribe, STOMP client is not connected.');
      return null;
    }

    // Avoid duplicate subscription to the same destination on this hook instance
    if (activeSubscriptions.current.has(destination)) {
      return activeSubscriptions.current.get(destination)!;
    }

    const subscription = stompClient.subscribe(destination, (message) => {
      try {
        const payload = JSON.parse(message.body);
        callback(payload);
      } catch {
        // If body is not JSON, pass raw body
        callback(message.body);
      }
    });

    activeSubscriptions.current.set(destination, subscription);
    return subscription;
  }, []);

  const unsubscribe = useCallback((destination: string) => {
    const subscription = activeSubscriptions.current.get(destination);
    if (subscription) {
      subscription.unsubscribe();
      activeSubscriptions.current.delete(destination);
    }
  }, []);

  const sendMessage = useCallback((destination: string, body: unknown) => {
    if (!stompClient || !stompClient.connected) {
      console.error('Cannot send message, STOMP client is not connected.');
      return false;
    }

    stompClient.publish({
      destination,
      body: typeof body === 'string' ? body : JSON.stringify(body)
    });
    return true;
  }, []);

  return {
    isConnected,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    sendMessage
  };
}
