import React from 'react';

type SpinnerColor = 'indigo' | 'blue' | 'emerald' | 'violet' | 'orange' | 'gray';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: SpinnerColor;
  text?: string;
  fullScreen?: boolean;
}

export default function LoadingSpinner({
  size = 'medium',
  color = 'indigo',
  text,
  fullScreen = false
}: LoadingSpinnerProps) {
  const sizeClasses: Record<NonNullable<LoadingSpinnerProps['size']>, string> = {
    small: 'h-5 w-5',
    medium: 'h-10 w-10',
    large: 'h-14 w-14'
  };

  // Use text-* to color the spinner via border-current (avoids dynamic class pitfalls with Tailwind)
  const colorClasses: Record<SpinnerColor, string> = {
    indigo: 'text-indigo-600',
    blue: 'text-blue-600',
    emerald: 'text-emerald-600',
    violet: 'text-violet-600',
    orange: 'text-orange-500',
    gray: 'text-gray-600'
  };

  const spinnerCore = (
    <div
      className="flex flex-col items-center justify-center gap-3"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        className={`inline-block ${sizeClasses[size]} ${colorClasses[color]} rounded-full border-4 border-current border-t-transparent animate-spin motion-reduce:animate-none`}
      />
      {text && (
        <p className={`mt-1 text-sm font-medium text-gray-700 dark:text-gray-300 ${size === 'large' ? 'text-base' : ''}`}>
          {text}
        </p>
      )}
      <span className="sr-only">Loading…</span>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-gradient-to-br from-slate-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
        <div className="rounded-xl bg-white/85 dark:bg-gray-900/70 backdrop-blur-md p-6 shadow-xl ring-1 ring-black/5">
          {spinnerCore}
        </div>
      </div>
    );
  }

  return spinnerCore;
}
