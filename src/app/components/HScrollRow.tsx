import { useRef, useCallback, useEffect } from 'react';

interface HScrollRowProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  gap?: number;
  paddingX?: number;
}

/**
 * Horizontal scroll row — Android WebView compatible.
 *
 * Touch strategy:
 *  - Native touch listeners detect direction after 12px threshold.
 *  - Once direction is locked as HORIZONTAL → e.preventDefault() always called.
 *    This automatically suppresses the subsequent `click` event (browser standard).
 *  - didTouchScroll ref is also set → used in onClickCapture as belt-and-suspenders.
 *  - Vertical direction → don't prevent → bubbles to parent pan-y container natively.
 *
 * Click strategy (for cards using onClick):
 *  - Taps with no/tiny movement → touchmove never fires → click fires normally ✓
 *  - Horizontal scroll → e.preventDefault() in touchmove → click suppressed ✓
 *  - onClickCapture as extra safety → suppresses any leaked click after scroll ✓
 *
 * Mouse drag (desktop):
 *  - JS-managed drag-to-scroll with didDrag detection → suppresses click if dragged.
 */
export function HScrollRow({ children, className = '', style, gap = 12, paddingX = 20 }: HScrollRowProps) {
  const ref = useRef<HTMLDivElement>(null);

  /* ── Mouse drag state ── */
  const isDragging      = useRef(false);
  const startX          = useRef(0);
  const scrollLeftStart = useRef(0);
  const didDrag         = useRef(false);

  /* ── Touch direction detection ── */
  const touchStartX     = useRef(0);
  const touchStartY     = useRef(0);
  const touchScrollStart = useRef(0);
  const touchDirection  = useRef<'h' | 'v' | null>(null);
  // Tracks whether a horizontal scroll happened this touch sequence.
  // Used by onClickCapture as belt-and-suspenders click suppression.
  const didTouchScroll  = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      touchStartX.current      = e.touches[0].clientX;
      touchStartY.current      = e.touches[0].clientY;
      touchScrollStart.current = el.scrollLeft;
      touchDirection.current   = null;
      didTouchScroll.current   = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      const dx    = e.touches[0].clientX - touchStartX.current;
      const dy    = e.touches[0].clientY - touchStartY.current;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      // Lock direction after 12px threshold.
      // 12px >> natural tap jitter (2-4px) → avoids false horizontal detection on taps.
      if (!touchDirection.current && (absDx > 12 || absDy > 12)) {
        touchDirection.current = absDx > absDy ? 'h' : 'v';
      }

      if (touchDirection.current === 'h') {
        // ALWAYS preventDefault once direction is confirmed as horizontal.
        // This does two things:
        //   1. Prevents the parent from also scrolling vertically.
        //   2. Suppresses the subsequent `click` event (browser standard behavior).
        e.preventDefault();
        el.scrollLeft = touchScrollStart.current - dx;
        didTouchScroll.current = true;
      }
      // Vertical direction → don't prevent → parent pan-y container handles it natively.
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove',  onTouchMove,  { passive: false });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove',  onTouchMove);
    };
  }, []);

  /* ── Mouse handlers (desktop only) ── */
  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return;
    const el = ref.current;
    if (!el) return;
    isDragging.current    = true;
    didDrag.current       = false;
    startX.current        = e.clientX;
    scrollLeftStart.current = el.scrollLeft;
    el.style.cursor       = 'grabbing';
    el.style.userSelect   = 'none';
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current || e.pointerType !== 'mouse' || !ref.current) return;
    const dx = e.clientX - startX.current;
    if (Math.abs(dx) > 6) didDrag.current = true;
    ref.current.scrollLeft = scrollLeftStart.current - dx;
  }, []);

  const onPointerUpCapture = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return;
    const el = ref.current;
    if (!el) return;
    if (isDragging.current && didDrag.current) e.stopPropagation();
    isDragging.current   = false;
    el.style.cursor      = 'grab';
    el.style.userSelect  = '';
  }, []);

  const onPointerLeave = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return;
    isDragging.current = false;
    if (ref.current) {
      ref.current.style.cursor     = 'grab';
      ref.current.style.userSelect = '';
    }
  }, []);

  const onClickCapture = useCallback((e: React.MouseEvent) => {
    // Mouse drag suppression (desktop)
    if (didDrag.current) {
      e.stopPropagation();
      e.preventDefault();
      didDrag.current = false;
      return;
    }
    // Touch horizontal scroll suppression (Android belt-and-suspenders).
    // e.preventDefault() in touchmove already suppresses click in Chrome/WebView,
    // but this catches any edge cases where it leaked through.
    if (didTouchScroll.current) {
      e.stopPropagation();
      e.preventDefault();
      didTouchScroll.current = false;
    }
  }, []);

  return (
    <div
      ref={ref}
      className={`no-scrollbar ${className}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUpCapture={onPointerUpCapture}
      onPointerLeave={onPointerLeave}
      onClickCapture={onClickCapture}
      style={{
        display: 'flex',
        gap: `${gap}px`,
        paddingLeft: `${paddingX}px`,
        paddingRight: `${paddingX}px`,
        paddingBottom: '4px',
        overflowX: 'scroll',
        overflowY: 'visible',
        cursor: 'grab',
        // pan-y: browser handles vertical scroll natively.
        // Horizontal scroll is managed by JS (touchmove listener above).
        touchAction: 'pan-y',
        WebkitOverflowScrolling: 'touch',
        ...style,
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
}
