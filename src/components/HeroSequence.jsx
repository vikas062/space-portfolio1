import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const frameCount = 40;
const currentFrame = i => `/frames/ezgif-frame-${(i + 1).toString().padStart(3, '0')}.jpg`;

export default function HeroSequence() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const bitmapsRef = useRef([]);
  const [loaded, setLoaded] = useState(false);

  // ── Phase 1: Pre-decode ALL frames into GPU-ready ImageBitmaps ──────────────
  useEffect(() => {
    let cancelled = false;

    async function preload() {
      const bitmaps = await Promise.all(
        Array.from({ length: frameCount }, async (_, i) => {
          const res = await fetch(currentFrame(i));
          const blob = await res.blob();
          // createImageBitmap fully decodes the image OFF the main thread
          return createImageBitmap(blob);
        })
      );
      if (!cancelled) {
        bitmapsRef.current = bitmaps;
        setLoaded(true);
      }
    }

    preload();
    return () => { cancelled = true; };
  }, []);

  // ── Phase 2: Wire up GSAP only after all frames are GPU-ready ───────────────
  useEffect(() => {
    if (!loaded) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const container = containerRef.current;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
      drawFrame(lastIdx);
    };

    let lastIdx = 0;

    function drawFrame(idx) {
      const bmp = bitmapsRef.current[idx];
      if (!bmp) return;

      const ratio = Math.max(canvas.width / bmp.width, canvas.height / bmp.height);
      const x = (canvas.width  - bmp.width  * ratio) / 2;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // drawImage with ImageBitmap is ~100% GPU decoded — zero CPU decode cost!
      ctx.drawImage(bmp, 0, 0, bmp.width, bmp.height, x, 0, bmp.width * ratio, bmp.height * ratio);
      lastIdx = idx;
    }

    resize();
    window.addEventListener('resize', resize);

    const sequence = { frame: 0 };

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: container,
        start: 'top top',
        end: '+=400%', // Reduced from 600% — 2 fewer scroll lengths
        scrub: 1.5,
        pin: true,
      }
    });

    // Phase 1: Animate through the 40 frames (now mapping to a much larger scroll span)
    tl.to(sequence, {
      frame: frameCount - 1,
      snap: 'frame',
      ease: 'none',
      duration: 4,
      onUpdate() {
        const idx = Math.round(sequence.frame);
        if (idx !== lastIdx) drawFrame(idx);
      },
    })
    // Phase 2: End hold (takes 2 units of time in the timeline)
    .to({}, { duration: 2 });

    return () => {
      window.removeEventListener('resize', resize);
      tl.kill();
      ScrollTrigger.getAll().forEach(s => s.kill());
    };
  }, [loaded]);

  return (
    <div ref={containerRef} className="hero-sequence-container">
      <div className="canvas-wrapper">
        <canvas ref={canvasRef} style={{ willChange: 'transform' }} />
        <div className="gradient-overlay" />
      </div>
    </div>
  );
}
