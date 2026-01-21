'use client';

import { useEffect, useRef, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import CryptoJS from 'crypto-js';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { SliderCaptchaDialog } from '@/components/slider-captcha-dialog';
import { TermsAgreementCheckbox } from '@/components/terms-agreement-checkbox';
import { toast } from '@/components/toast';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

const RegisterFormSchema = z
  .object({
    email: z.string().email({
      message: '请输入有效的邮箱地址',
    }),
    password: z
      .string()
      .min(6, {
        message: '密码长度至少为6位',
      })
      .regex(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]*$/, {
        message: '密码必须包含字母和数字',
      }),
    confirmPassword: z.string().min(6, {
      message: '确认密码长度至少为6位',
    }),
    code: z.string().min(6, {
      message: '验证码长度至少为6位',
    }),
    agreeToTerms: z.boolean().refine((val) => val === true, {
      message: '请阅读并同意用户协议',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: '两次输入的密码不一致',
    path: ['confirmPassword'],
  });

type RegisterFormValues = z.infer<typeof RegisterFormSchema>;

export default function Page() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const form = useForm<RegisterFormValues>({
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      code: '',
      agreeToTerms: false,
    },
    resolver: zodResolver(RegisterFormSchema),
    mode: 'onChange',
  });

  const {
    formState: { errors, isValid },
    watch,
  } = form;
  const email = watch('email');

  const handleSendEmailCaptcha = async () => {
    try {
      // 直接调用API路由发送邮件验证码
      const response = await fetch('/api/proxy/captcha/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          purpose: 'register',
          email: form.watch('email'),
        }),
        credentials: 'include',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'send_email_captcha_failed');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast({ type: 'error', description: `发送失败：${message}` });
    }
  };

  const handleRegister = async (values: RegisterFormValues) => {
    if (!values.email || !values.password || !values.code) {
      toast({ type: 'error', description: '请填写邮箱、密码、验证码和滑动拼图' });
      return;
    }
    if (!values.agreeToTerms) {
      toast({ type: 'error', description: '请阅读并同意用户协议' });
      return;
    }
    try {
      const verifyResponse = await fetch('/api/proxy/captcha/email/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: values.code,
          purpose: 'register',
        }),
      });

      const verifyResult = await verifyResponse.json();

      if (!verifyResponse.ok) {
        throw new Error(verifyResult.error || '邮箱验证失败');
      }

      const registerResponse = await fetch('/api/proxy/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: values.email,
          password: CryptoJS.MD5(values.password).toString(),
        }),
      });

      const registerResult = await registerResponse.json();

      if (!registerResponse.ok) {
        throw new Error(registerResult.error || '注册失败');
      }
      toast({
        type: 'success',
        description: '注册成功！',
      });
      router.push('/login');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast({ type: 'error', description: `注册失败：${message}` });
    }
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleRegister)} className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="text-2xl font-bold">欢迎注册</h1>
            <p className="text-muted-foreground text-sm text-balance">请填写邮箱、设置密码并输入验证码以完成注册</p>
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
              name="code"
              render={({ field }) => (
                <div className="grid gap-3">
                  <FormLabel className="font-normal text-zinc-600 dark:text-zinc-400">验证码：</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <Input type="text" {...field} className="flex-1" placeholder="请输入验证码" />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="whitespace-nowrap"
                        disabled={countdown > 0 || !!errors.email || !email}
                        onClick={() => {
                          setOpen(true);
                        }}
                      >
                        {countdown > 0 ? `重新发送(${countdown}s)` : '获取验证码'}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </div>
              )}
            />
            <FormField
              name="password"
              render={({ field }) => (
                <div className="grid gap-3">
                  <FormLabel className="font-normal text-zinc-600 dark:text-zinc-400">密码：</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} placeholder="请输入密码" />
                  </FormControl>
                  <FormMessage />
                </div>
              )}
            />
            <FormField
              name="confirmPassword"
              render={({ field }) => (
                <div className="grid gap-3">
                  <FormLabel className="font-normal text-zinc-600 dark:text-zinc-400">确认密码：</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} placeholder="请再次输入密码" />
                  </FormControl>
                  <FormMessage />
                </div>
              )}
            />
            <TermsAgreementCheckbox control={form.control} name="agreeToTerms" />
          </div>
          <Button type="submit" className="w-full">
            注册
          </Button>
          <div className="text-center text-sm text-muted-foreground mt-4">
            已有账号？
            <Link href="/login" className="text-primary underline">
              立即登录
            </Link>
          </div>
        </form>
      </Form>
      <SliderCaptchaDialog
        purpose="register"
        open={open}
        onOpenChange={setOpen}
        title="请拖动滑块完成拼图以继续发送验证码"
        onSuccess={async () => {
          // 1. 设置倒计时
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          setCountdown(60);
          timerRef.current = setInterval(() => {
            setCountdown((prev) => {
              if (prev <= 1) {
                if (timerRef.current) {
                  clearInterval(timerRef.current);
                  timerRef.current = null;
                }
                return 0;
              }
              return prev - 1;
            });
          }, 1000);

          // 2. 发送邮件验证码（现在会自动携带验证码Cookie）
          await handleSendEmailCaptcha();
        }}
      />
    </>
  );
}
