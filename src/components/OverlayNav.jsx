import React, { useEffect, useState } from 'react';
import gsap from 'gsap';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';

gsap.registerPlugin(ScrollToPlugin);

const NAV_ITEMS = [
  { label: 'Home',           target: '#section-home' },
  { label: 'Achievements',   target: '#section-achievements' },
  { label: 'Projects',       target: '#section-projects' },
  { label: 'Skill',          target: '#section-skills' },
  { label: 'Certifications', target: '#section-certifications' },
  { label: 'Contact',        target: '#section-contact' },
];

function scrollTo(target) {
  const el = document.querySelector(target);
  if (!el) return;
  gsap.to(window, { duration: 1, scrollTo: { y: el, offsetY: 0 }, ease: 'power2.inOut' });
}

function downloadResume() {
  const link = document.createElement('a');
  link.href = '/resume.pdf';
  link.download = 'Resume.pdf';
  link.click();
}

export default function OverlayNav() {
  const [scrolled, setScrolled]         = useState(false);
  const [activeSection, setActiveSection] = useState('section-home');
  const [menuOpen, setMenuOpen]         = useState(false);
  const [isMobile, setIsMobile]         = useState(window.innerWidth <= 768);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > window.innerHeight * 0.7);
      const sections = NAV_ITEMS.map(n => n.target.replace('#', ''));
      for (let i = sections.length - 1; i >= 0; i--) {
        const el = document.getElementById(sections[i]);
        if (el && window.scrollY >= el.offsetTop - 120) {
          setActiveSection(sections[i]);
          break;
        }
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleNavClick = (target) => {
    scrollTo(target);
    setMenuOpen(false);
  };

  return (
    <>
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: isMobile ? 'flex-end' : 'center',
        gap: '0.25rem',
        height: '56px',
        padding: isMobile ? '0 1.2rem' : '0',
        background: (scrolled || menuOpen) ? 'rgba(0,0,0,0.88)' : 'transparent',
        backdropFilter: (scrolled || menuOpen) ? 'blur(14px)' : 'none',
        WebkitBackdropFilter: (scrolled || menuOpen) ? 'blur(14px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : 'none',
        opacity: (scrolled || menuOpen) ? 1 : (isMobile ? 0 : 0),
        pointerEvents: (scrolled || menuOpen) ? 'auto' : 'none',
        transition: 'opacity 0.4s ease, background 0.4s ease',
      }}>

        {/* Desktop nav links */}
        {!isMobile && NAV_ITEMS.map(({ label, target }) => {
          const isActive = activeSection === target.replace('#', '');
          return (
            <button
              key={label}
              onClick={() => handleNavClick(target)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#ffffff', fontSize: '0.92rem',
                fontFamily: 'Inter, system-ui, sans-serif',
                fontWeight: isActive ? 600 : 400,
                padding: '0.4rem 1rem', borderRadius: '6px',
                opacity: isActive ? 1 : 0.85,
                textShadow: scrolled ? 'none' : '0 1px 8px rgba(0,0,0,0.8)',
                transition: 'opacity 0.2s, background 0.2s',
                letterSpacing: '0.01em', userSelect: 'none', outline: 'none',
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = isActive ? '1' : '0.85'; e.currentTarget.style.background = 'none'; }}
            >
              {label}
            </button>
          );
        })}

        {!isMobile && (
          <>
            <span style={{ width: '1px', height: '18px', background: 'rgba(255,255,255,0.25)', margin: '0 0.4rem' }} />
            <button
              onClick={downloadResume}
              style={{
                background: 'transparent', border: '1.5px solid rgba(255,255,255,0.65)',
                cursor: 'pointer', color: '#ffffff', fontSize: '0.88rem',
                fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 500,
                padding: '0.35rem 1.1rem', borderRadius: '20px',
                transition: 'background 0.2s, color 0.2s',
                userSelect: 'none', outline: 'none', letterSpacing: '0.01em', whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = '#111111'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#ffffff'; }}
            >
              Download Resume
            </button>
          </>
        )}

        {/* Hamburger icon (mobile only) */}
        {isMobile && (
          <button
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Toggle menu"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '0.5rem', display: 'flex', flexDirection: 'column',
              gap: '5px', alignItems: 'flex-end', pointerEvents: 'auto',
            }}
          >
            {[0, 1, 2].map(i => (
              <span key={i} style={{
                display: 'block', height: '2px', background: '#fff', borderRadius: '2px',
                width: i === 1 ? '18px' : '24px',
                transform: menuOpen
                  ? (i === 0 ? 'rotate(45deg) translate(5px, 5px)' : i === 2 ? 'rotate(-45deg) translate(5px, -5px)' : 'scaleX(0)')
                  : 'none',
                transition: 'transform 0.25s ease, opacity 0.25s ease',
                opacity: menuOpen && i === 1 ? 0 : 1,
              }} />
            ))}
          </button>
        )}
      </nav>

      {/* Mobile dropdown menu */}
      {isMobile && (
        <div style={{
          position: 'fixed', top: '56px', left: 0, right: 0, zIndex: 9998,
          background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: '0.2rem', padding: menuOpen ? '1.2rem 1rem' : '0',
          maxHeight: menuOpen ? '400px' : '0',
          overflow: 'hidden',
          transition: 'max-height 0.35s ease, padding 0.35s ease',
          borderBottom: menuOpen ? '1px solid rgba(255,255,255,0.08)' : 'none',
        }}>
          {NAV_ITEMS.map(({ label, target }) => {
            const isActive = activeSection === target.replace('#', '');
            return (
              <button
                key={label}
                onClick={() => handleNavClick(target)}
                style={{
                  width: '100%', maxWidth: '280px',
                  background: isActive ? 'rgba(255,255,255,0.08)' : 'none',
                  border: 'none', cursor: 'pointer', color: '#fff',
                  fontSize: '1rem', fontWeight: isActive ? 600 : 400,
                  padding: '0.8rem 1.5rem', borderRadius: '10px',
                  textAlign: 'center', letterSpacing: '0.02em',
                }}
              >
                {label}
              </button>
            );
          })}
          <div style={{ width: '100%', maxWidth: '280px', height: '1px', background: 'rgba(255,255,255,0.08)', margin: '0.4rem 0' }} />
          <button
            onClick={() => { downloadResume(); setMenuOpen(false); }}
            style={{
              width: '100%', maxWidth: '280px',
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.3)',
              cursor: 'pointer', color: '#fff', fontSize: '0.95rem', fontWeight: 600,
              padding: '0.8rem 1.5rem', borderRadius: '10px', letterSpacing: '0.02em',
            }}
          >
            Download Resume
          </button>
        </div>
      )}
    </>
  );
}
