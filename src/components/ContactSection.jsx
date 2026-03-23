import React, { useRef, useEffect, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

if (typeof document !== 'undefined' && !document.getElementById('contact-font')) {
  const l = document.createElement('link'); l.id = 'contact-font'; l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@200;300;400;700&family=JetBrains+Mono:wght@300;400&display=swap';
  document.head.appendChild(l);
}

const CONTACTS = [
  { id:1, label:'LinkedIn',   value:'vikassingh62',             href:'https://www.linkedin.com/in/vikassingh62'  },
  { id:2, label:'GitHub',     value:'vikas062',                 href:'https://github.com/vikas062'               },
  { id:3, label:'Email',      value:'vikassinghgkp6@gmail.com', href:'mailto:vikassinghgkp6@gmail.com'           },
  { id:4, label:'Instagram',  value:'vikas_singh_.62',          href:'https://instagram.com/vikas_singh_.62'     },
  { id:5, label:'Reddit',     value:'vikas_singh_.62',          href:'https://reddit.com/user/vikas_singh_.62'   },
];

function Handle({ c }) {
  const [hov, setHov] = useState(false);
  return (
    <a
      href={c.href} target="_blank" rel="noopener noreferrer"
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display:'flex', flexDirection:'column', gap:'0.25rem',
        textDecoration:'none', flex:1, minWidth:0,
        padding:'1.2rem 1.5rem',
        background: hov ? 'rgba(255,255,255,0.06)' : 'transparent',
        transition:'background .18s',
      }}
    >
      <span style={{
        fontFamily:"'JetBrains Mono',monospace",
        fontSize:'0.65rem', letterSpacing:'.2em', textTransform:'uppercase',
        color: hov ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.28)',
        transition:'color .18s', whiteSpace:'nowrap',
      }}>{c.label} ↗</span>
      <span style={{
        fontFamily:"'Space Grotesk',sans-serif",
        fontSize:'1.1rem', fontWeight:400,
        color: hov ? '#fff' : 'rgba(255,255,255,0.62)',
        transition:'color .18s',
        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
      }}>{c.value}</span>
    </a>
  );
}

export default function ContactSection() {
  const secRef    = useRef();
  const panelRef  = useRef();

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(panelRef.current,
        { opacity:0, y:60 },
        { opacity:1, y:0, duration:1.2, ease:'power3.out',
          scrollTrigger:{ trigger:secRef.current, start:'top 80%', toggleActions:'play none none reverse' }
        }
      );
    }, secRef);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={secRef}
      id="section-contact"
      style={{
        position:'relative', width:'100vw', height:'100vh',
        overflow:'hidden', background:'#000',
      }}
    >
      {/* ── Full-screen grayscale face ── */}
      <img
        src="/profile.jpg"
        alt="Vikas Singh"
        style={{
          position:'absolute', inset:0,
          width:'100%', height:'100%',
          objectFit:'cover',
          objectPosition:'center 12%',
          filter:'grayscale(1) contrast(1.08) brightness(0.88)',
          opacity:0.72,
          pointerEvents:'none',
        }}
      />

      {/* Very light bottom fade — just enough so text at bottom edge reads */}
      <div style={{
        position:'absolute', inset:0, pointerEvents:'none',
        background:'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.38) 100%)',
      }}/>

      {/* Top edge fade */}
      <div style={{
        position:'absolute', top:0, left:0, right:0, height:'14vh',
        background:'linear-gradient(to bottom,#00000a,transparent)',
        pointerEvents:'none', zIndex:2,
      }}/>

      {/* ── Bottom panel — text directly on photo ── */}
      <div ref={panelRef} style={{
        position:'absolute', bottom:0, left:0, right:0, zIndex:10,
        borderTop:'1px solid rgba(255,255,255,0.1)',
      }}>

        {/* Heading row */}
        <div style={{
          padding:'2rem 5vw 1.2rem',
          display:'flex', alignItems:'flex-end', justifyContent:'space-between',
          flexWrap:'wrap', gap:'0.8rem',
          borderBottom:'1px solid rgba(255,255,255,0.06)',
        }}>
          <h2 style={{
            fontFamily:"'Space Grotesk',sans-serif",
            fontSize:'clamp(2rem,5vw,4rem)',
            fontWeight:700, letterSpacing:'-.05em',
            color:'#fff', lineHeight:1, margin:0,
          }}>
            <span style={{ fontWeight:200, color:'rgba(255,255,255,0.6)' }}>Let's&nbsp;</span>Connect
          </h2>
          <p style={{
            fontFamily:"'Space Grotesk',sans-serif",
            fontSize:'clamp(.78rem,1vw,.88rem)', fontWeight:300,
            color:'rgba(255,255,255,0.42)', lineHeight:1.6, margin:0,
            maxWidth:300,
          }}>
            Open to collaborations,<br/>freelance &amp; interesting conversations.
          </p>
        </div>

        {/* Handles row */}
        <div style={{ display:'flex', alignItems:'stretch' }}>
          {CONTACTS.map((c, i) => (
            <React.Fragment key={c.id}>
              {i > 0 && <div style={{ width:1, background:'rgba(255,255,255,0.06)', margin:'0.6rem 0', flexShrink:0 }}/>}
              <Handle c={c} />
            </React.Fragment>
          ))}
          {/* Copyright */}
          <div style={{ width:1, background:'rgba(255,255,255,0.06)', margin:'0.6rem 0', flexShrink:0 }}/>
          <div style={{
            display:'flex', alignItems:'center',
            padding:'1.2rem 1.6rem', flexShrink:0,
          }}>
            <span style={{
              fontFamily:"'JetBrains Mono',monospace",
              fontSize:'0.6rem', letterSpacing:'.25em', textTransform:'uppercase',
              color:'rgba(255,255,255,0.18)',
            }}>© {new Date().getFullYear()}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
