import React, { useRef, useEffect, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useInView } from '../hooks/useInView';
import { useStableVisible } from '../hooks/useStableVisible';

gsap.registerPlugin(ScrollTrigger);

/* ─── Projects ─── */
const PROJECTS = [
  {
    id: '01',
    name: 'DSA Compass',
    category: 'Learning Platform',
    year: '2024',
    link: '#',
    image: '/projects/project1.png',
    desc: 'A precision navigation system for competitive programmers — intelligent spaced-repetition engine, DSA concept tracking, and progress visualization built for those who want to master algorithms deliberately.',
    tech: ['React', 'Node.js', 'MongoDB', 'GSAP'],
    accent: '#d4a84b',
    dim:    'rgba(212,168,75,0.12)',
    mid:    'rgba(212,168,75,0.35)',
    nebulaA: '#3d2200',
    nebulaB: '#1a0d00',
  },
  {
    id: '02',
    name: 'Cohort',
    category: 'Collaboration Hub',
    year: '2024',
    link: 'https://cohort-zeta.vercel.app/',
    image: '/projects/project2.png',
    desc: 'A full-stack developer platform for real-time cohort collaboration — live-coding sessions, peer discovery engine, and integrated project management for developers who build together.',
    tech: ['React', 'Express', 'Socket.io', 'PostgreSQL'],
    accent: '#5b9eff',
    dim:    'rgba(91,158,255,0.12)',
    mid:    'rgba(91,158,255,0.35)',
    nebulaA: '#001133',
    nebulaB: '#000a22',
  },
];

/* ─── minimal WebGL background ─── */
const NVert = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
const NFrag = `
  uniform float uTime; uniform vec3 uCol; varying vec2 vUv;
  float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
  float fbm(vec2 p){float v=0.0,a=0.5,fr=1.0;for(int i=0;i<4;i++){v+=a*noise(p*fr);fr*=2.1;a*=0.5;}return v;}
  void main(){
    vec2 uv=(vUv-0.5)*2.0;
    float f=fbm(uv*0.9+vec2(uTime*0.008,0.0))*1.1;
    float alpha=f*(1.0-smoothstep(0.3,1.0,length(uv)));
    gl_FragColor=vec4(uCol*f*1.4, alpha*0.22);
  }
`;
function NebulaPlane({ pos, size, col, t=0 }) {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: NVert, fragmentShader: NFrag,
    uniforms: { uTime:{value:0}, uCol:{value:new THREE.Color(col)} },
    transparent:true, depthWrite:false, side:THREE.DoubleSide, blending: THREE.AdditiveBlending,
  }), [col]);
  useFrame(({clock}) => { mat.uniforms.uTime.value = clock.getElapsedTime()+t; });
  return <mesh position={pos} scale={size} material={mat}><planeGeometry args={[1,1]}/></mesh>;
}
function Stars() {
  const ref = useRef();
  const geo = useMemo(() => {
    const n=1800, p=new Float32Array(n*3);
    for (let i=0;i<n;i++){
      const r=70+Math.random()*200, t=Math.random()*Math.PI*2, ph=Math.acos(2*Math.random()-1);
      p[i*3]=r*Math.sin(ph)*Math.cos(t); p[i*3+1]=r*Math.sin(ph)*Math.sin(t); p[i*3+2]=r*Math.cos(ph);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p,3)); return g;
  }, []);
  useFrame(({clock}) => { if(ref.current) ref.current.rotation.y = clock.getElapsedTime()*0.001; });
  return <points ref={ref} geometry={geo}><pointsMaterial color="#ffffff" size={0.13} transparent opacity={0.7} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending}/></points>;
}
function BgScene({ project }) {
  return (
    <>
      <color attach="background" args={['#040410']} />
      <Stars />
      <NebulaPlane pos={[-30,8,-65]}  size={55} col={project.nebulaA} t={0} />
      <NebulaPlane pos={[35,-6,-70]}  size={60} col={project.nebulaB} t={4} />
      <NebulaPlane pos={[0,22,-60]}   size={42} col={project.nebulaA} t={8} />
      <EffectComposer>
        <Bloom intensity={0.7} luminanceThreshold={0.18} luminanceSmoothing={0.75} radius={0.8} blendFunction={BlendFunction.ADD}/>
      </EffectComposer>
    </>
  );
}

/* ─── Clean Project Card ─── */
function Card({ project, cardRef }) {
  const elRef = useRef();

  useEffect(() => {
    if (!elRef.current) return;
    gsap.fromTo(elRef.current.children,
      { opacity:0, y:24, filter:'blur(6px)' },
      { opacity:1, y:0, filter:'blur(0px)', duration:0.75, stagger:0.09, ease:'power3.out' }
    );
  }, [project.id]);

  const isMobile = window.innerWidth < 768;
  return (
    <div ref={cardRef} style={{
      width: isMobile ? '100vw' : '100vw',
      height: isMobile ? 'auto' : '100vh',
      flexShrink: 0,
      display: isMobile ? 'flex' : 'grid',
      flexDirection: isMobile ? 'column' : undefined,
      gridTemplateColumns: isMobile ? undefined : '1fr 1fr',
      alignItems:'center', gap: isMobile ? '2rem' : '5vw',
      padding: isMobile ? '5rem 6vw 4rem' : '0 7vw',
    }}>

      {/* Left: Text */}
      <div ref={elRef} style={{ display:'flex', flexDirection:'column' }}>

        {/* Label */}
        <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'2rem', opacity:0 }}>
          <span style={{ fontFamily:'monospace', fontSize:'0.5rem', color:project.accent, opacity:0.6, letterSpacing:'0.35em', textTransform:'uppercase' }}>{project.category}</span>
          <div style={{ width:1, height:10, background:'rgba(255,255,255,0.2)' }}/>
          <span style={{ fontFamily:'monospace', fontSize:'0.5rem', color:'rgba(255,255,255,0.3)', letterSpacing:'0.25em' }}>{project.year}</span>
        </div>

        {/* Title */}
        <h2 style={{
          fontSize:'clamp(3.2rem, 5.5vw, 5.5rem)',
          fontWeight:900, letterSpacing:'-0.04em', lineHeight:0.9,
          color:'#fff', margin:'0 0 1.4rem', opacity:0,
        }}>{project.name}</h2>

        {/* Accent line */}
        <div style={{ width:'3rem', height:1, background:project.accent, opacity:0.6, marginBottom:'1.4rem', opacity:0 }}/>

        {/* Desc */}
        <p style={{
          fontSize:'clamp(0.78rem,1.05vw,0.9rem)', color:'rgba(255,255,255,0.42)',
          lineHeight:1.85, maxWidth:380, margin:'0 0 1.8rem', opacity:0,
        }}>{project.desc}</p>

        {/* Tags */}
        <div style={{ display:'flex', gap:'0.4rem', flexWrap:'wrap', marginBottom:'2.2rem', opacity:0 }}>
          {project.tech.map(t => (
            <span key={t} style={{
              fontFamily:'monospace', fontSize:'0.5rem', color:project.accent,
              border:`1px solid ${project.mid}`, borderRadius:4,
              padding:'0.2rem 0.6rem', background:project.dim, letterSpacing:'0.08em',
            }}>{t}</span>
          ))}
        </div>

        {/* CTA */}
        <div style={{ opacity:0 }}>
          {project.link !== '#' ? (
            <a href={project.link} target="_blank" rel="noopener noreferrer" style={{
              display:'inline-flex', alignItems:'center', gap:'0.5rem',
              fontFamily:'monospace', fontSize:'0.56rem', fontWeight:700,
              letterSpacing:'0.16em', textTransform:'uppercase',
              color:'#040410', background:project.accent,
              textDecoration:'none', padding:'0.72rem 1.5rem', borderRadius:5,
              boxShadow:`0 0 28px ${project.accent}44`,
              transition:'opacity .2s, transform .2s',
            }}
            onMouseEnter={e=>{e.currentTarget.style.opacity='.85';e.currentTarget.style.transform='translateY(-2px)';}}
            onMouseLeave={e=>{e.currentTarget.style.opacity='1';e.currentTarget.style.transform='translateY(0)';}}>
              View Project <span style={{fontSize:'0.9rem'}}>↗</span>
            </a>
          ) : (
            <span style={{ fontFamily:'monospace', fontSize:'0.5rem', color:'rgba(255,255,255,0.2)', letterSpacing:'0.2em' }}>Coming Soon</span>
          )}
        </div>
      </div>

      {/* Right: Image */}
      <div style={{ position:'relative' }}>
        {/* Glow */}
        <div style={{
          position:'absolute', inset:-4,
          borderRadius:16,
          background:`radial-gradient(ellipse at center, ${project.mid} 0%, transparent 65%)`,
          filter:'blur(24px)', opacity:0.8, zIndex:0,
        }}/>
        {/* Card */}
        <div style={{
          position:'relative', zIndex:1,
          borderRadius:12, overflow:'hidden',
          border:`1px solid ${project.mid}`,
          background:'#08080f',
          boxShadow:`0 32px 80px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.04)`,
        }}>
          {/* Browser bar */}
          <div style={{
            background:'rgba(255,255,255,0.035)',
            borderBottom:`1px solid rgba(255,255,255,0.06)`,
            padding:'0.5rem 0.85rem',
            display:'flex', alignItems:'center', gap:'0.4rem',
          }}>
            {['#ff5f57','#ffbf2f','#28c840'].map(c => (
              <div key={c} style={{ width:7,height:7,borderRadius:'50%',background:c,opacity:0.75 }}/>
            ))}
            <div style={{
              flex:1, marginLeft:'0.7rem', background:'rgba(255,255,255,0.04)',
              border:'1px solid rgba(255,255,255,0.06)', borderRadius:3, height:13,
              display:'flex', alignItems:'center', padding:'0 0.5rem',
            }}>
              <span style={{ fontFamily:'monospace', fontSize:'0.36rem', color:'rgba(255,255,255,0.2)' }}>
                {project.link !== '#' ? project.link : 'localhost:5173'}
              </span>
            </div>
          </div>
          <img
            src={project.image} alt={project.name}
            style={{ width:'100%', height:'auto', display:'block', objectFit:'contain', background:'#08080f' }}
            onError={e => {
              e.target.style.display='none';
              e.target.parentElement.style.minHeight='200px';
              e.target.parentElement.style.background=`linear-gradient(135deg,${project.nebulaA}99,${project.nebulaB}55)`;
            }}
          />
          <div style={{ position:'absolute', inset:0, background:`linear-gradient(135deg,rgba(255,255,255,0.04) 0%,transparent 30%)`, pointerEvents:'none' }}/>
        </div>
      </div>
    </div>
  );
}



/* ─── Main ─── */
export default function ProjectsSection() {
  const outerRef    = useRef(null);
  const innerRef    = useRef(null);
  const trackRef    = useRef(null);
  const progressRef = useRef(0);
  const activeRef   = useRef(0);
  const { ref:viewRef, inView } = useInView({ rootMargin:'200px' });
  const canvasVisible = useStableVisible(outerRef, '200px 0px', 1500);
  const [active, setActive] = React.useState(PROJECTS[0]);
  const isMobile = window.innerWidth < 768;

  const refs = [useRef(null), useRef(null)];

  useEffect(() => {
    if (isMobile) return;
    const inner = innerRef.current, track = trackRef.current;
    const maxShift = (PROJECTS.length - 1) * window.innerWidth;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: inner,
        start: 'top top',
        end: `+=${maxShift + window.innerHeight * 2}`,
        pin: true,
        scrub: true,
        anticipatePin: 1,
        onUpdate: (self) => {
          const tail = window.innerHeight * 2;
          const totalEnd = maxShift + tail;
          const rawPx = self.progress * totalEnd;
          // Clamp: horizontal scroll completes at last project, tail keeps pin
          const tx = Math.min(rawPx, maxShift);
          track.style.transform = `translateX(${-tx}px)`;
          // Active project based on slide progress only (not tail)
          const slideProgress = Math.min(rawPx / maxShift, 1);
          const idx = Math.min(Math.floor(slideProgress * PROJECTS.length), PROJECTS.length - 1);
          if (idx !== activeRef.current) { activeRef.current = idx; setActive(PROJECTS[idx]); }
        },
      });
    }, outerRef);

    return () => ctx.revert();
  }, [isMobile]);

  // Mobile: render as simple vertical stack — no horizontal sticky scroll
  if (isMobile) {
    return (
      <div ref={(el)=>{ outerRef.current=el; viewRef.current=el; }}
        id="section-projects"
        style={{ position:'relative', width:'100vw', background:'#040410' }}>
        <Canvas camera={{ position:[0,0,18], fov:52 }} gl={{ antialias:false }} dpr={[1,1]}
          frameloop={inView?'always':'never'}
          style={{ position:'fixed', inset:0, zIndex:0 }}>
          <BgScene project={PROJECTS[0]} />
        </Canvas>
        <div style={{ position:'relative', zIndex:10 }}>
          {PROJECTS.map((p,i) => <Card key={p.id} project={p} cardRef={refs[i]} />)}
        </div>
      </div>
    );
  }

  return (
    <div ref={(el)=>{ outerRef.current=el; viewRef.current=el; }}
      id="section-projects"
      style={{ position:'relative', width:'100vw', background:'#040410' }}>
      {/* No height set — GSAP pin creates scroll space automatically */}
      <div ref={innerRef} style={{ width:'100vw', height:'100vh', overflow:'hidden', position:'relative' }}>

        {/* WebGL bg */}
        <Canvas camera={{ position:[0,0,18], fov:52 }} gl={{ antialias:false, powerPreference:'high-performance' }} dpr={[1,1]}
          frameloop={canvasVisible ? 'always' : 'demand'}
          style={{ position:'absolute', inset:0, zIndex:0 }}>
          <BgScene project={active} />
        </Canvas>

        {/* Subtle radial darkening at edges so cards pop */}
        <div style={{ position:'absolute', inset:0, zIndex:1, pointerEvents:'none',
          background:'radial-gradient(ellipse at center, transparent 40%, rgba(4,4,16,0.7) 100%)' }}/>

        {/* Top label */}
        <div style={{ position:'absolute', top:'2.2rem', left:'50%', transform:'translateX(-50%)', zIndex:30, pointerEvents:'none', display:'flex', alignItems:'center', gap:'0.8rem' }}>
          <div style={{ width:'2.5rem', height:1, background:'rgba(255,255,255,0.1)' }}/>
          <span style={{ fontFamily:'monospace', fontSize:'0.48rem', color:'rgba(255,255,255,0.18)', letterSpacing:'0.5em', textTransform:'uppercase' }}>Selected Work</span>
          <div style={{ width:'2.5rem', height:1, background:'rgba(255,255,255,0.1)' }}/>
        </div>

        {/* Track */}
        <div ref={trackRef} style={{ display:'flex', width:`${PROJECTS.length*100}vw`, height:'100%', position:'relative', zIndex:10, willChange:'transform' }}>
          {PROJECTS.map((p,i) => <Card key={p.id} project={p} cardRef={refs[i]} />)}
        </div>



        <div style={{ position:'absolute', top:0,left:0,right:0,height:'10vh',background:'linear-gradient(to bottom,#07070c,transparent)',pointerEvents:'none',zIndex:20 }}/>
        <div style={{ position:'absolute', bottom:0,left:0,right:0,height:'10vh',background:'linear-gradient(to top,#010208,transparent)',pointerEvents:'none',zIndex:20 }}/>
      </div>
    </div>
  );
}
