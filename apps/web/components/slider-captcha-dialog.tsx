'use client';

import { useCallback, useRef } from 'react';

import { DialogClose } from '@radix-ui/react-dialog';
import { Cross2Icon } from '@radix-ui/react-icons';
import SliderCaptcha, { type VerifyParam } from 'rc-slider-captcha';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export type SliderCaptchaDialogProps = {
  // Optional controlled open state
  open?: boolean;
  onOpenChange?: (open: boolean) => void;

  // Optional trigger element to open the dialog
  trigger?: React.ReactNode;

  // UI text
  title?: string;
  description?: string;

  // SliderCaptcha tipText configuration
  tipText?: {
    default?: React.ReactNode;
    loading?: React.ReactNode;
    moving?: React.ReactNode;
    verifying?: React.ReactNode;
    success?: React.ReactNode;
    error?: React.ReactNode;
    errors?: React.ReactNode;
    loadFailed?: React.ReactNode;
  };

  // Handlers
  onSuccess?: (data: { id: string; token: string }) => void | Promise<void>;
  onFailure?: (error: unknown) => void | Promise<void>;

  // ClassName passthrough
  className?: string;

  // Required captcha purpose
  purpose: string;
};

/**
 * A reusable confirmation dialog that embeds rc-slider-captcha for human verification.
 * Use it anywhere you can use the existing AlertDialog API.
 */
export function SliderCaptchaDialog({
  open,
  onOpenChange: externalOnOpenChange,
  trigger,
  title = '请完成安全验证',
  description = '为了您的账户安全，请拖动滑块完成拼图。',
  tipText,
  onSuccess,
  onFailure,
  className,
  purpose,
}: SliderCaptchaDialogProps) {
  const expectedXRef = useRef<number | null>(null);
  const captchaIdRef = useRef<string | null>(null);
  const generatedWidthRef = useRef<number>(360); // 与 createPuzzle 的 bgWidth 保持一致
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const actionRef = useRef<any>(null);
  const requestPromiseRef = useRef<Promise<{ bgUrl: string; puzzleUrl: string } | null> | null>(null); // 共享 Promise 防止双重请求并同步结果

  // When verification succeeds, show success then close after a short delay
  const handleVerify = async (data: VerifyParam) => {
    try {
      if (!captchaIdRef.current) throw new Error('captcha_id_not_found');

      // 直接调用API路由验证
      const payload = {
        id: captchaIdRef.current,
        x: data?.x,
        y: data?.y,
        sliderOffsetX: data?.sliderOffsetX,
        duration: data?.duration,
        trail: data?.trail,
      };

      const response = await fetch('/api/captcha/image/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        credentials: 'include',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'verify_failed');
      }

      await onSuccess?.({ id: result.id, token: result.token });
      // Delay closing so user can see success feedback
      setTimeout(() => {
        internalOnOpenChange(false);
      }, 1200);
      return Promise.resolve();
    } catch (err) {
      await onFailure?.(err);
      // 失败后清空 expected，等待刷新重新生成
      expectedXRef.current = null;
      return Promise.reject(err);
    }
  };

  // 内部 onOpenChange 处理重置状态
  const internalOnOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        // 关闭时重置所有状态，允许下次打开重新生成
        requestPromiseRef.current = null;
        expectedXRef.current = null;
        captchaIdRef.current = null;
      }
      externalOnOpenChange?.(newOpen);
    },
    [externalOnOpenChange],
  );

  return (
    <Dialog open={open} onOpenChange={internalOnOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className={`max-w-[480px] p-0 overflow-hidden ${className || ''}`}>
        <DialogClose asChild>
          <button
            aria-label="关闭"
            className="absolute right-4 top-4 z-10 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
          >
            <Cross2Icon className="size-4" />
          </button>
        </DialogClose>

        <div className="bg-gradient-to-br from-muted to-muted-foreground/10 p-6 rounded-t-lg">
          <DialogHeader className="text-center space-y-2">
            <DialogTitle className="text-xl font-semibold text-foreground">{title}</DialogTitle>
            <DialogDescription className="text-muted-foreground">{description}</DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 bg-card">
          <div ref={wrapperRef} className="flex justify-center">
            <div className="relative rounded-md overflow-hidden">
              <SliderCaptcha
                precision={0}
                bgSize={{ width: 420, height: 200 }}
                actionRef={actionRef}
                tipText={{
                  default: '请拖动滑块完成拼图',
                  loading: '正在加载...',
                  moving: '',
                  verifying: '正在验证...',
                  success: '验证成功！',
                  error: '验证失败，请重试',
                  errors: '失败次数过多，请刷新',
                  loadFailed: '图片加载失败，请刷新',
                  ...tipText,
                }}
                request={useCallback(async () => {
                  // 如果已有正在进行的请求，等待其完成并返回相同结果（处理 StrictMode 双重 mount）
                  if (requestPromiseRef.current) {
                    console.log('Request awaiting existing promise'); // 开发调试日志
                    return await requestPromiseRef.current;
                  }

                  // 创建新的 Promise
                  const promise = (async () => {
                    try {
                      // 直接调用API路由创建验证码
                      const response = await fetch('/api/captcha/image/create', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          purpose,
                          bgWidth: 420,
                          bgHeight: 200,
                          width: 60,
                          height: 60,
                        }),
                      });

                      const result = await response.json();

                      if (!response.ok) {
                        throw new Error(result.error || 'captcha_create_failed');
                      }

                      if (typeof result.id === 'string') {
                        captchaIdRef.current = result.id;
                      } else {
                        captchaIdRef.current = null;
                      }
                      generatedWidthRef.current = 360;
                      return { bgUrl: result.bgUrl, puzzleUrl: result.puzzleUrl } as any;
                    } catch (error) {
                      requestPromiseRef.current = null; // 失败时重置
                      throw error;
                    }
                  })();

                  requestPromiseRef.current = promise;
                  try {
                    return await promise;
                  } finally {
                    // 无论成功或失败，都在完成后重置 promise（但失败已在 catch 中处理）
                    if (promise === requestPromiseRef.current) {
                      requestPromiseRef.current = null;
                    }
                  }
                }, [purpose])}
                onVerify={handleVerify}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
