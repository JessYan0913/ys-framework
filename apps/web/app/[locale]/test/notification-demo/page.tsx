'use client';

import { NotificationPopover } from '@/components/notification-popover';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

export default function NotificationDemoPage() {
  const { data: session } = useSession();

  const sendTestNotification = async () => {
    // @ts-ignore
    const userId = session?.user?.id;
    if (!userId) {
      toast.error('Please login first');
      return;
    }
    
    try {
       await fetch('/api/proxy/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          title: 'Demo Notification',
          content: `This is a test notification at ${new Date().toLocaleTimeString()}`,
        }),
      });
      toast.success('Sent!');
    } catch (e) {
      toast.error('Failed to send');
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between border-b pb-4">
        <h1 className="text-2xl font-bold">Notification Component Demo</h1>
        <div className="flex items-center gap-4 bg-muted/20 p-2 rounded-lg border">
           <span className="text-sm font-mono">Header Area Preview:</span>
           <NotificationPopover />
        </div>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Test Actions</h2>
        <p className="mb-4 text-muted-foreground">
          Click the button below to send a notification to yourself. 
          The bell icon above should update instantly via WebSocket.
          <br />
          You can also hover over a notification in the list to delete it.
        </p>
        <Button onClick={sendTestNotification}>
          Send Test Notification to Myself
        </Button>
      </Card>
      
      <div className="text-sm text-muted-foreground">
        Current User ID: {
            // @ts-ignore
            session?.user?.id || 'Not logged in'
        }
      </div>
    </div>
  );
}
