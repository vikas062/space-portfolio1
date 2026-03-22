import { useEffect, useRef } from 'react';

/**
 * FullscreenParticles
 * A fixed-position HTML5 canvas that draws drifting dust particles
 * across the entire viewport, behind all UI content.
 * Pass `color` (hex string) and optional `burstTrigger` (increments to trigger explosion).
 */
export default function FullscreenParticles({ color = '#aa77ff', burstTrigger = 0 }) {
  const canvasRef = useRef(null);
  const burstRef  = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    const COUNT  = 180;
    let animId;

    // Parse the hex color to rgb for canvas use
    function hexToRgb(hex) {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return { r, g, b };
    }
    const rgb = hexToRgb(color);

    // Resize canvas to fill viewport
    function resize() {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    // Build particles
    const particles = Array.from({ length: COUNT }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: 1 + Math.random() * 2.5,
      dx: (Math.random() - 0.5) * 0.4,
      dy: -(0.15 + Math.random() * 0.35),
      opacity: 0.2 + Math.random() * 0.5,
      // burst velocity
      bvx: 0, bvy: 0,
      phase: Math.random() * Math.PI * 2,
    }));

    let explosionTime = null;
    let prevBurst = burstRef.current;

    function draw(ts) {
      const now = ts / 1000;

      // Detect new burst
      if (burstRef.current !== prevBurst) {
        prevBurst = burstRef.current;
        explosionTime = now;
        // Collapse to center and assign outward burst velocities
        particles.forEach(p => {
          p.x = canvas.width  / 2 + (Math.random() - 0.5) * 80;
          p.y = canvas.height / 2 + (Math.random() - 0.5) * 80;
          const angle = Math.random() * Math.PI * 2;
          const spd   = 2 + Math.random() * 6;
          p.bvx = Math.cos(angle) * spd;
          p.bvy = Math.sin(angle) * spd;
        });
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const since  = explosionTime !== null ? now - explosionTime : 9999;
      const burst  = since < 3.0;
      const decay  = burst ? Math.exp(-since * 1.4) : 0;

      particles.forEach(p => {
        // Movement
        if (burst) {
          p.x += p.bvx * decay;
          p.y += p.bvy * decay;
        }
        // Ambient drift (always active)
        p.x += p.dx + Math.sin(now * 0.5 + p.phase) * 0.3;
        p.y += p.dy;

        // Wrap around screen edges
        if (p.y < -10)                p.y = canvas.height + 10;
        if (p.x < -10)                p.x = canvas.width  + 10;
        if (p.x > canvas.width  + 10) p.x = -10;

        // Draw glowing dot
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
        grd.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},${p.opacity})`);
        grd.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();
      });

      animId = requestAnimationFrame(draw);
    }

    animId = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [color]); // re-init when color changes

  // Watch burstTrigger from outside and forward to the draw loop
  useEffect(() => {
    burstRef.current = burstTrigger;
  }, [burstTrigger]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    />
  );
}
