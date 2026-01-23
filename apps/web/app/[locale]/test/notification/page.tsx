'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface Notification {
  id: string;
  userId: string;
  title: string;
  content: string;
  type?: string;
  isRead: boolean;
  createdAt: string;
  data?: any;
}

export default function NotificationTestPage() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [userId, setUserId] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [formData, setFormData] = useState({
    title: 'Test Notification',
    content: 'This is a test message',
    userId: '', // Target User ID
  });

  const connect = () => {
    if (!userId) {
      toast.error('Please enter User ID');
      return;
    }

    // Connect to the API server
    const newSocket = io('http://localhost:3002', {
      query: { userId },
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      toast.success('Connected to Notification Server');
      fetchNotifications();
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      toast.error('Disconnected');
    });

    newSocket.on('notification', (payload: string) => {
      try {
        const notification = JSON.parse(payload);
        toast.info(`New Notification: ${notification.title}`);
        setNotifications((prev) => [notification, ...prev]);
      } catch (e) {
        console.error('Failed to parse notification', e);
      }
    });

    setSocket(newSocket);
  };

  const disconnect = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
    }
  };

  const fetchNotifications = async () => {
    if (!userId) return;
    try {
      const res = await fetch(`http://localhost:3001/notifications/user/${userId}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setNotifications(data);
      }
    } catch (error) {
      console.error('Failed to fetch notifications', error);
      toast.error('Failed to fetch notifications');
    }
  };

  const sendNotification = async () => {
    try {
      const targetUserId = formData.userId || userId; // Default to self if empty
      const res = await fetch('http://localhost:3001/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: targetUserId,
          title: formData.title,
          content: formData.content,
        }),
      });
      
      if (res.ok) {
        toast.success('Notification sent!');
      } else {
        toast.error('Failed to send');
      }
    } catch (error) {
      toast.error('Error sending notification');
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await fetch(`http://localhost:3001/notifications/${id}/read`, {
        method: 'POST',
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (error) {
      toast.error('Failed to mark as read');
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold">In-App Notification Test</h1>
      
      <Card className="p-4 space-y-4">
        <h2 className="text-xl font-semibold">Connection</h2>
        <div className="flex gap-4 items-center">
          <Input 
            placeholder="Enter User ID (UUID)" 
            value={userId} 
            onChange={(e) => setUserId(e.target.value)}
            disabled={isConnected}
          />
          {!isConnected ? (
            <Button onClick={connect}>Connect</Button>
          ) : (
            <Button variant="destructive" onClick={disconnect}>Disconnect</Button>
          )}
        </div>
        <div className="text-sm">
          Status: <span className={isConnected ? 'text-green-500' : 'text-red-500'}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </Card>

      <Card className="p-4 space-y-4">
        <h2 className="text-xl font-semibold">Send Notification</h2>
        <div className="grid gap-4">
          <Input 
            placeholder="Target User ID (Leave empty for self)" 
            value={formData.userId} 
            onChange={(e) => setFormData({...formData, userId: e.target.value})}
          />
          <Input 
            placeholder="Title" 
            value={formData.title} 
            onChange={(e) => setFormData({...formData, title: e.target.value})}
          />
          <Input 
            placeholder="Content" 
            value={formData.content} 
            onChange={(e) => setFormData({...formData, content: e.target.value})}
          />
          <Button onClick={sendNotification}>Send</Button>
        </div>
      </Card>

      <Card className="p-4 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Notifications</h2>
          <Button variant="outline" onClick={fetchNotifications} disabled={!isConnected}>Refresh</Button>
        </div>
        <div className="space-y-2">
          {notifications.map((n) => (
            <div key={n.id} className={`p-4 border rounded flex justify-between items-center ${n.isRead ? 'bg-gray-100' : 'bg-white'}`}>
              <div>
                <div className="font-bold">{n.title} <span className="text-xs font-normal text-gray-500">({n.type})</span></div>
                <div className="text-sm">{n.content}</div>
                <div className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleString()}</div>
              </div>
              {!n.isRead && (
                <Button size="sm" variant="ghost" onClick={() => markAsRead(n.id)}>Mark Read</Button>
              )}
            </div>
          ))}
          {notifications.length === 0 && <div className="text-gray-500 text-center">No notifications</div>}
        </div>
      </Card>
    </div>
  );
}
