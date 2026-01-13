// Cron job related utilities

export interface CronExpression {
  minute: string;
  hour: string;
  dayOfMonth: string;
  month: string;
  dayOfWeek: string;
}

export interface ScheduledTask {
  id: string;
  name: string;
  description?: string;
  cronExpression: string;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export function parseCronExpression(cron: string): CronExpression {
  const parts = cron.split(' ');
  if (parts.length !== 5) {
    throw new Error('Invalid cron expression format');
  }

  return {
    minute: parts[0],
    hour: parts[1],
    dayOfMonth: parts[2],
    month: parts[3],
    dayOfWeek: parts[4],
  };
}

export function formatCronExpression(cron: string): string {
  const parts = parseCronExpression(cron);

  // 简单的中文描述
  if (
    parts.minute === '*' &&
    parts.hour === '*' &&
    parts.dayOfMonth === '*' &&
    parts.month === '*' &&
    parts.dayOfWeek === '*'
  ) {
    return '每分钟';
  }

  if (
    parts.minute === '0' &&
    parts.hour === '*' &&
    parts.dayOfMonth === '*' &&
    parts.month === '*' &&
    parts.dayOfWeek === '*'
  ) {
    return '每小时';
  }

  if (
    parts.minute === '0' &&
    parts.hour === '0' &&
    parts.dayOfMonth === '*' &&
    parts.month === '*' &&
    parts.dayOfWeek === '*'
  ) {
    return '每天';
  }

  if (
    parts.minute === '0' &&
    parts.hour === '0' &&
    parts.dayOfMonth === '1' &&
    parts.month === '*' &&
    parts.dayOfWeek === '*'
  ) {
    return '每月1号';
  }

  if (
    parts.minute === '0' &&
    parts.hour === '0' &&
    parts.dayOfMonth === '*' &&
    parts.month === '*' &&
    parts.dayOfWeek === '1'
  ) {
    return '每周一';
  }

  return cron; // 返回原始表达式
}

export function getNextRunTime(_cron: string): Date {
  // 这里应该实现真正的 cron 计算逻辑
  // 为了简化，这里返回一个示例值
  const now = new Date();
  const next = new Date(now.getTime() + 60 * 60 * 1000); // 1小时后
  return next;
}

export function createScheduledTask(name: string, cronExpression: string): ScheduledTask {
  const now = new Date();
  return {
    id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    cronExpression,
    enabled: true,
    nextRun: getNextRunTime(cronExpression),
    createdAt: now,
    updatedAt: now,
  };
}
