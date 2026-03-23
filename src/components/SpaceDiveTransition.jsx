/**
 * SpaceDiveTransition.jsx
 * A scroll-driven transition that plays between Projects and Achievements.
 * As the user scrolls into this section, stars accelerate toward them
 * (classic warp/hyperspace effect) — giving the feeling of flying deeper
 * into space before arriving at the Achievements section.
 */
import React, { useRef, useEffect } from 'react';
import { useInView } from '../hooks/useInView';

const N_STARS = 500;

export default function SpaceDiveTransition() {
  const outerRef  = useRef(null);
  const canvasRef = useRef(null);
  const inViewRef = useRef(false);
  const { ref: viewRef, inView } = useInView({ rootMargin: '0px' });

  useEffect(() => { inViewRef.current = inView; }, [inView]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    let W, H, stars, raf;

    const init = () => {
      W = canvas.width  = canvas.offsetWidth;
      H = canvas.height = canvas.offsetHeight;
      const cx = W / 2;
      const cy = H / 2;
      stars = Array.from({ length: N_STARS }, () => {
        const angle  = Math.random() * Math.PI * 2;
        const radius = 1 + Math.random() * Math.min(W, H) * 0.45;
        return {
          x: cx + Math.cos(angle) * radius,
          y: cy + Math.sin(angle) * radius,
          ox: cx + Math.cos(angle) * radius,
          oy: cy + Math.sin(angle) * radius,
          cx, cy,
          alpha: 0.1 + Math.random() * 0.7,
          size:  0.5 + Math.random() * 1.2,
        };
      });
    };

    const draw = (progress) => {
      ctx.clearRect(0, 0, W, H);
      // Speed = how much each star moves toward the camera
      // At progress=0, speed very low (cruising). At 1, full warp.
      const speed = 0.8 + progress * 14; // 0.8 → 14.8

      stars.forEach(s => {
        // Move star away from center (toward viewer) based on speed
        const dx = s.ox - s.cx;
        const dy = s.oy - s.cy;
        const dist = Math.sqrt(dx*dx + dy*dy) || 1;
        const nx = s.ox + (dx / dist) * speed;
        const ny = s.oy + (dy / dist) * speed;
        s.ox = nx;
        s.oy = ny;

        // Trail line from old pos to new pos
        const stretch = 1 + progress * 8;
        const trailX  = s.ox - (dx / dist) * stretch;
        const trailY  = s.oy - (dy / dist) * stretch;

        // Alpha peaks at high warp speed
        const a = Math.min(s.alpha * (0.4 + progress * 0.9), 1);

        // Color: white at slow, blue-white at fast
        const r = Math.floor(200 + (1 - progress) * 55);
        const g = Math.floor(210 + (1 - progress) * 45);
        const b = 255;

        ctx.beginPath();
        ctx.moveTo(trailX, trailY);
        ctx.lineTo(s.ox, s.oy);
        ctx.strokeStyle = `rgba(${r},${g},${b},${a})`;
        ctx.lineWidth   = s.size * (1 + progress * 2.5);
        ctx.stroke();

        // Reset if star exits visible area
        if (s.ox < -20 || s.ox > W + 20 || s.oy < -20 || s.oy > H + 20) {
          const angle  = Math.random() * Math.PI * 2;
          const radius = 2 + Math.random() * 30;
          s.ox = s.cx + Math.cos(angle) * radius;
          s.oy = s.cy + Math.sin(angle) * radius;
          s.x  = s.ox;
          s.y  = s.oy;
        }
      });
    };

    let lastProgress = 0;
    const onScroll = () => {
      if (!outerRef.current) return;
      const rect   = outerRef.current.getBoundingClientRect();
      const total  = outerRef.current.offsetHeight - window.innerHeight;
      const scroll = Math.max(0, -rect.top);
      lastProgress = Math.min(scroll / Math.max(total, 1), 1);
    };

    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (!inViewRef.current) return;
      draw(lastProgress);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', init);
    onScroll();
    init();
    loop();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', init);
    };
  }, []);

  return (
    <div
      ref={el => { outerRef.current = el; viewRef.current = el; }}
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',         /* pinned 1-screen height — users scroll through it */
        background: '#02020c',
        overflow: 'hidden',
      }}
    >
      {/* Star-warp canvas */}
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />

      {/* Radial vignette keeps edges dark so warp looks focused */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at center, transparent 30%, rgba(2,2,12,0.92) 100%)',
      }} />

      {/* Scroll-driven text that fades OUT as warp accelerates */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
      }}>
        <span style={{
          fontFamily: 'monospace', fontSize: '0.5rem',
          color: 'rgba(255,255,255,0.18)', letterSpacing: '0.55em', textTransform: 'uppercase',
        }}>
          Entering Deep Space
        </span>
        <div style={{ width: '2rem', height: 1, background: 'rgba(255,255,255,0.1)' }} />
      </div>

      {/* Seamless fade into Achievements section below */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: '40%',
        background: 'linear-gradient(to bottom, transparent, #02020c)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: '25%',
        background: 'linear-gradient(to top, transparent, #02020c)',
        pointerEvents: 'none',
      }} />
    </div>
  );
}
