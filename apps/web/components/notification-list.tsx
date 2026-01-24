import { cn } from '@/lib/utils';
import { ReactNode } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

// 1. 定义 Item 接口
export interface NotificationItemProps {
  title: string;
  content: string;
  time: string;
  isRead: boolean;
  onClick?: () => void;
  onDelete?: (e: React.MouseEvent) => void;
  className?: string;
}

// 2. 单个通知项组件 (纯展示)
export function NotificationItem({ 
  title, content, time, isRead, onClick, onDelete, className 
}: NotificationItemProps) {
  return (
    <div
      className={cn(
        "group relative flex flex-col gap-1 p-4 border-b transition-colors hover:bg-muted/50 cursor-pointer text-left",
        !isRead && "bg-muted/30",
        className
      )}
      onClick={onClick}
    >
      <div className="flex justify-between items-start gap-2 pr-6">
        <span className={cn("text-sm font-medium leading-none", !isRead && "font-bold")}>
          {title}
        </span>
        {!isRead && (
          <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0 mt-0.5" />
        )}
      </div>
      <p className="text-xs text-muted-foreground line-clamp-2 leading-snug">
        {content}
      </p>
      <span className="text-[10px] text-muted-foreground pt-1">
        {time}
      </span>
      
      {onDelete && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(e);
          }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

// 3. 列表容器 (处理空状态和滚动)
interface NotificationListProps {
  children: ReactNode;
  isEmpty?: boolean;
  emptyMessage?: string;
  height?: string;
}

export function NotificationList({ 
  children, 
  isEmpty, 
  emptyMessage = "No notifications", 
  height = "300px" 
}: NotificationListProps) {
  return (
    <ScrollArea className={cn("w-full", `h-[${height}]`)}>
      {isEmpty ? (
        <div className={`flex flex-col items-center justify-center h-[${height}] text-muted-foreground gap-2`}>
          <Bell className="h-8 w-8 opacity-20" />
          <span className="text-xs">{emptyMessage}</span>
        </div>
      ) : (
        <div className="flex flex-col">
          {children}
        </div>
      )}
    </ScrollArea>
  );
}
