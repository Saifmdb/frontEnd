import { useState, useEffect, useCallback, useRef } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';
const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://127.0.0.1:8000';

export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const wsRef = useRef(null);
  const pollingIntervalRef = useRef(null);

  const isLoggedIn = useCallback(() => {
    return Boolean(localStorage.getItem('user'));
  }, []);

  const getToken = useCallback(() => {
    // Seul temp_token est le JWT applicatif que le backend sait vérifier.
    return localStorage.getItem('temp_token') || null;
  }, []);

  // Afficher notification système
  const showSystemNotification = useCallback((notif) => {
    if ('Notification' in window && Notification.permission === 'granted' && notif) {
      new Notification(notif.titre || 'Nouvelle notification', {
        body: notif.message || '',
        icon: '/images/logo.png',
      });
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!isLoggedIn()) return;
    const token = getToken();

    try {
      const response = await fetch(`${API_BASE_URL}/conges/notifications/`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        const newNotifs = data.notifications || [];
        const newCount = data.non_lues || 0;
        
        if (newCount > unreadCount && unreadCount > 0) {
          showSystemNotification(newNotifs[0]);
        }
        
        setNotifications(newNotifs);
        setUnreadCount(newCount);
        setIsConnected(true);
        setConnectionError(null);
      }
    } catch (error) {
      setConnectionError(error.message);
    }
  }, [isLoggedIn, getToken, unreadCount, showSystemNotification]);

  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) return;
    console.log("📡 Polling actif (5 sec)");
    fetchNotifications();
    pollingIntervalRef.current = setInterval(fetchNotifications, 5000);
  }, [fetchNotifications]);

  // WebSocket
  const connectWebSocket = useCallback(() => {
    const token = getToken();
    if (!token) return false;

    try {
      wsRef.current = new WebSocket(`${WS_BASE_URL}/ws/notifications/?token=${token}`);

      wsRef.current.onopen = () => {
        console.log("✅ WebSocket connecté");
        setIsConnected(true);
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      };

      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'new_notification') {
          setNotifications(prev => [data.notification, ...prev]);
          setUnreadCount(prev => prev + 1);
          showSystemNotification(data.notification);
        } else if (data.type === 'initial_notifications') {
          setNotifications(data.notifications || []);
          setUnreadCount(data.unread_count || 0);
        }
      };

      wsRef.current.onclose = () => {
        console.log("🔌 WebSocket fermé, fallback au polling");
        setIsConnected(false);
        wsRef.current = null;
        startPolling(); // Fallback au polling
      };

      wsRef.current.onerror = () => {
        // Silencieux - le fallback au polling se fait dans onclose
      };

      return true;
    } catch {
      return false;
    }
  }, [getToken, showSystemNotification, startPolling]);

  const markAsRead = useCallback(async (notificationId) => {
    if (!isLoggedIn()) return;
    const token = getToken();
    await fetch(`${API_BASE_URL}/conges/notifications/${notificationId}/lire/`, {
      method: 'POST', credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, lu: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, [isLoggedIn, getToken]);

  const markAllAsRead = useCallback(async () => {
    if (!isLoggedIn()) return;
    const token = getToken();
    await fetch(`${API_BASE_URL}/conges/notifications/lire-toutes/`, {
      method: 'POST', credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    setNotifications(prev => prev.map(n => ({ ...n, lu: true })));
    setUnreadCount(0);
  }, [isLoggedIn, getToken]);

  const refresh = useCallback(() => fetchNotifications(), [fetchNotifications]);

  useEffect(() => {
    if (!isLoggedIn()) return;

    // Essayer WebSocket, sinon polling
    if (!connectWebSocket()) {
      startPolling();
    }

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, []);

  return { notifications, unreadCount, isConnected, connectionError, markAsRead, markAllAsRead, refresh };
}

export function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

export default useNotifications;