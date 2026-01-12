import Form from 'next/form';

import { signOut } from '@/lib/auth';
import { useScopedI18n } from '@/locales/client';

export const SignOutForm = () => {
  const t = useScopedI18n('user');
  return (
    <Form
      className="w-full"
      action={async () => {
        'use server';

        await signOut({
          redirectTo: '/',
        });
      }}
    >
      <button type="submit" className="w-full px-1 py-0.5 text-left text-red-500">
        {t('signOut')}
      </button>
    </Form>
  );
};
