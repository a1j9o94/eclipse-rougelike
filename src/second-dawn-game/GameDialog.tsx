import { type ReactNode } from 'react';
import NativeDialog from './NativeDialog';
import './presentationSettings.css';
export interface GameDialogProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  dismissOnBackdrop?: boolean;
  closeLabel?: string;
  className?: string;
  focusPrimary?: boolean;
}
export default function GameDialog({
  title,
  onClose,
  children,
  dismissOnBackdrop = true,
  closeLabel,
  className = '',
  focusPrimary = false,
}: GameDialogProps) {
  return (
    <NativeDialog
      title={title}
      onClose={onClose}
      dismissOnBackdrop={dismissOnBackdrop}
      focusPrimary={focusPrimary}
      backdropClassName="sd-app dg-settings-backdrop dg-recovery-backdrop"
      panelClassName={`dg-presentation-settings dg-game-controls ${className}`}
    >
      {(close) => (
        <>
          <header>
            <h2>{title}</h2>
            <button onClick={close} aria-label={closeLabel ?? `Close ${title.toLowerCase()}`}>
              ×
            </button>
          </header>
          {children}
        </>
      )}
    </NativeDialog>
  );
}
