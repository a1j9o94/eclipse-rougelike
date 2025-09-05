
type SingleProps = {
  variant?: 'single';
  lives: number;
};

type MultiProps = {
  variant: 'multi';
  me: { name: string; lives: number };
  opponent?: { name: string; lives: number } | null;
  phase?: 'setup' | 'combat' | 'finished';
};

type Props = SingleProps | MultiProps;

export function LivesBanner(props: Props) {
  const base = 'fixed top-0 left-0 right-0 z-40 flex items-center justify-center py-2 text-sm';
  if (props.variant === 'multi') {
    const { me, opponent, phase } = props;
    return (
      <div className={`${base} bg-zinc-900/90 border-b border-zinc-700`}
           role="status" aria-label="multiplayer-status">
        <div className="flex items-center gap-4">
          <span className="px-2 py-1 rounded bg-emerald-800/40 border border-emerald-600">{me.name}: {me.lives} ❤</span>
          <span className="text-zinc-400">vs</span>
          <span className="px-2 py-1 rounded bg-amber-800/40 border border-amber-600">{opponent?.name ?? 'Waiting…'}: {opponent?.lives ?? 0} ❤</span>
          <span className="ml-2 text-xs text-zinc-400">Phase: {phase ?? 'setup'}</span>
        </div>
      </div>
    );
  }
  // single
  return (
    <div className={`${base} bg-zinc-900/90 border-b border-zinc-700`}
         role="status" aria-label="lives-remaining">
      <div className="text-zinc-200">Lives Remaining: <span className="font-semibold">{props.lives}</span></div>
    </div>
  );
}
