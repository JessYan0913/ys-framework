'use client';

import * as React from 'react';

import { CalendarIcon, ChevronDownIcon, XIcon } from 'lucide-react';
import type { DateRange } from 'react-day-picker';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

type CalendarSingleProps = Omit<React.ComponentProps<typeof Calendar>, 'mode' | 'selected' | 'onSelect'>;

type CalendarRangeProps = Omit<React.ComponentProps<typeof Calendar>, 'mode' | 'selected' | 'onSelect'>;

type DatePickerProps = {
  value?: Date | null;
  onChange?: (value: Date | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  calendarProps?: CalendarSingleProps;
};

export function DatePicker({
  value,
  onChange,
  placeholder = '选择日期',
  disabled,
  className,
  calendarProps,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = React.useCallback(
    (date: Date | undefined) => {
      if (disabled) return;
      onChange?.(date ?? null);
      setOpen(false);
    },
    [disabled, onChange],
  );

  const handleClear = React.useCallback(() => {
    if (disabled) return;
    onChange?.(null);
  }, [disabled, onChange]);

  const displayText = React.useMemo(() => {
    if (!value) return placeholder;
    try {
      return value.toLocaleDateString();
    } catch (error) {
      console.error('Invalid date provided to DatePicker', error);
      return placeholder;
    }
  }, [value, placeholder]);

  return (
    <Popover open={open && !disabled} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn('h-10 w-full justify-between font-normal', !value && 'text-muted-foreground', className)}
          disabled={disabled}
        >
          <span className="truncate">{displayText}</span>
          <div className="flex items-center gap-1">
            {value && !disabled && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-destructive"
                onClick={(event) => {
                  event.stopPropagation();
                  handleClear();
                }}
              >
                <XIcon className="size-3.5" />
              </Button>
            )}
            <CalendarIcon className="size-4" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto overflow-hidden p-0" align="start">
        <Calendar
          mode="single"
          selected={value ?? undefined}
          onSelect={handleSelect}
          captionLayout="dropdown"
          initialFocus
          {...calendarProps}
        />
      </PopoverContent>
    </Popover>
  );
}

type DateRangePickerProps = {
  value?: DateRange | null;
  onChange?: (value: DateRange | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  calendarProps?: CalendarRangeProps;
};

export function DateRangePicker({
  value,
  onChange,
  placeholder = '选择日期范围',
  disabled,
  className,
  calendarProps,
}: DateRangePickerProps) {
  const handleClear = React.useCallback(() => {
    if (disabled) return;
    onChange?.(null);
  }, [disabled, onChange]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            'h-10 w-full justify-between font-normal',
            !value?.from && !value?.to && 'text-muted-foreground',
            className,
          )}
        >
          <span className="truncate">
            {value?.from && value?.to
              ? `${value.from.toLocaleDateString()} - ${value.to.toLocaleDateString()}`
              : placeholder}
          </span>
          <div className="flex items-center gap-1">
            {value && (value.from || value.to) && !disabled && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-destructive"
                onClick={(event) => {
                  event.stopPropagation();
                  handleClear();
                }}
              >
                <XIcon className="size-3.5" />
              </Button>
            )}
            <ChevronDownIcon className="size-4" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto overflow-hidden p-0" align="start">
        <Calendar
          mode="range"
          selected={value ?? undefined}
          onSelect={(range) => {
            onChange?.(range ?? null);
          }}
          numberOfMonths={2}
          {...calendarProps}
        />
      </PopoverContent>
    </Popover>
  );
}
