import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  content: string;
  type?: string;
  isRead: boolean;
  createdAt: string;
  data?: any;
}

export function useInAppNotification() {
  const { data: session } = useSession();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  // Helper to fetch notifications via BFF Proxy (which handles Auth Token injection)
  const fetchNotifications = useCallback(async () => {
    // @ts-ignore
    const userId = session?.user?.id;
    if (!userId) return;

    try {
      // Use the Next.js Proxy API to forward requests to Backend with Auth Token
      const res = await fetch(`/api/proxy/notifications/user/${userId}?limit=20`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setNotifications(data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    }
  }, [session]);

  // Helper to fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    // @ts-ignore
    const userId = session?.user?.id;
    if (!userId) return;

    try {
      const res = await fetch(`/api/proxy/notifications/user/${userId}/unread-count`);
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count);
      }
    } catch (error) {
      console.error('Failed to fetch unread count', error);
    }
  }, [session]);

  // Initialize Socket connection
  useEffect(() => {
    // @ts-ignore
    const userId = session?.user?.id;

    if (!userId) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    if (socket && socket.connected) return;

    // Connect to the WebSocket Server
    // Note: In production, this URL should be from env
    const newSocket = io('http://localhost:3002', {
      query: { userId },
      transports: ['websocket'],
      // Pass token for future JWT verification support
      auth: {
        token: session?.accessToken,
      },
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('Notification Socket Connected');
      // Fetch initial data on connect
      fetchNotifications();
      fetchUnreadCount();
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Notification Socket Disconnected');
    });

    newSocket.on('notification', (payload: string) => {
      try {
        const notification = JSON.parse(payload);
        toast.info(notification.title, {
          description: notification.content,
        });
        
        // Update local state immediately
        setNotifications((prev) => [notification, ...prev]);
        setUnreadCount((prev) => prev + 1);
      } catch (e) {
        console.error('Failed to parse notification payload', e);
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [session, fetchNotifications, fetchUnreadCount]);

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/proxy/notifications/${id}/read`, {
        method: 'POST',
      });
      
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      toast.error('Failed to mark as read');
    }
  };

  const markAllAsRead = async () => {
    // @ts-ignore
    const userId = session?.user?.id;
    if (!userId) return;

    try {
      await fetch(`/api/proxy/notifications/user/${userId}/read-all`, {
        method: 'POST',
      });
      
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true }))
      );
      setUnreadCount(0);
      toast.success('All marked as read');
    } catch (error) {
      toast.error('Failed to mark all as read');
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const res = await fetch(`/api/proxy/notifications/${id}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        const notification = notifications.find(n => n.id === id);
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        if (notification && !notification.isRead) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
        toast.success('Notification deleted');
      } else {
        toast.error('Failed to delete notification');
      }
    } catch (error) {
      toast.error('Error deleting notification');
    }
  };

  return {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh: fetchNotifications,
  };
}
