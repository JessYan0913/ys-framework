// AI related utilities

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  description?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export function createChatMessage(role: 'user' | 'assistant' | 'system', content: string): ChatMessage {
  return {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    role,
    content,
    timestamp: new Date(),
  };
}

export function createChatSession(title: string): ChatSession {
  const now = new Date();
  return {
    id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    title,
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function formatMessageTime(date: Date): string {
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatMessageDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return '今天';
  } else if (days === 1) {
    return '昨天';
  } else if (days < 7) {
    return `${days}天前`;
  } else {
    return date.toLocaleDateString('zh-CN');
  }
}
