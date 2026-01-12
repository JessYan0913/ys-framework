import { forwardRef, type HTMLProps } from 'react';

import { cn } from '@/lib/utils';

export type ToolbarProps = {
  dense?: boolean;
  vertical?: boolean;
} & HTMLProps<HTMLDivElement>;

const Toolbar = forwardRef<HTMLDivElement, ToolbarProps>(
  ({ children, dense, vertical = false, className, ...rest }, ref) => {
    const toolbarClassName = cn(
      'flex items-center flex-row flex-wrap gap-y-1.5 gap-x-1 p-1.5',
      dense && 'p-0.5',
      vertical && 'flex-col',
      className,
    );

    return (
      <div className={toolbarClassName} {...rest} ref={ref}>
        {children}
      </div>
    );
  },
);

Toolbar.displayName = 'Toolbar';

export type ToolbarDividerProps = {
  horizontal?: boolean;
} & HTMLProps<HTMLDivElement>;

const ToolbarDivider = forwardRef<HTMLDivElement, ToolbarDividerProps>(({ horizontal, className, ...rest }, ref) => {
  const dividerClassName = cn(
    'border-0 border-solid border-r border-r-border w-px h-5 mx-1 flex-shrink-0',
    horizontal && 'border-r-0 border-b border-b-border w-full h-px my-1',
    className,
  );

  return <div className={dividerClassName} ref={ref} {...rest} />;
});

ToolbarDivider.displayName = 'ToolbarDivider';

export type ToolbarGroupProps = HTMLProps<HTMLDivElement>;

const ToolbarGroup = forwardRef<HTMLDivElement, ToolbarGroupProps>(({ children, className, ...rest }, ref) => {
  const groupClassName = cn('flex items-center gap-0.5', className);

  return (
    <div className={groupClassName} {...rest} ref={ref}>
      {children}
    </div>
  );
});

ToolbarGroup.displayName = 'ToolbarGroup';

export { Toolbar, ToolbarDivider, ToolbarGroup };
