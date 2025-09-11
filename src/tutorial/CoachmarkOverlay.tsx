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
    <div className="fixed inset-0 z-[60] p-3 bg-black/60">
      <div className="mx-auto max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl p-4 shadow-2xl">
        {title && <div className="text-lg font-semibold mb-1">{title}</div>}
        {text && <div className="text-sm opacity-90">{text}</div>}
        <div className="mt-3 flex gap-2 justify-end">
          {onSkip && <button onClick={onSkip} className="px-3 py-2 rounded-xl bg-zinc-700">Skip</button>}
          {onNext && <button onClick={onNext} className="px-3 py-2 rounded-xl bg-emerald-600">Next</button>}
        </div>
      </div>
    </div>
  )
}

