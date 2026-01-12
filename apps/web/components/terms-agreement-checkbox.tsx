'use client';

import { Control, FieldPath, FieldValues } from 'react-hook-form';

import { Checkbox } from '@/components/ui/checkbox';
import { FormControl, FormField, FormLabel, FormMessage } from '@/components/ui/form';

interface TermsAgreementCheckboxProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> {
  control: Control<TFieldValues>;
  name: TName;
}

export function TermsAgreementCheckbox<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({ control, name }: TermsAgreementCheckboxProps<TFieldValues, TName>) {
  const openDocument = (url: string, windowName: string) => {
    const width = window.outerWidth * 0.8;
    const height = window.outerHeight * 0.8;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    const features = `
      width=${width},
      height=${height},
      top=${top},
      left=${left},
      toolbar=no,
      menubar=no,
      scrollbars=yes,
      resizable=yes,
      location=no,
      status=no
    `.replace(/\s+/g, '');
    window.open(url, windowName, features);
  };

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <div className="flex items-start gap-3">
          <FormControl>
            <Checkbox checked={field.value} onCheckedChange={field.onChange} className="mt-1" />
          </FormControl>
          <div className="flex-1">
            <FormLabel className="font-normal text-sm text-zinc-600 dark:text-zinc-400 cursor-pointer">
              我已阅读并同意
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  openDocument('/protocol/user-agreement', 'agreement');
                }}
                className="text-primary underline hover:text-primary/80 transition-colors mx-1"
              >
                用户协议
              </button>
              和
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  openDocument('/protocol/privacy-policy', 'privacy');
                }}
                className="text-primary underline hover:text-primary/80 transition-colors mx-1"
              >
                隐私政策
              </button>
            </FormLabel>
            <FormMessage />
          </div>
        </div>
      )}
    />
  );
}
