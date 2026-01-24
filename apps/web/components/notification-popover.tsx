'use client';

import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useInAppNotification } from '@/hooks/use-in-app-notification';
import { NotificationList, NotificationItem } from './notification-list';

export function NotificationPopover() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, isConnected } = useInAppNotification();

  const unreadNotifications = notifications.filter((n) => !n.isRead);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] rounded-full"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
          {isConnected && (
             <span className="absolute bottom-1 right-1 h-2 w-2 bg-green-500 rounded-full border-2 border-background" title="Connected" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <Card className="border-0 shadow-none">
          <CardHeader className="p-4 pb-2 border-b flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Notifications</CardTitle>
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-auto px-2 text-xs text-muted-foreground hover:text-primary"
                onClick={markAllAsRead}
              >
                Mark all read
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <Tabs defaultValue="all" className="w-full">
              <div className="border-b px-4">
                <TabsList className="h-9 w-full justify-start bg-transparent p-0">
                  <TabsTrigger 
                    value="all"
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-9 px-4 text-xs"
                  >
                    All
                  </TabsTrigger>
                  <TabsTrigger 
                    value="unread"
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-9 px-4 text-xs"
                  >
                    Unread ({unreadCount})
                  </TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="all" className="m-0 border-none">
                <NotificationList isEmpty={notifications.length === 0}>
                  {notifications.map((n) => (
                    <NotificationItem 
                      key={n.id}
                      title={n.title}
                      content={n.content}
                      time={new Date(n.createdAt).toLocaleString()}
                      isRead={n.isRead}
                      onClick={() => !n.isRead && markAsRead(n.id)}
                      onDelete={() => deleteNotification(n.id)}
                    />
                  ))}
                </NotificationList>
              </TabsContent>
              
              <TabsContent value="unread" className="m-0 border-none">
                <NotificationList isEmpty={unreadNotifications.length === 0} emptyMessage="No unread notifications">
                  {unreadNotifications.map((n) => (
                    <NotificationItem 
                      key={n.id}
                      title={n.title}
                      content={n.content}
                      time={new Date(n.createdAt).toLocaleString()}
                      isRead={n.isRead}
                      onClick={() => markAsRead(n.id)}
                      onDelete={() => deleteNotification(n.id)}
                    />
                  ))}
                </NotificationList>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}
