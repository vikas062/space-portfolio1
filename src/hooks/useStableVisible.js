import { useState, useEffect, useRef } from 'react';

/**
 * Like useInView but with a delay before going false.
 * Prevents Canvas flicker during GSAP pin transitions while still
 * pausing rendering when the section is truly offscreen.
 *
 * @param {React.RefObject} ref  - ref to observe
 * @param {string} margin        - IntersectionObserver rootMargin
 * @param {number} offDelay      - ms to wait before setting false (default 1500)
 */
export function useStableVisible(ref, margin = '300px 0px', offDelay = 1500) {
  const [visible, setVisible] = useState(true); // start true so canvas mounts immediately
  const timer = useRef(null);

  useEffect(() => {
    const el = ref?.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setVisible(true); // fallback: always render
      return;
    }

    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        clearTimeout(timer.current);
        setVisible(true);
      } else {
        // Delay turning off — covers brief exits during GSAP pin activate/deactivate
        timer.current = setTimeout(() => setVisible(false), offDelay);
      }
    }, { rootMargin: margin, threshold: 0 });

    obs.observe(el);
    return () => { obs.disconnect(); clearTimeout(timer.current); };
  }, [ref, margin, offDelay]);

  return visible;
}
