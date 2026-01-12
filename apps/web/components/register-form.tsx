'use client';

import Link from 'next/link';
import type React from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useScopedI18n } from '@/locales/client';

export function RegisterForm({
  className,
  onSubmit,
  ...props
}: Omit<React.ComponentProps<'form'>, 'onSubmit'> & {
  onSubmit?: (formData: FormData) => void;
}) {
  const t = useScopedI18n('register.form');
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (onSubmit) {
      const formData = new FormData(e.currentTarget);
      onSubmit(formData);
    }
  };

  return (
    <form className={cn('flex flex-col gap-6', className)} onSubmit={handleSubmit} {...props}>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground text-sm text-balance">{t('subtitle')}</p>
      </div>
      <div className="grid gap-6">
        <div className="grid gap-3">
          <Label htmlFor="email">{t('email')}</Label>
          <Input id="email" name="email" type="email" placeholder="m@example.com" required />
        </div>
        <div className="grid gap-3">
          <Label htmlFor="password">{t('password')}</Label>
          <Input id="password" name="password" type="password" required />
        </div>
        <Button type="submit" className="w-full">
          {t('createButton')}
        </Button>
      </div>
      <div className="text-center text-sm">
        {t('alreadyHaveAccount')}{' '}
        <Link href="/login" className="underline underline-offset-4">
          {t('signInLink')}
        </Link>
      </div>
    </form>
  );
}
