import NativeDialog from './NativeDialog';
import { useDice3dEnabled, useDiceSoundEnabled, useDiceSoundVolume } from './presentationSettings';
import './presentationSettings.css';
import SoundSettingsControls from './sound/SoundSettingsControls';
export interface GameSettingsPanelProps {
  title?: string;
  motionEnabled: boolean;
  onMotionChange: (enabled: boolean) => void;
  onClose: () => void;
  onHistory?: () => void;
  onGameMenu?: () => void;
  followAi?: boolean;
  onFollowAiChange?: (enabled: boolean) => void;
  autoPass?: {
    enabled: boolean;
    paused: boolean;
    disabled: boolean;
    disabledReason?: string;
    onChange: (enabled: boolean) => void;
  };
}
export default function GameSettingsPanel({
  title = 'Preferences',
  motionEnabled,
  onMotionChange,
  onClose,
  followAi,
  onFollowAiChange,
  autoPass,
  onHistory,
  onGameMenu,
}: GameSettingsPanelProps) {
  const [dice3d, setDice3d] = useDice3dEnabled();
  const [diceSound, setDiceSound] = useDiceSoundEnabled();
  const [diceVolume, setDiceVolume] = useDiceSoundVolume();
  return (
    <NativeDialog
      title={title}
      onClose={onClose}
      dismissOnBackdrop
      backdropClassName="dg-settings-backdrop"
      panelClassName="dg-presentation-settings"
    >
      {(close) => (
        <>
          <header>
            <div>
              <small>MAKE YOURSELF AT HOME</small>
              <h2>{title}</h2>
            </div>
            <button onClick={close} aria-label="Close settings">
              ×
            </button>
          </header>
          <label>
            <span>
              <strong>3D combat dice</strong>
              <small>Dice tumble across the game screen. Turn off for instant results.</small>
            </span>
            <input
              type="checkbox"
              checked={dice3d}
              onChange={(event) => setDice3d(event.target.checked)}
            />
          </label>
          <label>
            <span>
              <strong>Animations</strong>
              <small>Movement, combat and action effects.</small>
            </span>
            <input
              type="checkbox"
              checked={motionEnabled}
              onChange={(event) => onMotionChange(event.target.checked)}
            />
          </label>
          <label>
            <span>
              <strong>Dice sounds</strong>
              <small>Hear the dice tumble and settle, even with animations off.</small>
            </span>
            <input
              type="checkbox"
              checked={diceSound}
              onChange={(event) => setDiceSound(event.target.checked)}
            />
          </label>
          <label className="dg-dice-volume">
            <span>
              <strong>Dice volume</strong>
              <small>{Math.round(diceVolume * 100)}%</small>
            </span>
            <input
              aria-label="Dice volume"
              aria-valuetext={`${Math.round(diceVolume * 100)} percent`}
              type="range"
              min={0}
              max={100}
              step={5}
              value={Math.round(diceVolume * 100)}
              disabled={!diceSound}
              onChange={(event) => setDiceVolume(Number(event.target.value) / 100)}
            />
          </label>
          <SoundSettingsControls />
          {onFollowAiChange && (
            <label>
              <span>
                <strong>Follow AI</strong>
                <small>Follow opponents’ actions as they play.</small>
              </span>
              <input
                type="checkbox"
                checked={followAi ?? true}
                onChange={(event) => onFollowAiChange(event.target.checked)}
              />
            </label>
          )}
          {autoPass && (
            <>
              <label>
                <span>
                  <strong>Auto-pass unless attacked</strong>
                  <small>
                    After passing, skip reaction turns until an opponent attacks. Saved for your
                    seat across devices.
                  </small>
                </span>
                <input
                  type="checkbox"
                  checked={autoPass.enabled}
                  disabled={autoPass.disabled}
                  onChange={(event) => autoPass.onChange(event.target.checked)}
                />
              </label>
              {autoPass.disabled && autoPass.disabledReason && <p>{autoPass.disabledReason}</p>}
              {autoPass.enabled && autoPass.paused && (
                <div className="dg-settings-auto-pass-status">
                  <p role="status">Attacked · reactions restored</p>
                  <button disabled={autoPass.disabled} onClick={() => autoPass.onChange(true)}>
                    Resume auto-pass
                  </button>
                </div>
              )}
            </>
          )}
          {dice3d && !motionEnabled && <p>Animations are off. Dice results appear instantly.</p>}
          <p>Display and sound saved in this browser · reduced motion is respected.</p>
          {(onHistory || onGameMenu) && (
            <section className="dg-settings-game-controls" aria-label="Game controls">
              <h3>Game controls</h3>
              <div className="dg-settings-game-actions">
                {onHistory && <button onClick={onHistory}>History &amp; undo</button>}
                {onGameMenu && <button onClick={onGameMenu}>Return home or resign</button>}
              </div>
            </section>
          )}
        </>
      )}
    </NativeDialog>
  );
}
