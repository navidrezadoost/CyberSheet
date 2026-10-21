import { useLayoutEffect, useState, type CSSProperties, type RefObject } from 'react';

export function useRibbonAnchorPosition(
  open: boolean,
  anchorRef: RefObject<HTMLElement | null>,
  deps: unknown[] = [],
): CSSProperties {
  const [style, setStyle] = useState<CSSProperties>({});

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) {
      setStyle({});
      return;
    }

    const updatePosition = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      setStyle({
        position: 'fixed',
        top: Math.round(rect.bottom + 2),
        left: Math.round(rect.left),
        minWidth: Math.round(rect.width),
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, anchorRef, ...deps]);

  return style;
}
