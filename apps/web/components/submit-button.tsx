'use client';

import { useFormStatus } from 'react-dom';

import { LoaderIcon } from 'lucide-react';

import { useScopedI18n } from '@/locales/client';

import { Button } from './ui/button';

export function SubmitButton({ children, isSuccessful }: { children: React.ReactNode; isSuccessful: boolean }) {
  const { pending } = useFormStatus();
  const t = useScopedI18n('form.submit');

  return (
    <Button
      type={pending ? 'button' : 'submit'}
      aria-disabled={pending || isSuccessful}
      disabled={pending || isSuccessful}
      className="relative"
    >
      {children}

      {(pending || isSuccessful) && (
        <span className="absolute right-4 animate-spin">
          <LoaderIcon />
        </span>
      )}

      <output aria-live="polite" className="sr-only">
        {pending || isSuccessful ? t('loading') : t('default')}
      </output>
    </Button>
  );
}
