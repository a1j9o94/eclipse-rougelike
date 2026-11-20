import type { ReactNode } from 'react';
import type { Technology } from '../../shared/eclipse/technologies';
import TechnologyStats from './TechnologyStats';
import { describeTechnology } from './itemDescriptions';
import './researchedTechnologies.css';

type Props = {
  technology: Technology;
  children?: ReactNode;
  inspection?: { onClick: () => void; selected: boolean; label: string };
};

export default function OwnedTechnologyCard({ technology, children, inspection }: Props) {
  const content = <><strong>{technology.name}</strong><TechnologyStats technology={technology}/>{children}</>;
  if (inspection) {
    return <button type="button" className="dg-owned-tile" aria-label={inspection.label} aria-pressed={inspection.selected} onClick={inspection.onClick}>{content}</button>;
  }
  return <article className="dg-owned-tile" aria-label={technology.name}>{content}<p>{describeTechnology(technology)}</p></article>;
}
