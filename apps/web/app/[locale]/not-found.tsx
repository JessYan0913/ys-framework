import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground overflow-hidden relative">
      {/* Background Effects */}
      <div className="absolute inset-0 size-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] size-2/5 bg-primary/5 rounded-full blur-[120px] animate-float-1" />
        <div className="absolute bottom-[-10%] right-[-10%] size-2/5 bg-blue-500/5 rounded-full blur-[120px] animate-float-2" />
      </div>

      <div className="z-10 flex flex-col items-center text-center space-y-8 px-4 animate-in fade-in zoom-in duration-500">
        {/* 404 Display */}
        <div className="relative">
          <h1 className="text-[12rem] leading-none font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-foreground/80 to-foreground/20 select-none">
            404
          </h1>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-full bg-primary/5 blur-3xl -z-10" />
        </div>

        {/* Message */}
        <div className="space-y-4 max-w-md mx-auto">
          <h2 className="text-3xl font-semibold tracking-tight">页面未找到</h2>
          <p className="text-muted-foreground text-lg">抱歉，我们找不到您要访问的页面。它可能已被移动或不存在。</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4 pt-4">
          <Button variant="default" size="lg" asChild className="rounded-full px-8">
            <Link href="/">
              <ArrowLeft className="mr-2 size-4" />
              返回首页
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
