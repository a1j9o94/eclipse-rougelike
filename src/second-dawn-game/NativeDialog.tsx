import { useCallback, useLayoutEffect, useRef, type ReactNode } from 'react';
import './nativeDialog.css';

interface NativeDialogProps {
  title: string;
  onClose: () => void;
  backdropClassName: string;
  panelClassName: string;
  dismissOnBackdrop?: boolean;
  focusPrimary?: boolean;
  children: (close: () => void) => ReactNode;
}

/** The browser owns modality and keyboard navigation; React owns whether it is mounted. */
export default function NativeDialog({
  title,
  onClose,
  backdropClassName,
  panelClassName,
  dismissOnBackdrop = false,
  focusPrimary = false,
  children,
}: NativeDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const callback = useRef(onClose),
    notified = useRef(false),
    backdropPress = useRef(false);
  useLayoutEffect(() => {
    callback.current = onClose;
  }, [onClose]);
  const notify = useCallback(() => {
    if (notified.current) return;
    notified.current = true;
    callback.current();
  }, []);
  const close = useCallback(() => {
    const dialog = ref.current;
    if (!dialog?.open) return;
    dialog.close();
    notify();
  }, [notify]);
  useLayoutEffect(() => {
    const dialog = ref.current!;
    notified.current = false;
    // A cleanup close event can arrive after StrictMode has reopened this element.
    const closed = () => {
      if (!dialog.open) notify();
    };
    const cancelled = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      close();
    };
    dialog.addEventListener('close', closed);
    dialog.addEventListener('cancel', cancelled);
    dialog.showModal();
    const primary = focusPrimary
      ? dialog.querySelector<HTMLElement>('.dg-primary:not(:disabled)')
      : null;
    (primary ?? dialog).focus();
    return () => {
      dialog.removeEventListener('close', closed);
      dialog.removeEventListener('cancel', cancelled);
      if (dialog.open) dialog.close();
    };
  }, [close, notify, focusPrimary]);
  // Stop bubbling Escape without preventing the native cancel action.
  return (
    <dialog
      ref={ref}
      className={`dg-native-dialog ${backdropClassName}`}
      aria-label={title}
      aria-modal="true"
      tabIndex={-1}
      onKeyDown={(event) => {
        if (event.key === 'Escape') event.stopPropagation();
      }}
      onPointerDown={(event) => {
        backdropPress.current = event.target === event.currentTarget;
      }}
      onPointerUp={(event) => {
        backdropPress.current = backdropPress.current && event.target === event.currentTarget;
      }}
      onPointerCancel={() => {
        backdropPress.current = false;
      }}
      onClick={(event) => {
        if (dismissOnBackdrop && backdropPress.current && event.target === event.currentTarget)
          close();
        backdropPress.current = false;
      }}
    >
      <section className={panelClassName}>{children(close)}</section>
    </dialog>
  );
}
