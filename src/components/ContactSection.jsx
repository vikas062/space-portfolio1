import React, { useRef, useEffect, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { Vector2 } from 'three';
import * as THREE from 'three';

const CA_OFFSET = new Vector2(0.0006, 0.0006);
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useInView } from '../hooks/useInView';

gsap.registerPlugin(ScrollTrigger);

/* ─── Load fonts ─── */
if (typeof document !== 'undefined' && !document.getElementById('contact-font')) {
  const l = document.createElement('link'); l.id = 'contact-font'; l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@300;400&family=Inter:wght@300;400&display=swap';
  document.head.appendChild(l);
}

/* ─── GLSL nebula shaders (same domain-warped 7-octave shader) ─── */
const NebulaVert = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
const NebulaFrag = `
  uniform float uTime; uniform vec3 uCol; varying vec2 vUv;
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float noise(vec2 p){
    vec2 i=floor(p);vec2 f=fract(p);
    f=f*f*f*(f*(f*6.0-15.0)+10.0);
    return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
  }
  float fbm(vec2 p){
    float v=0.0,a=0.55,freq=1.0;
    mat2 rot=mat2(cos(0.7),-sin(0.7),sin(0.7),cos(0.7));
    for(int i=0;i<6;i++){v+=a*noise(p*freq);p=rot*p;freq*=2.08;a*=0.52;}
    return v;
  }
  void main(){
    vec2 uv=(vUv-0.5)*2.2;
    vec2 q=vec2(fbm(uv+uTime*0.012), fbm(uv+vec2(5.2,1.3)+uTime*0.01));
    vec2 r=vec2(fbm(uv+2.8*q+vec2(1.7,9.2)+uTime*0.008), fbm(uv+2.8*q+vec2(8.3,2.8)));
    float f=fbm(uv+2.2*r);
    float dist=length(uv);
    f=f*f*1.2;
    float alpha=f*(1.0-smoothstep(0.28,0.92,dist));
    vec3 col=mix(uCol*0.4, uCol*1.6+0.15, f);
    col=mix(col, vec3(1.0,0.95,0.9), f*f*0.35);
    gl_FragColor=vec4(col, alpha*0.30);
  }
`;

/* ─── Contact data ─── */
const CONTACTS = [
  { id:1, label:'LinkedIn',   value:'vikassingh62',          href:'https://www.linkedin.com/in/vikassingh62', sym:'in' },
  { id:2, label:'GitHub',     value:'vikas062',              href:'https://github.com/vikas062',              sym:'gh' },
  { id:3, label:'Email',      value:'vikassinghgkp6@gmail.com', href:'mailto:vikassinghgkp6@gmail.com',       sym:'@'  },
  { id:5, label:'Instagram',  value:'vikas_singh_.62',       href:'https://instagram.com/vikas_singh_.62',    sym:'ig' },
  { id:6, label:'Reddit',     value:'vikas_singh_.62',       href:'https://reddit.com/user/vikas_singh_.62',  sym:'r/' },
];

/* ─── Stars ─── */
function Stars() {
  const ref = useRef();
  const geos = useMemo(() => {
    const mk = (n, rMin, rMax, colors) => {
      const p = new Float32Array(n * 3), c = new Float32Array(n * 3);
      const palette = colors.map(h => new THREE.Color(h));
      for (let i = 0; i < n; i++) {
        const r = rMin + Math.random() * rMax, t = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
        p[i*3]=r*Math.sin(ph)*Math.cos(t); p[i*3+1]=r*Math.sin(ph)*Math.sin(t); p[i*3+2]=r*Math.cos(ph);
        const col = palette[Math.floor(Math.random() * palette.length)];
        c[i*3]=col.r; c[i*3+1]=col.g; c[i*3+2]=col.b;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(p, 3));
      g.setAttribute('color',    new THREE.BufferAttribute(c, 3));
      return g;
    };
    return [
      mk(2500, 80, 180, ['#ffffff','#e8f0ff','#ffe8d0','#ffc8a0','#d0e8ff']),
      mk(6000, 50, 350, ['#8899cc','#aab8dd','#bb9977']),
    ];
  }, []);
  useFrame(({ clock }) => { if (ref.current) ref.current.rotation.y = clock.getElapsedTime() * 0.0005; });
  return (
    <group ref={ref}>
      <points geometry={geos[0]}><pointsMaterial vertexColors size={0.14} transparent opacity={0.95} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} /></points>
      <points geometry={geos[1]}><pointsMaterial vertexColors size={0.05} transparent opacity={0.38} sizeAttenuation depthWrite={false} /></points>
    </group>
  );
}

/* ─── Volumetric GLSL nebula ─── */
function VolNebula({ position, scale, color, timeOffset = 0, rotation = [0.2, -0.3, 0.1] }) {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: NebulaVert, fragmentShader: NebulaFrag,
    uniforms: { uTime: { value: 0 }, uCol: { value: new THREE.Color(color) } },
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
  }), [color]);
  useFrame(({ clock }) => { if (mat.uniforms) mat.uniforms.uTime.value = clock.getElapsedTime() + timeOffset; });
  return (
    <mesh position={position} scale={scale} rotation={rotation} material={mat}>
      <planeGeometry args={[1, 1, 1, 1]} />
    </mesh>
  );
}

/* ─── Galaxy core glow ─── */
function GalaxyCore() {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (ref.current) ref.current.material.opacity = 0.07 + Math.sin(clock.getElapsedTime() * 0.2) * 0.025;
  });
  return (
    <group position={[0, -4, -120]}>
      <mesh ref={ref}>
        <sphereGeometry args={[28, 32, 24]} />
        <meshBasicMaterial color="#ffddaa" transparent opacity={0.07} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

/* ─── Space dust ─── */
function SpaceDust() {
  const ref = useRef();
  const geo = useMemo(() => {
    const n = 300, p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      p[i*3]=(Math.random()-0.5)*60; p[i*3+1]=(Math.random()-0.5)*40; p[i*3+2]=(Math.random()-0.5)*60;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    return g;
  }, []);
  useFrame(({ clock }) => { if (ref.current) ref.current.rotation.y = clock.getElapsedTime() * 0.002; });
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial size={0.02} color="#aabbdd" transparent opacity={0.15} sizeAttenuation depthWrite={false} />
    </points>
  );
}

/* ─── Central transmission beacon ─── */
function Beacon() {
  const coreRef = useRef();
  const r1 = useRef(), r2 = useRef(), r3 = useRef(), r4 = useRef();
  const signalRef = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (coreRef.current) {
      coreRef.current.scale.setScalar(1 + Math.sin(t * 1.8) * 0.06);
      coreRef.current.rotation.y = t * 0.4;
      coreRef.current.rotation.z = t * 0.25;
    }
    // Pulsing rings — staggered phase
    [r1, r2, r3, r4].forEach((r, i) => {
      if (!r.current) return;
      const s = 1 + ((t * 0.55 + i * 0.25) % 1) * 2.8;
      r.current.scale.setScalar(s);
      r.current.material.opacity = Math.max(0, 1 - s / 3.8) * 0.5;
    });
    if (signalRef.current) {
      signalRef.current.rotation.y = t * 0.18;
      signalRef.current.rotation.x = t * 0.12;
    }
  });

  return (
    <group position={[0, 1, 0]}>
      {/* Outer slow-rotating wireframe sphere */}
      <mesh ref={signalRef}>
        <sphereGeometry args={[2.2, 12, 8]} />
        <meshBasicMaterial color="#3388ff" transparent opacity={0.04} wireframe depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* Corona layers */}
      <mesh>
        <sphereGeometry args={[1.4, 32, 32]} />
        <meshBasicMaterial color="#1155ff" transparent opacity={0.06} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.85, 32, 32]} />
        <meshBasicMaterial color="#44aaff" transparent opacity={0.18} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* Hot core */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.38, 32, 32]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>

      {/* Pulsing concentric rings */}
      {[r1, r2, r3, r4].map((r, i) => (
        <mesh key={i} ref={r} rotation={[Math.PI / 2 + i * 0.4, i * 0.8, 0]}>
          <torusGeometry args={[0.9, 0.012, 8, 96]} />
          <meshBasicMaterial color="#44aaff" transparent opacity={0.5} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}

      {/* Lights */}
      <pointLight color="#4488ff" intensity={6} distance={25} decay={2} />
      <pointLight color="#ffffff" intensity={3} distance={8} decay={2} />
    </group>
  );
}

/* ─── Floating signal particles — radiating outward ─── */
function SignalParticles() {
  const ref = useRef();
  const geo = useMemo(() => {
    const n = 180;
    const p = new Float32Array(n * 3);
    const speeds = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 0.5 + Math.random() * 1.5;
      p[i*3] = r * Math.sin(phi) * Math.cos(theta);
      p[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
      p[i*3+2] = r * Math.cos(phi);
      speeds[i] = 0.3 + Math.random() * 0.7;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    g.userData.speeds = speeds;
    return g;
  }, []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const pos = geo.attributes.position;
    const speeds = geo.userData.speeds;
    const t = clock.getElapsedTime();
    for (let i = 0; i < 180; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const r = Math.sqrt(x*x + y*y + z*z);
      if (r > 8) {
        // Reset near center
        const theta = Math.random() * Math.PI * 2, phi = Math.acos(2 * Math.random() - 1);
        pos.setXYZ(i, 0.5 * Math.sin(phi) * Math.cos(theta), 0.5 * Math.sin(phi) * Math.sin(theta), 0.5 * Math.cos(phi));
      } else {
        const speed = speeds[i] * 0.012;
        pos.setXYZ(i, x + (x / r) * speed, y + (y / r) * speed, z + (z / r) * speed);
      }
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={ref} geometry={geo} position={[0, 1, 0]}>
      <pointsMaterial size={0.06} color="#88ccff" transparent opacity={0.7} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

/* ─── 3D Scene ─── */
function Scene() {
  return (
    <>
      <color attach="background" args={['#00000a']} />
      <fog attach="fog" args={['#00000a', 40, 110]} />
      <ambientLight intensity={0.03} />
      <directionalLight position={[10, 10, 5]} intensity={0.4} color="#aaccff" />

      <Stars />
      <VolNebula position={[-40, 12, -72]} scale={65} color="#cc2299" timeOffset={0}  rotation={[0.3,-0.4,0.15]} />
      <VolNebula position={[45, -8, -78]}  scale={72} color="#00bbcc" timeOffset={3}  rotation={[-0.2,0.5,-0.1]} />
      <VolNebula position={[6, 30, -75]}   scale={60} color="#ff6600" timeOffset={7}  rotation={[0.1,-0.2,0.4]} />
      <VolNebula position={[-20,-20,-65]}  scale={50} color="#6622dd" timeOffset={2}  rotation={[0.5,0.3,-0.2]} />
      <VolNebula position={[28, 18, -82]}  scale={66} color="#ff2255" timeOffset={5}  rotation={[-0.1,0.2,0.3]} />
      <GalaxyCore />
      <SpaceDust />
      <Beacon />
      <SignalParticles />

      <EffectComposer>
        <Bloom intensity={0.6} luminanceThreshold={0.18} luminanceSmoothing={0.75} radius={0.8} blendFunction={BlendFunction.ADD} />
        <ChromaticAberration offset={CA_OFFSET} radialModulation={false} modulationOffset={0} />
        <Vignette eskil={false} offset={0.1} darkness={0.9} />
      </EffectComposer>
    </>
  );
}

/* ─── Contact card ─── */
function ContactCard({ contact, index }) {
  const [hovered, setHovered] = useState(false);
  return (
    <a
      href={contact.href}
      target={contact.href.startsWith('http') ? '_blank' : '_self'}
      rel="noopener noreferrer"
      className="contact-card"
      data-index={index}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '1.4rem',
        padding: '1.4rem 1.8rem',
        background: hovered ? 'rgba(255,255,255,.04)' : 'rgba(255,255,255,.02)',
        border: `1px solid ${hovered ? 'rgba(255,255,255,.18)' : 'rgba(255,255,255,.07)'}`,
        borderRadius: 6,
        textDecoration: 'none',
        transition: 'all 0.22s ease',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        cursor: 'pointer',
      }}
    >
      {/* Symbol */}
      <span style={{
        fontFamily: "'JetBrains Mono',monospace",
        fontSize: '.78rem', fontWeight: 400,
        color: hovered ? 'rgba(255,255,255,.7)' : 'rgba(255,255,255,.55)',
        minWidth: 28, textAlign: 'center',
        transition: 'color .22s',
      }}>{contact.sym}</span>

      {/* Divider */}
      <div style={{ width: 1, height: 32, background: hovered ? 'rgba(255,255,255,.14)' : 'rgba(255,255,255,.06)', flexShrink: 0 }}/>

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
          color: hovered ? 'rgba(255,255,255,.98)' : 'rgba(255,255,255,.8)',
          transition: 'color .22s',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{contact.value}</div>
      </div>

      {/* Arrow */}
      <span style={{
        fontFamily: "'Space Grotesk'",
        fontSize: '.7rem', color: hovered ? 'rgba(255,255,255,.5)' : 'rgba(255,255,255,.1)',
        transition: 'all .22s', transform: hovered ? 'translate(2px,-2px)' : 'translate(0,0)',
        flexShrink: 0,
      }}>↗</span>
    </a>
  );
}

/* ─── Main ─── */
export default function ContactSection() {
  const secRef    = useRef();
  const titleRef   = useRef();
  const subRef     = useRef();
  const gridRef    = useRef();
  const photoRef   = useRef();
  
  const { ref: viewRef, inView } = useInView({ rootMargin: '0px' });

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Photo entrance
      gsap.fromTo(photoRef.current,
        { opacity: 0, scale: 0.88, filter: 'blur(6px)' },
        { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 1.2, ease: 'power3.out',
          scrollTrigger: { trigger: photoRef.current, start: 'top 88%', toggleActions: 'play none none reverse' }
        }
      );
      // Title entrance
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
      // Cards stagger
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
      ref={(el) => { secRef.current = el; viewRef.current = el; }}
      id="section-contact"
      style={{
        position: 'relative', width: '100vw', minHeight: '100vh',
        background: '#00000a', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '12rem 4vw 6rem',
      }}
    >
      {/* Top fade-in continues from Achievements */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '18vh',
        background: 'linear-gradient(to bottom, #00000a 0%, transparent 100%)',
        pointerEvents: 'none', zIndex: 5,
      }} />

      {/* 3D Canvas behind everything */}
      <Canvas
        camera={{ position: [0, 2, 22], fov: 52 }}
        gl={{ antialias: false, toneMappingExposure: 1.4, toneMapping: THREE.ACESFilmicToneMapping }}
        dpr={[1, 1]}
        frameloop={inView ? 'always' : 'never'}
        style={{ position: 'absolute', inset: 0, zIndex: 0 }}
      >
        <Scene />
      </Canvas>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 960, margin: '0 auto' }}>

        {/* Dark backdrop so text doesn't merge with nebula */}
        <div style={{
          position: 'absolute', inset: '-3rem -4rem',
          background: 'radial-gradient(ellipse 80% 90% at 50% 50%, rgba(0,0,8,.72) 0%, transparent 100%)',
          pointerEvents: 'none', zIndex: -1,
        }}/>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>

          {/* Profile Photo */}
        <div ref={photoRef} style={{ textAlign:'center', marginBottom:'2.2rem' }}>
          <img
            src="/profile.jpg"
            alt="Vikas Singh"
            style={{
              width: 108, height: 108,
              borderRadius: '50%',
              objectFit: 'cover',
              filter: 'grayscale(1) brightness(0.92)',
              border: '1px solid rgba(255,255,255,0.14)',
              display: 'block',
              margin: '0 auto',
            }}
          />
        </div>

        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'.8rem', marginBottom:'1.8rem' }}>
            <div style={{ width:'2rem', height:1, background:'rgba(255,255,255,.12)' }}/>
            <span style={{
              fontFamily:"'JetBrains Mono',monospace", fontSize:'.5rem', fontWeight:300,
              color:'rgba(255,255,255,.88)', letterSpacing:'.4em', textTransform:'uppercase',
            }}>Contact</span>
            <div style={{ width:'2rem', height:1, background:'rgba(255,255,255,.12)' }}/>
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
            color:'rgba(255,255,255,.88)', lineHeight:1.8,
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
            color:'rgba(255,255,255,.14)', letterSpacing:'.3em', textTransform:'uppercase',
          }}>Vikas Singh · {new Date().getFullYear()}</span>
        </div>
      </div>

      {/* Bottom vignette */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 120,
        background: 'linear-gradient(to bottom, transparent, #00000a)',
        pointerEvents: 'none', zIndex: 5,
      }} />
    </section>
  );
}
