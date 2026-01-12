'use client';

import { forwardRef, useImperativeHandle, useRef, useState } from 'react';

export interface MentionInputProps {
  placeholder?: string;
  defaultValue?: string;
  onChange?: (html: string, text: string) => void;
  className?: string;
  onKeyDown?: (event: React.KeyboardEvent) => void;
  onFocusChange?: (isFocused: boolean) => void;
}

export interface MentionInputRef {
  getHTML: () => string;
  getText: () => string;
  setContent: (content: string) => void;
  focus: () => void;
  clear: () => void;
}

const MentionInput = forwardRef<MentionInputRef, MentionInputProps>((props, ref) => {
  const { placeholder = '', defaultValue = '', onChange, className = '', onKeyDown, onFocusChange } = props;

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState(defaultValue);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    if (onChange) {
      onChange(newValue, newValue);
    }
  };

  const handleFocus = () => {
    if (onFocusChange) {
      onFocusChange(true);
    }
  };

  const handleBlur = () => {
    if (onFocusChange) {
      onFocusChange(false);
    }
  };

  useImperativeHandle(ref, () => ({
    getHTML: () => value,
    getText: () => value,
    setContent: (content: string) => setValue(content),
    focus: () => textareaRef.current?.focus(),
    clear: () => setValue(''),
  }));

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={onKeyDown}
      placeholder={''}
      className={`${className} w-full resize-none bg-transparent text-xs p-2 transition-colors focus:outline-none dark:text-white`}
      rows={2}
    />
  );
});

MentionInput.displayName = 'MentionInput';

export default MentionInput;
