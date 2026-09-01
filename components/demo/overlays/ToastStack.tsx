'use client';

import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { useOS } from '@/lib/demo/osStore';
import type { ToastType } from '@/lib/demo/types';

const ICON: Record<ToastType, typeof Info> = {
  success: CheckCircle2,
  error: XCircle,
  warn: AlertTriangle,
  info: Info,
};

const TONE: Record<ToastType, string> = {
  success: 'var(--line-green)',
  error: 'var(--line-scarlet)',
  warn: 'var(--line-amber)',
  info: 'var(--line-cobalt)',
};

/** Service announcements. */
export function ToastStack() {
  const toasts = useOS((s) => s.toasts);
  const dismissToast = useOS((s) => s.dismissToast);

  if (toasts.length === 0) return null;

  return (
    <div className="absolute bottom-5 right-5 z-[120] flex flex-col gap-2 items-end">
      {toasts.map((t) => {
        const Icon = ICON[t.type];
        return (
          <button
            key={t.id}
            type="button"
            className="toast"
            style={{ ['--tone' as string]: TONE[t.type] } as React.CSSProperties}
            onClick={() => dismissToast(t.id)}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" />
            <span>{t.msg}</span>
          </button>
        );
      })}
    </div>
  );
}
