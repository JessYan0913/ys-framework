'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import CryptoJS from 'crypto-js';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { TermsAgreementCheckbox } from '@/components/terms-agreement-checkbox';
import { toast } from '@/components/toast';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { emailPasswordLogin } from '@/lib/actions/user';

const LoginFormSchema = z.object({
  email: z.string().email({
    message: '请输入有效的邮箱地址',
  }),
  password: z.string().min(1, {
    message: '请输入密码',
  }),
  agreeToTerms: z.boolean().refine((val) => val === true, {
    message: '请阅读并同意用户协议和隐私政策',
  }),
});

type LoginFormValues = z.infer<typeof LoginFormSchema>;

export default function Page() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const form = useForm<LoginFormValues>({
    defaultValues: {
      email: '',
      password: '',
      agreeToTerms: false,
    },
    resolver: zodResolver(LoginFormSchema),
    mode: 'onChange',
  });

  const emailValue = form.watch('email');
  const forgotPasswordHref = emailValue
    ? `/forgot-password?email=${encodeURIComponent(emailValue)}`
    : '/forgot-password';

  const handleLogin = async (values: LoginFormValues) => {
    if (!values.agreeToTerms) {
      toast({ type: 'error', description: '请阅读并同意用户协议和隐私政策' });
      return;
    }
    try {
      const result = await emailPasswordLogin({
        email: values.email,
        password: CryptoJS.MD5(values.password).toString(),
      });
      if (result.serverError) {
        throw new Error(result.serverError);
      }
      if (result.validationErrors) {
        throw new Error('输入参数无效');
      }
      toast({
        type: 'success',
        description: '登录成功！',
      });

      // 获取 callbackUrl 参数,如果没有则默认跳转到首页
      const callbackUrl = searchParams?.get('callbackUrl') || '/';
      router.push(callbackUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast({ type: 'error', description: `登录失败：${message}` });
    }
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleLogin)} className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="text-2xl font-bold">欢迎登录</h1>
            <p className="text-muted-foreground text-sm text-balance">请填写邮箱和密码后完成登录</p>
          </div>
          <div className="grid gap-6">
            <FormField
              name="email"
              render={({ field }) => (
                <div className="grid gap-3">
                  <FormLabel className="font-normal text-zinc-600 dark:text-zinc-400">邮箱：</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} placeholder="请输入邮箱" />
                  </FormControl>
                  <FormMessage />
                </div>
              )}
            />
            <FormField
              name="password"
              render={({ field }) => (
                <div className="grid gap-3">
                  <FormLabel className="flex items-center justify-between font-normal text-zinc-600 dark:text-zinc-400">
                    <span>密码：</span>
                    <Link href={forgotPasswordHref} className="text-sm text-primary hover:underline">
                      忘记密码？
                    </Link>
                  </FormLabel>
                  <FormControl>
                    <Input type="password" {...field} placeholder="请输入密码" />
                  </FormControl>
                  <FormMessage />
                </div>
              )}
            />
            <TermsAgreementCheckbox control={form.control} name="agreeToTerms" />
          </div>
          <Button type="submit" className="w-full">
            登录
          </Button>
          <div className="text-center text-sm text-muted-foreground mt-4">
            没有账号？
            <Link href="/register" className="text-primary underline">
              立即注册
            </Link>
          </div>
        </form>
      </Form>
    </>
  );
}
