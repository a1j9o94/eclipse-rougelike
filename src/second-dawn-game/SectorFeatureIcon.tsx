import {SECTOR_FEATURE_PATHS} from './sectorFeaturePaths';
export default function SectorFeatureIcon({kind}:{kind:keyof typeof SECTOR_FEATURE_PATHS}){
 return <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" className={`dg-sector-feature-icon dg-sector-feature-${kind}`}><path d={SECTOR_FEATURE_PATHS[kind]} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>;
}
