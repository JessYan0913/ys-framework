export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 bg-[#f0f2f5] dark:bg-zinc-950">
      <div className="w-full max-w-md">
        <div className="flex flex-col gap-6 p-8 md:p-12 items-center justify-center bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 shadow-sm dark:shadow-none rounded-2xl">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>
    </div>
  );
}
