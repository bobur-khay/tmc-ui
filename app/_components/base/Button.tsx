'use client';
import { Button as HeadlessButton } from '@headlessui/react';
import React, { useEffect, useState } from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  readonly flashDurationMs?: number;
  readonly autoComplete?: 'on' | 'off';
  text?: string;
  variant?: 'plain' | 'outlined' | 'solid';
  size?: 'sm' | 'md' | 'lg';
}

const BUTTON_SIZE_STYLES = {
  sm: 'px-2.5 py-1.5 text-xs',
  md: 'px-3 py-2 text-sm',
  lg: 'px-4 py-3 text-base',
} as const;

const BUTTON_VARIANT_STYLES = {
  plain:
    'border-transparent bg-transparent text-interactive-primary data-hover:not-data-[flashing]:bg-surface-input-hover data-hover:not-data-[flashing]:text-interactive-hover data-[flashing]:text-interactive-pressed',
  outlined:
    'border-border-interactive bg-transparent text-interactive-primary data-hover:not-data-[flashing]:border-border-interactive-hover data-hover:not-data-[flashing]:bg-surface-input-hover data-hover:not-data-[flashing]:text-interactive-hover data-[flashing]:border-border-interactive-pressed data-[flashing]:text-interactive-pressed',
  solid:
    'border-transparent bg-interactive-primary text-text-inverse-strong data-hover:not-data-[flashing]:bg-interactive-hover data-[flashing]:bg-interactive-pressed',
} as const;

const Button: React.FC<ButtonProps> = ({
  flashDurationMs = 150,
  text,
  children,
  variant = 'plain',
  size = 'md',
  disabled = false,
  className,
  onClick,
  ...rest
}) => {
  const [isFlashing, setIsFlashing] = useState(false);

  useEffect(() => {
    if (!isFlashing) return;

    const timeoutId = window.setTimeout(() => {
      setIsFlashing(false);
    }, flashDurationMs);

    return () => window.clearTimeout(timeoutId);
  }, [isFlashing, flashDurationMs]);

  return (
    <HeadlessButton
      {...rest}
      disabled={disabled}
      data-flashing={isFlashing ? '' : undefined}
      className={[
        "before:border-focus-ring relative inline-flex cursor-pointer items-center gap-1 rounded-xs border font-medium before:pointer-events-none before:absolute before:-top-0.75 before:-right-0.75 before:-bottom-0.75 before:-left-0.75 before:rounded-sm before:border before:opacity-0 before:content-[''] focus-visible:outline-none focus-visible:before:opacity-100 disabled:cursor-default disabled:opacity-50",
        BUTTON_SIZE_STYLES[size],
        BUTTON_VARIANT_STYLES[variant],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={(event) => {
        setIsFlashing(true);
        onClick?.(event);
      }}
    >
      {children ?? text}
    </HeadlessButton>
  );
};

export default Button;
