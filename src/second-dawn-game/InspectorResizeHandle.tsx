import { useLayoutEffect, useRef, useState, type RefObject } from 'react';

const minWidth = 300;
const maxWidth = 560;
const keyStep = 32;

export default function InspectorResizeHandle({ layout }: { layout: RefObject<HTMLDivElement | null> }) {
  const handle = useRef<HTMLDivElement>(null);
  const drag = useRef<{ pointerId: number; startX: number; width: number } | null>(null);
  const [currentWidth, setCurrentWidth] = useState(360);

  useLayoutEffect(() => {
    const panel = handle.current?.parentElement;
    if (!panel) return;
    const measure = () => { if (panel.offsetWidth) setCurrentWidth(panel.offsetWidth); };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(panel);
    return () => observer.disconnect();
  }, []);

  const resize = (next: number) => {
    const width = Math.max(minWidth, Math.min(maxWidth, next));
    layout.current?.style.setProperty('--dg-inspector-width', `${width}px`);
    setCurrentWidth(width);
  };
  const reset = () => layout.current?.style.removeProperty('--dg-inspector-width');

  return <div
    ref={handle}
    className="dg-inspector-resize"
    role="separator"
    aria-label="Resize details panel"
    aria-description="Use the Left and Right arrow keys to resize, or Enter to reset."
    aria-controls="sector-details"
    aria-orientation="vertical"
    aria-valuemin={minWidth}
    aria-valuemax={maxWidth}
    aria-valuenow={currentWidth}
    tabIndex={0}
    onPointerDown={event => {
      if (event.button !== 0 || drag.current) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      drag.current = { pointerId: event.pointerId, startX: event.clientX, width: currentWidth };
    }}
    onPointerMove={event => {
      if (drag.current?.pointerId === event.pointerId) {
        resize(drag.current.width + drag.current.startX - event.clientX);
      }
    }}
    onLostPointerCapture={() => { drag.current = null; }}
    onDoubleClick={reset}
    onKeyDown={event => {
      if (event.key === 'ArrowLeft') resize(currentWidth + keyStep);
      else if (event.key === 'ArrowRight') resize(currentWidth - keyStep);
      else if (event.key === 'Home') resize(minWidth);
      else if (event.key === 'End') resize(maxWidth);
      else if (event.key === 'Enter') reset();
      else return;
      event.preventDefault();
      event.stopPropagation();
    }}
  />;
}
