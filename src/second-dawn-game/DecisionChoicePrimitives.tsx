import type { ReactNode } from "react";
import type { Resource } from "../../shared/eclipse/types";
import { TradeResourceIcon } from "./TradePanel";
import "./decisionChoicePrimitives.css";

export interface ChoiceOption {
  value: string;
  label: string;
  description?: ReactNode;
  disabled?: boolean;
  visual?: ReactNode;
}

interface ChoiceCardsProps {
  label: string;
  value: string;
  options: readonly ChoiceOption[];
  disabled?: boolean;
  onChange: (value: string) => void;
  className?: string;
}

/** Keyboard-accessible, editable visual choices for persisted decision drafts. */
export function ChoiceCards({
  label,
  value,
  options,
  disabled = false,
  onChange,
  className = "",
}: ChoiceCardsProps) {
  return (
    <div className={`dg-choice-cards ${className}`} role="radiogroup" aria-label={label}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={option.label}
            className="dg-choice-card"
            disabled={disabled || option.disabled}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => {
              const keys = ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'];
              if (!keys.includes(event.key)) return;
              const enabled = options.filter(item => !item.disabled);
              if (!enabled.length) return;
              event.preventDefault();
              const index = enabled.findIndex(item => item.value === option.value);
              const next = event.key === 'Home' ? enabled[0] : event.key === 'End' ? enabled[enabled.length-1] : enabled[(index+(event.key === 'ArrowLeft'||event.key === 'ArrowUp' ? -1 : 1)+enabled.length)%enabled.length];
              onChange(next.value);
              const buttons = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="radio"]');
              buttons?.[options.findIndex(item => item.value === next.value)]?.focus();
            }}
          >
            {option.visual && <span className="dg-choice-visual" aria-hidden="true">{option.visual}</span>}
            <span><strong>{option.label}</strong>{option.description && <small>{option.description}</small>}</span>
            {selected && <b className="dg-choice-check" aria-hidden="true">✓</b>}
          </button>
        );
      })}
    </div>
  );
}

const names: Record<Resource, string> = {
  money: "Money",
  science: "Science",
  materials: "Materials",
};

export function ResourceChoiceChips({
  label,
  resources,
  value,
  disabled,
  onChange,
}: {
  label: string;
  resources: readonly Resource[];
  value: Resource;
  disabled?: boolean;
  onChange: (value: Resource) => void;
}) {
  return (
    <ChoiceCards
      className="dg-resource-choice-cards"
      label={label}
      value={value}
      disabled={disabled}
      onChange={(next) => onChange(next as Resource)}
      options={resources.map((resource) => ({
        value: resource,
        label: names[resource],
        visual: <TradeResourceIcon resource={resource} />,
      }))}
    />
  );
}

export function SectorChoiceCards(props: ChoiceCardsProps) {
  return <ChoiceCards {...props} className={`dg-sector-choice-cards ${props.className ?? ""}`} />;
}
