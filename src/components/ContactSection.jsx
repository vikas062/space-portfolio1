import React, { useRef, useEffect, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/* ─── Load fonts ─── */
if (typeof document !== 'undefined' && !document.getElementById('contact-font')) {
  const l = document.createElement('link'); l.id = 'contact-font'; l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@200;300;400;600;700&family=JetBrains+Mono:wght@300;400&display=swap';
  document.head.appendChild(l);
}

/* ─── Contact data ─── */
const CONTACTS = [
  { id:1, label:'LinkedIn',  value:'vikassingh62',             href:'https://www.linkedin.com/in/vikassingh62',  sym:'↗' },
  { id:2, label:'GitHub',    value:'vikas062',                 href:'https://github.com/vikas062',               sym:'↗' },
  { id:3, label:'Email',     value:'vikassinghgkp6@gmail.com', href:'mailto:vikassinghgkp6@gmail.com',           sym:'↗' },
  { id:5, label:'Instagram', value:'vikas_singh_.62',          href:'https://instagram.com/vikas_singh_.62',     sym:'↗' },
];

/* ─── Hover link ─── */
function SocialLink({ contact }) {
  const [hov, setHov] = useState(false);
  return (
    <a
      href={contact.href}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display:'flex', flexDirection:'column', gap:'0.22rem',
        textDecoration:'none', cursor:'pointer', flex: 1,
        padding: '1.1rem 1.4rem',
        transition:'background 0.2s',
        background: hov ? 'rgba(255,255,255,0.04)' : 'transparent',
        borderRadius: 4,
      }}
    >
      <span style={{
        fontFamily:"'JetBrains Mono',monospace",
        fontSize:'.42rem', fontWeight:300, letterSpacing:'.35em',
        textTransform:'uppercase',
        color: hov ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.28)',
        transition:'color 0.2s',
      }}>{contact.label}</span>
      <span style={{
        fontFamily:"'Space Grotesk',sans-serif",
        fontSize:'.75rem', fontWeight:400,
        color: hov ? '#fff' : 'rgba(255,255,255,0.65)',
        transition:'color 0.2s',
        letterSpacing:'-.01em',
      }}>{contact.value}</span>
    </a>
  );
}

/* ─── Main ─── */
export default function ContactSection() {
  const secRef   = useRef();
  const headRef  = useRef();
  const barRef   = useRef();

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(headRef.current,
        { opacity:0, y:50, filter:'blur(14px)' },
        { opacity:1, y:0, filter:'blur(0px)', duration:1.5, ease:'power4.out',
          scrollTrigger:{ trigger:headRef.current, start:'top 85%', toggleActions:'play none none reverse' } }
      );
      gsap.fromTo(barRef.current,
        { opacity:0, y:30 },
        { opacity:1, y:0, duration:1.1, ease:'power3.out', delay:0.3,
          scrollTrigger:{ trigger:barRef.current, start:'top 92%', toggleActions:'play none none reverse' } }
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
        display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center',
      }}
    >
      {/* ── Full-bleed grayscale photo ── */}
      <img
        src="/profile.jpg"
        alt=""
        aria-hidden="true"
        style={{
          position:'absolute', inset:0,
          width:'100%', height:'100%',
          objectFit:'cover',
          objectPosition:'center 18%',
          filter:'grayscale(1) contrast(1.05)',
          opacity:0.52,
          pointerEvents:'none',
          userSelect:'none',
        }}
      />

      {/* Gradient — heavy at bottom so bar reads clearly */}
      <div style={{
        position:'absolute', inset:0,
        background:'linear-gradient(to bottom, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0.18) 40%, rgba(0,0,0,0.72) 72%, #000 100%)',
        pointerEvents:'none',
      }}/>

      {/* Top fade from previous section */}
      <div style={{
        position:'absolute', top:0, left:0, right:0, height:'16vh',
        background:'linear-gradient(to bottom,#00000a,transparent)',
        pointerEvents:'none', zIndex:3,
      }}/>

      {/* ── Center headline ── */}
      <div ref={headRef} style={{
        position:'relative', zIndex:5,
        textAlign:'center',
        flex:1,
        display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center',
        paddingTop:'6vh',
      }}>
        <span style={{
          fontFamily:"'JetBrains Mono',monospace",
          fontSize:'.48rem', fontWeight:300,
          color:'rgba(255,255,255,0.42)', letterSpacing:'.45em',
          textTransform:'uppercase', display:'block', marginBottom:'1.4rem',
        }}>Let's work together</span>

        <h2 style={{
          fontFamily:"'Space Grotesk',sans-serif",
          fontSize:'clamp(3.2rem,8vw,7rem)',
          fontWeight:700, letterSpacing:'-.055em',
          color:'#fff', lineHeight:.9, margin:0,
        }}>
          <span style={{ fontWeight:200, color:'rgba(255,255,255,0.7)' }}>Let's&nbsp;</span>Connect
        </h2>

        <p style={{
          marginTop:'1.6rem',
          fontFamily:"'Space Grotesk',sans-serif",
          fontSize:'clamp(.82rem,1.1vw,.95rem)', fontWeight:300,
          color:'rgba(255,255,255,0.5)', letterSpacing:'.01em',
          lineHeight:1.7,
        }}>
          Open to collaborations, freelance &amp; interesting conversations.
        </p>
      </div>

      {/* ── Bottom contact strip ── */}
      <div ref={barRef} style={{
        position:'relative', zIndex:5,
        width:'100%',
        borderTop:'1px solid rgba(255,255,255,0.08)',
        background:'rgba(0,0,0,0.45)',
        backdropFilter:'blur(18px)',
        WebkitBackdropFilter:'blur(18px)',
      }}>
        <div style={{
          display:'flex', alignItems:'stretch',
          maxWidth:1100, margin:'0 auto',
          padding:'0 4vw',
        }}>
          {CONTACTS.map((c, i) => (
            <React.Fragment key={c.id}>
              {i > 0 && (
                <div style={{ width:1, background:'rgba(255,255,255,0.07)', flexShrink:0, margin:'1rem 0' }}/>
              )}
              <SocialLink contact={c} />
            </React.Fragment>
          ))}

          {/* Right — signature */}
          <div style={{
            width:1, background:'rgba(255,255,255,0.07)', flexShrink:0, margin:'1rem 0'
          }}/>
          <div style={{
            display:'flex', flexDirection:'column', justifyContent:'center',
            padding:'1rem 1.4rem', gap:'0.2rem',
          }}>
            <span style={{
              fontFamily:"'JetBrains Mono',monospace",
              fontSize:'.42rem', color:'rgba(255,255,255,0.2)',
              letterSpacing:'.3em', textTransform:'uppercase',
            }}>Vikas Singh</span>
            <span style={{
              fontFamily:"'JetBrains Mono',monospace",
              fontSize:'.4rem', color:'rgba(255,255,255,0.14)',
              letterSpacing:'.2em',
            }}>© {new Date().getFullYear()}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
