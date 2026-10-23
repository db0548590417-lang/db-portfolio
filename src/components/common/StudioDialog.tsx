import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export function StudioDialog({ open, onClose, titleId, children }: { open: boolean; onClose: () => void; titleId: string; children: React.ReactNode }) {
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusables = () => [...(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select, textarea, [tabindex="0"]') || [])].filter(element => element.getClientRects().length);
    const frame = requestAnimationFrame(() => (focusables()[0] || panel.current)?.focus());
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close.current(); }
      if (event.key !== 'Tab') return;
      const items = focusables();
      const first = items[0]; const last = items.at(-1);
      if (!first) { event.preventDefault(); panel.current?.focus(); }
      else if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { cancelAnimationFrame(frame); document.removeEventListener('keydown', onKey); document.body.style.overflow = previousOverflow; previous?.isConnected && previous.focus(); };
  }, [open]);
  if (!open) return null;
  return createPortal(<div className="studio-dialog fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm" dir="rtl">
    <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-3xl border border-[#45656A] bg-[#103F46] p-6 text-[#F7F8F3] shadow-2xl sm:p-8">{children}</div>
  </div>, document.body);
}
