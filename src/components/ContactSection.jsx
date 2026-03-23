import React, { useRef, useEffect, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/* ─── Load fonts ─── */
if (typeof document !== 'undefined' && !document.getElementById('contact-font')) {
  const l = document.createElement('link'); l.id = 'contact-font'; l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@300;400&family=Inter:wght@300;400&display=swap';
  document.head.appendChild(l);
}

/* ─── Contact data ─── */
const CONTACTS = [
  { id:1, label:'LinkedIn',   value:'vikassingh62',             href:'https://www.linkedin.com/in/vikassingh62',  sym:'in' },
  { id:2, label:'GitHub',     value:'vikas062',                 href:'https://github.com/vikas062',               sym:'gh' },
  { id:3, label:'Email',      value:'vikassinghgkp6@gmail.com', href:'mailto:vikassinghgkp6@gmail.com',           sym:'@'  },
  { id:5, label:'Instagram',  value:'vikas_singh_.62',          href:'https://instagram.com/vikas_singh_.62',     sym:'ig' },
  { id:6, label:'Reddit',     value:'vikas_singh_.62',          href:'https://reddit.com/user/vikas_singh_.62',   sym:'r/' },
];

/* ─── Contact Card ─── */
function ContactCard({ contact }) {
  const [hovered, setHovered] = useState(false);
  return (
    <a
      href={contact.href}
      target="_blank"
      rel="noopener noreferrer"
      className="contact-card"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '1.4rem',
        padding: '1.4rem 1.8rem',
        background: hovered ? 'rgba(255,255,255,.07)' : 'rgba(255,255,255,.03)',
        border: `1px solid ${hovered ? 'rgba(255,255,255,.22)' : 'rgba(255,255,255,.09)'}`,
        borderRadius: 6,
        textDecoration: 'none',
        transition: 'all 0.22s ease',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        cursor: 'pointer',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      {/* Symbol */}
      <span style={{
        fontFamily: "'JetBrains Mono',monospace",
        fontSize: '.78rem', fontWeight: 400,
        color: hovered ? 'rgba(255,255,255,.85)' : 'rgba(255,255,255,.6)',
        minWidth: 28, textAlign: 'center',
        transition: 'color .22s',
      }}>{contact.sym}</span>

      {/* Divider */}
      <div style={{ width: 1, height: 32, background: hovered ? 'rgba(255,255,255,.18)' : 'rgba(255,255,255,.08)', flexShrink: 0 }}/>

      {/* Label + Value */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{
          fontFamily: "'Space Grotesk',sans-serif",
          fontSize: '.48rem', fontWeight: 500, letterSpacing: '.22em', textTransform: 'uppercase',
          color: 'rgba(255,255,255,.7)', marginBottom: '.3rem',
        }}>{contact.label}</div>
        <div style={{
          fontFamily: "'JetBrains Mono',monospace",
          fontSize: '.72rem', fontWeight: 300,
          color: hovered ? '#fff' : 'rgba(255,255,255,.85)',
          transition: 'color .22s',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{contact.value}</div>
      </div>

      {/* Arrow */}
      <span style={{
        fontFamily: "'Space Grotesk'",
        fontSize: '.7rem', color: hovered ? 'rgba(255,255,255,.6)' : 'rgba(255,255,255,.15)',
        transition: 'all .22s', transform: hovered ? 'translate(2px,-2px)' : 'translate(0,0)',
        flexShrink: 0,
      }}>↗</span>
    </a>
  );
}

/* ─── Main ─── */
export default function ContactSection() {
  const secRef   = useRef();
  const titleRef = useRef();
  const subRef   = useRef();
  const gridRef  = useRef();

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(titleRef.current,
        { opacity: 0, y: 60, filter: 'blur(12px)' },
        { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.4, ease: 'power4.out',
          scrollTrigger: { trigger: titleRef.current, start: 'top 85%', toggleActions: 'play none none reverse' }
        }
      );
      gsap.fromTo(subRef.current,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out', delay: 0.2,
          scrollTrigger: { trigger: subRef.current, start: 'top 85%', toggleActions: 'play none none reverse' }
        }
      );
      const cards = gridRef.current?.querySelectorAll('.contact-card');
      if (cards) {
        gsap.fromTo(cards,
          { opacity: 0, y: 50, scale: 0.92 },
          { opacity: 1, y: 0, scale: 1, duration: 0.9, ease: 'power3.out', stagger: 0.1,
            scrollTrigger: { trigger: gridRef.current, start: 'top 82%', toggleActions: 'play none none reverse' }
          }
        );
      }
    }, secRef);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={secRef}
      id="section-contact"
      style={{
        position: 'relative', width: '100vw', minHeight: '100vh',
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '10rem 4vw 6rem',
      }}
    >
      {/* ── Full-bleed grayscale photo background ── */}
      <img
        src="/profile.jpg"
        alt=""
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'cover',
          objectPosition: 'center 20%',
          filter: 'grayscale(1)',
          opacity: 0.38,
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      />

      {/* Dark overlay — ensures text legibility */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to bottom, #000 0%, rgba(0,0,0,.55) 40%, rgba(0,0,0,.75) 80%, #000 100%)',
        pointerEvents: 'none',
      }}/>

      {/* Top fade from previous section */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '18vh',
        background: 'linear-gradient(to bottom, #00000a 0%, transparent 100%)',
        pointerEvents: 'none', zIndex: 5,
      }}/>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 960, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>

          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'.8rem', marginBottom:'1.8rem' }}>
            <div style={{ width:'2rem', height:1, background:'rgba(255,255,255,.18)' }}/>
            <span style={{
              fontFamily:"'JetBrains Mono',monospace", fontSize:'.5rem', fontWeight:300,
              color:'rgba(255,255,255,.88)', letterSpacing:'.4em', textTransform:'uppercase',
            }}>Contact</span>
            <div style={{ width:'2rem', height:1, background:'rgba(255,255,255,.18)' }}/>
          </div>

          <h2 ref={titleRef} style={{
            fontFamily:"'Space Grotesk',sans-serif",
            fontSize:'clamp(3rem,7vw,6rem)',
            fontWeight:700, letterSpacing:'-.05em', color:'#fff',
            lineHeight:.88, margin:'0 0 1.4rem',
          }}>
            <span style={{ fontWeight:200, color:'rgba(255,255,255,.75)' }}>Let's&nbsp;</span>Connect
          </h2>

          <p ref={subRef} style={{
            fontFamily:"'Inter',sans-serif",
            fontSize:'clamp(.85rem,1.2vw,1rem)', fontWeight:300,
            color:'rgba(255,255,255,.75)', lineHeight:1.8,
            maxWidth:360, margin:'0 auto',
            letterSpacing:'.01em',
          }}>
            Open to collaborations, freelance work, and interesting conversations.
          </p>
        </div>

        {/* Contact grid */}
        <div ref={gridRef} style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '.8rem',
        }}>
          {CONTACTS.map((c, i) => <ContactCard key={c.id} contact={c} index={i} />)}
        </div>

        {/* Footer */}
        <div style={{ marginTop:'4rem', textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap:'.8rem' }}>
          <div style={{ width:1, height:40, background:'linear-gradient(to bottom,rgba(255,255,255,.15),transparent)' }}/>
          <span style={{
            fontFamily:"'JetBrains Mono',monospace", fontSize:'.42rem', fontWeight:300,
            color:'rgba(255,255,255,.18)', letterSpacing:'.3em', textTransform:'uppercase',
          }}>Vikas Singh · {new Date().getFullYear()}</span>
        </div>
      </div>

      {/* Bottom vignette */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 120,
        background: 'linear-gradient(to bottom, transparent, #000)',
        pointerEvents: 'none', zIndex: 5,
      }}/>
    </section>
  );
}
