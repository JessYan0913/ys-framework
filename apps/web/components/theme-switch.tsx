'use client';

import { useEffect, useState } from 'react';

import { MoonIcon, SunIcon } from 'lucide-react';
import { useTheme } from 'next-themes';

import { Label } from './ui/label';
import { Switch } from './ui/switch';

export function ThemeSwitch() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // 避免水合不匹配
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <SunIcon className="size-4" />
      <Switch
        id="theme-switch"
        checked={theme === 'dark'}
        onCheckedChange={(checked) => {
          setTheme(checked ? 'dark' : 'light');
        }}
      />
      <Label htmlFor="theme-switch" className="cursor-pointer">
        <MoonIcon className="size-4" />
      </Label>
    </div>
  );
}
