import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';

export default async function HomePage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <h1 className="text-3xl font-bold">欢迎回来</h1>
        <p className="text-muted-foreground">您已成功登录</p>
        <div className="pt-4">
          <p className="text-sm text-muted-foreground">
            当前用户: {session.user.email}
          </p>
        </div>
        <form
          action={async () => {
            'use server';
            const { signOut } = await import('@/lib/auth');
            await signOut({ redirectTo: '/login' });
          }}
        >
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            退出登录
          </button>
        </form>
      </div>
    </div>
  );
}
