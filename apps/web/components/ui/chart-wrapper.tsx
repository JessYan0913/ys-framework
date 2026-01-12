import type React from 'react';

import { cn } from '@/lib/utils';

interface ChartWrapperProps {
  title?: string;
  subtitle?: string;
  footerText?: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

export function ChartWrapper({ title, subtitle, footerText, className, style, children }: ChartWrapperProps) {
  return (
    <div className={cn('flex flex-col w-full', className)} style={style}>
      {(title || subtitle) && (
        <div className="mb-4">
          {title && <h3 className="text-lg font-semibold">{title}</h3>}
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      )}

      <div className="flex-1">{children}</div>

      {footerText && <div className="mt-2 text-xs text-muted-foreground">{footerText}</div>}
    </div>
  );
}
