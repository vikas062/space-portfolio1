import React, { useEffect, useRef, useState } from 'react';
import { ReactLenis } from 'lenis/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import HeroSequence from './components/HeroSequence';
import OverlayNav from './components/OverlayNav';
import SkillsSection from './components/SkillsSection';
import ProjectsSection from './components/ProjectsSection';
import CertificationsSection from './components/CertificationsSection';
import AchievementsSection from './components/AchievementsSection';
import ContactSection from './components/ContactSection';

gsap.registerPlugin(ScrollTrigger);

/* ── Floating WhatsApp Button ─────────────────────────────────────── */
if (typeof document !== 'undefined' && !document.getElementById('wa-kf')) {
  const s = document.createElement('style'); s.id = 'wa-kf';
  s.textContent = `
    @keyframes waPulse{0%{transform:scale(1);opacity:.5}70%{transform:scale(1.55);opacity:0}100%{transform:scale(1.55);opacity:0}}
    @keyframes waFadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  `;
  document.head.appendChild(s);
}

function WhatsAppButton() {
  const [hovered, setHovered] = useState(false);
  const WA_NUMBER = '918112480820'; // with country code, no +
  const WA_MSG    = encodeURIComponent("Hi Vikas! I came across your portfolio and would love to connect.");
  const href      = `https://wa.me/${WA_NUMBER}?text=${WA_MSG}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999,
        display: 'flex', alignItems: 'center', gap: '.7rem',
        padding: hovered ? '.7rem 1.2rem .7rem .85rem' : '.7rem',
        background: 'rgba(10,12,20,.82)',
        border: `1px solid ${hovered ? 'rgba(37,211,102,.45)' : 'rgba(255,255,255,.1)'}`,
        borderRadius: 999,
        backdropFilter: 'blur(14px)',
        textDecoration: 'none',
        boxShadow: hovered
          ? '0 8px 32px rgba(0,0,0,.55), 0 0 0 1px rgba(37,211,102,.2)'
          : '0 4px 20px rgba(0,0,0,.4)',
        transition: 'all .28s cubic-bezier(.22,1,.36,1)',
        overflow: 'hidden',
      }}
    >
      {/* Pulse ring */}
      <span style={{
        position: 'absolute', inset: 0, borderRadius: 999,
        border: '1.5px solid rgba(37,211,102,.45)',
        animation: 'waPulse 2.4s ease-out infinite',
        pointerEvents: 'none',
      }}/>

      {/* WhatsApp SVG icon */}
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" fill="rgba(37,211,102,1)"/>
        <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.524 3.66 1.438 5.168L2 22l4.978-1.413A9.953 9.953 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.182a8.16 8.16 0 01-4.162-1.138l-.299-.178-3.094.878.878-3.003-.195-.308A8.164 8.164 0 013.818 12c0-4.512 3.67-8.182 8.182-8.182 4.512 0 8.182 3.67 8.182 8.182 0 4.512-3.67 8.182-8.182 8.182z" fill="rgba(37,211,102,.7)"/>
      </svg>

      {/* Label — only shown on hover */}
      {hovered && (
        <span style={{
          fontFamily: "'Space Grotesk',sans-serif",
          fontSize: '.6rem', fontWeight: 500, letterSpacing: '.06em',
          color: 'rgba(255,255,255,.88)', whiteSpace: 'nowrap',
          animation: 'waFadeIn .2s ease forwards',
        }}>
          Chat on WhatsApp
        </span>
      )}
    </a>
  );
}

function App() {
  const lenisRef = useRef(null);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  useEffect(() => {
    function update(time) {
      const lenis = lenisRef.current?.lenis;
      if (!lenis) return;
      lenis.raf(time * 1000);
    }
    gsap.ticker.add(update);
    gsap.ticker.lagSmoothing(0); // required for Lenis — prevents GSAP frame catch-up jitter
    // Sync ScrollTrigger with Lenis scroll position
    const syncST = () => ScrollTrigger.update();
    lenisRef.current?.lenis?.on('scroll', syncST);
    return () => {
      gsap.ticker.remove(update);
      lenisRef.current?.lenis?.off('scroll', syncST);
    };
  }, []);

  return (
    <ReactLenis root ref={lenisRef} autoRaf={false} options={{
      lerp: isMobile ? 1 : 0.1,
      duration: isMobile ? 0 : 1.0,
      smoothWheel: !isMobile,
      smoothTouch: false,       // never intercept touch — mobile scroll must be native
      touchMultiplier: 0,       // no touch amplification
      wheelMultiplier: 1.0,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    }}>
      <div className="app-container">
        <OverlayNav />
        <div style={{ position: 'relative' }}>
          <HeroSequence />
        </div>
        <SkillsSection />
        <ProjectsSection />
        <AchievementsSection />
        <CertificationsSection />
        <ContactSection />
        {/* Global WhatsApp float */}
        <WhatsAppButton />
      </div>
    </ReactLenis>
  );
}

export default App;

