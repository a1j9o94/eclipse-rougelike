// React import not required with modern JSX transform
export default function CoachmarkOverlay({
  visible,
  title,
  text,
  onNext,
  onSkip,
}: {
  visible: boolean
  title?: string
  text?: string
  onNext?: () => void
  onSkip?: () => void
}){
  if (!visible) return null
  return (
    <div className="fixed inset-0 z-[80] p-3 bg-black/70 backdrop-blur-sm pointer-events-none">
      <div className="mx-auto max-w-md bg-zinc-950/95 border border-zinc-700 rounded-2xl p-5 shadow-2xl text-zinc-100 pointer-events-auto">
        {title && <div className="text-lg font-semibold mb-2">{title}</div>}
        {text && <div className="text-sm leading-relaxed">{text}</div>}
        <div className="mt-4 flex gap-2 justify-end">
          {onSkip && <button onClick={onSkip} className="px-3 py-2 rounded-xl bg-zinc-700 hover:bg-zinc-600">Skip</button>}
          {onNext && <button onClick={onNext} className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500">Next</button>}
        </div>
      </div>
    </div>
  )
}
