import './structureSilhouette.css';

export type StructureKind = 'warp-portal' | 'monolith' | 'orbital' | 'shrine';
/** Physical sector pieces. Shared geometry stays recognizable from cards down to map markers. */
export default function StructureSilhouette({kind, className = ''}: {kind: StructureKind; className?: string}) {
  return <svg width="96" height="96" viewBox="0 0 96 96" aria-hidden="true" className={`dg-structure-silhouette dg-structure-${kind} ${className}`} data-structure={kind}>
    <g strokeLinecap="round" strokeLinejoin="round">
      {kind === 'warp-portal' ? <>
        <path className="dg-structure-shadow" d="M24 82q24-10 48 0l-9 6H33Z"/>
        <path className="dg-structure-body" fillRule="evenodd" d="M48 8c19 0 29 18 29 36S67 80 48 80 19 62 19 44 29 8 48 8Zm0 13c-12 0-18 12-18 23s6 23 18 23 18-12 18-23-6-23-18-23Z"/>
        <path className="dg-structure-face" d="M48 8c19 0 29 18 29 36S67 80 48 80v-6c16 0 23-15 23-30S64 14 48 14Z"/>
        <ellipse className="dg-structure-aperture" cx="48" cy="44" rx="17" ry="22"/>
        <path className="dg-structure-light" d="M48 24c-10 0-16 10-16 20s6 20 16 20"/>
        <path className="dg-structure-detail" d="M48 9v10 M21 44h8 M67 44h8 M30 17l7 8 M59 64l7 8 M29 70l7-8 M59 24l7-8"/>
        <path className="dg-structure-body" d="m31 75-7 8h48l-7-8-9 4H40Z"/>
        <path className="dg-structure-light" d="M39 82h18"/>
      </> : kind === 'monolith' ? <>
        <path className="dg-structure-shadow" d="m17 79 33-11 30 12-30 12Z"/>
        <path className="dg-structure-body" d="m25 74 25-9 22 9v9l-23 7-24-8Z"/>
        <path className="dg-structure-face" d="m25 74 24 8 23-8-22-9Z"/>
        <path className="dg-structure-dark" d="M32 19 54 9l13 9v58l-20 7-15-9Z"/>
        <path className="dg-structure-face" d="m32 19 15 9 20-10-13-9Z"/>
        <path className="dg-structure-body" d="m32 19 15 9v55l-15-9Z"/>
        <path className="dg-structure-edge" d="M47 28v55 M32 19l15 9 20-10"/>
        <path className="dg-structure-detail" d="m54 39 6-3 M54 47l6-3 M54 55l6-3"/>
      </> : kind === 'shrine' ? <>
        <path className="dg-structure-shadow" d="m14 77 34-12 34 12-34 15Z"/>
        <path className="dg-structure-body" d="m20 70 28-10 28 10v11L48 90 20 81Z"/>
        <path className="dg-structure-face" d="m20 70 28-10 28 10-28 11Z"/>
        <path className="dg-structure-dark" d="m28 63 20-8 20 8v9l-20 8-20-8Z"/>
        <path className="dg-structure-body" d="M48 10 63 30v25L48 68 33 55V30Z"/>
        <path className="dg-structure-face" d="M48 10 33 30v25l15 13Z"/>
        <path className="dg-structure-edge" d="M33 30h30 M48 10v58 M33 55l15-7 15 7"/>
        <path className="dg-structure-light" d="M48 31v15"/>
      </> : <>
        <path className="dg-structure-shadow" d="M10 58q38 27 76 0v7q-38 28-76 0Z"/>
        <path className="dg-structure-body" d="M25 35 12 29 5 46l13 6Z M71 35l13-6 7 17-13 6Z"/>
        <path className="dg-structure-detail" d="m14 33-6 13 M20 35l-6 13 M82 33l6 13 M76 35l6 13"/>
        <path className="dg-structure-body" fillRule="evenodd" d="M48 24c22 0 38 14 38 29S70 82 48 82 10 68 10 53s16-29 38-29Zm0 10c-16 0-27 9-27 19s11 19 27 19 27-9 27-19-11-19-27-19Z"/>
        <path className="dg-structure-face" d="M10 53c0 15 16 29 38 29s38-14 38-29v-5c-1 15-17 27-38 27S11 63 10 48Z"/>
        <path className="dg-structure-edge" d="M14 48c4-11 17-20 34-20s30 9 34 20"/>
        <path className="dg-structure-body" d="M44 32h8v21h-8Z M19 51h58v6H19Z M45 54h6v20h-6Z"/>
        <path className="dg-structure-dark" d="m48 39 12 8v13l-12 7-12-7V47Z"/>
        <path className="dg-structure-face" d="m36 47 12-8 12 8-12 7Z"/>
        <path className="dg-structure-edge" d="M48 54v13"/>
        <path className="dg-structure-light" d="M43 48h10 M25 67l7 4 M64 71l7-4"/>
      </>}
    </g>
  </svg>;
}
