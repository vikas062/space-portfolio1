import React, { useRef, useEffect, useMemo, useState } from 'react';
import { Canvas, useFrame, useThree, useLoader } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { TextureLoader, Vector2 } from 'three';
import * as THREE from 'three';

const CA_OFFSET = new Vector2(0.0004, 0.0004);
import { useInView } from '../hooks/useInView';
import { useStableVisible } from '../hooks/useStableVisible';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/* ─── GLSL volumetric nebula (same domain-warped shader as Achievements) ─── */
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
    gl_FragColor=vec4(col, alpha*0.32);
  }
`;

/* ──────────────────────────────────────────────────
   Cert data — each is a "planet" in the orrery
────────────────────────────────────────────────── */
const ORBITS = [
  { id:1, image:'/certifications/cert1.png', label:'Responsive Web Design',  issuer:'freeCodeCamp',       color:'#ff5577', emissive:'#ff1144', radius:4.5,  speed:0.20, tilt:0.10, phase:0.0  },
  { id:2, image:'/certifications/cert2.png', label:'CodeSmart — DSA',        issuer:'LPU',                color:'#aa77ff', emissive:'#7722ff', radius:7.0,  speed:0.13, tilt:0.18, phase:1.57 },
  { id:3, image:'/certifications/cert3.png', label:'Front-End Development',  issuer:'Meta × Coursera',   color:'#33aaff', emissive:'#0066ff', radius:9.5,  speed:0.08, tilt:0.07, phase:3.14 },
  { id:4, image:'/certifications/cert4.png', label:'Java Programming (72h)', issuer:'LPU / iamneo',      color:'#44ffbb', emissive:'#00cc88', radius:12.0, speed:0.055,tilt:0.22, phase:4.71 },
];

/* ── Radial glow canvas texture ──────────────── */
function makeGlow(hex, size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size/2,size/2,0, size/2,size/2,size/2);
  g.addColorStop(0,   hex + 'ff');
  g.addColorStop(0.25,hex + 'cc');
  g.addColorStop(0.6, hex + '33');
  g.addColorStop(1,   'transparent');
  ctx.fillStyle = g;
  ctx.fillRect(0,0,size,size);
  return new THREE.CanvasTexture(c);
}

/* ── Dense realistic starfield ───────────────── */
function Milkyway() {
  const ref = useRef();
  const geo = useMemo(() => {
    const n=4000, pos=new Float32Array(n*3), col=new Float32Array(n*3);
    for (let i=0;i<n;i++) {
      // Two populations: galaxy plane + random halo
      const inPlane = Math.random() < 0.55;
      let x,y,z,r;
      if (inPlane) {
        // ... abbreviated logic
        r = 30 + Math.random()*60;
        const t = Math.random()*Math.PI*2;
        x = Math.cos(t)*r + (Math.random()-0.5)*10;
        y = (Math.random()-0.5)*8;
        z = Math.sin(t)*r + (Math.random()-0.5)*10;
      } else {
        r = 40 + Math.random()*60;
        const t=Math.random()*Math.PI*2, p=Math.acos(2*Math.random()-1);
        x=r*Math.sin(p)*Math.cos(t); y=r*Math.sin(p)*Math.sin(t); z=r*Math.cos(p);
      }
      pos[i*3]=x; pos[i*3+1]=y; pos[i*3+2]=z;
      const b=0.55+Math.random()*0.45;
      // Subtle OBAFGKM spectral color variation
      const tint=Math.random();
      if      (tint<0.08) { col[i*3]=b*0.8; col[i*3+1]=b*0.9; col[i*3+2]=b; }    // blue
      else if (tint<0.18) { col[i*3]=b;     col[i*3+1]=b*0.97;col[i*3+2]=b*0.9; } // white
      else if (tint<0.28) { col[i*3]=b;     col[i*3+1]=b*0.92;col[i*3+2]=b*0.7; } // yellow-white
      else                { col[i*3]=b;     col[i*3+1]=b*0.85;col[i*3+2]=b*0.75; }// orange-red
    }
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.BufferAttribute(pos,3));
    g.setAttribute('color',   new THREE.BufferAttribute(col,3));
    return g;
  },[]);
  useFrame(({clock})=>{ if(ref.current) ref.current.rotation.y=clock.getElapsedTime()*0.003; });
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial size={0.055} vertexColors transparent opacity={0.92} depthWrite={false} sizeAttenuation />
    </points>
  );
}

/* ── Volumetric GLSL nebula plane ────────────── */
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

/* ── Galactic core background glow ──────────── */
function GalaxyCore() {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (ref.current) ref.current.material.opacity = 0.07 + Math.sin(clock.getElapsedTime() * 0.22) * 0.02;
  });
  return (
    <group position={[0, -6, -110]}>
      <mesh ref={ref}>
        <sphereGeometry args={[26, 32, 24]} />
        <meshBasicMaterial color="#ffddaa" transparent opacity={0.07} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.BackSide} />
      </mesh>
      <mesh>
        <sphereGeometry args={[5, 16, 16]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.05} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh rotation={[Math.PI * 0.06, 0, 0]}>
        <torusGeometry args={[20, 3, 4, 128]} />
        <meshBasicMaterial color="#ffeecc" transparent opacity={0.018} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

/* ── Asteroid belt between outer cert orbits ─ */
function AsteroidBelt() {
  const ref = useRef();
  const geo = useMemo(() => {
    const n = 800, p = new Float32Array(n * 3), c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = 13.8 + (Math.random() - 0.5) * 1.4;
      const a = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.5) * 0.6;
      p[i*3]=Math.cos(a)*r; p[i*3+1]=y; p[i*3+2]=Math.sin(a)*r;
      const b = 0.18 + Math.random() * 0.22;
      c[i*3]=b*1.4; c[i*3+1]=b*0.9; c[i*3+2]=b*0.6;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    return g;
  }, []);
  useFrame(({ clock }) => { if (ref.current) ref.current.rotation.y = clock.getElapsedTime() * 0.006; });
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial vertexColors size={0.05} transparent opacity={0.6} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

/* ── Space dust for depth parallax ──────────── */
function SpaceDust() {
  const ref = useRef();
  const geo = useMemo(() => {
    const n = 350, p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      p[i*3]=(Math.random()-0.5)*50; p[i*3+1]=(Math.random()-0.5)*35; p[i*3+2]=(Math.random()-0.5)*50;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    return g;
  }, []);
  useFrame(({ clock }) => { if (ref.current) ref.current.rotation.y = clock.getElapsedTime() * 0.002; });
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial size={0.022} color="#aabbdd" transparent opacity={0.16} sizeAttenuation depthWrite={false} />
    </points>
  );
}



function CentralStar() {
  const coreRef=useRef(), c1=useRef(), c2=useRef(), c3=useRef(), c4=useRef();
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (coreRef.current) coreRef.current.rotation.y = t * 0.12;
    if (c1.current) c1.current.scale.setScalar(1 + Math.sin(t*1.1+1)*0.07);
    if (c2.current) c2.current.scale.setScalar(1 + Math.sin(t*0.75+2)*0.12);
    if (c3.current) c3.current.scale.setScalar(1 + Math.sin(t*0.45+3)*0.18);
    if (c4.current) c4.current.scale.setScalar(1 + Math.sin(t*0.3+4)*0.24);
  });
  return (
    <group>
      <mesh ref={c4}><sphereGeometry args={[3.8,32,32]}/><meshBasicMaterial color="#ff2200" transparent opacity={0.014} depthWrite={false} blending={THREE.AdditiveBlending}/></mesh>
      <mesh ref={c3}><sphereGeometry args={[2.8,32,32]}/><meshBasicMaterial color="#ff5500" transparent opacity={0.032} depthWrite={false} blending={THREE.AdditiveBlending}/></mesh>
      <mesh ref={c2}><sphereGeometry args={[1.9,32,32]}/><meshBasicMaterial color="#ff8800" transparent opacity={0.10} depthWrite={false} blending={THREE.AdditiveBlending}/></mesh>
      <mesh ref={c1}><sphereGeometry args={[1.15,32,32]}/><meshBasicMaterial color="#ffcc44" transparent opacity={0.48} depthWrite={false} blending={THREE.AdditiveBlending}/></mesh>
      {/* Solid bright core — white-yellow, no shader, no flicker */}
      <mesh ref={coreRef}><sphereGeometry args={[0.58,48,48]}/><meshBasicMaterial color="#fff5cc"/></mesh>
      <pointLight intensity={4}  color="#ffe8aa" decay={0.5}/>
      <pointLight intensity={10} color="#ffcc44" decay={1.0}/>
    </group>
  );
}

/* ── Orbit ring — glowing, thicker ─────────────── */
function Ring({ radius, tilt, color }) {
  const geo = useMemo(() => new THREE.TorusGeometry(radius, 0.025, 6, 360), [radius]);
  return (
    <mesh geometry={geo} rotation={[Math.PI/2 + tilt, 0, 0]}>
      <meshBasicMaterial color={color} transparent opacity={0.45} depthWrite={false} blending={THREE.AdditiveBlending} />
    </mesh>
  );
}

/* ── Glowing particle riding each orbit (comet trail) ── */
function OrbitRider({ radius, tilt, speed, phase, color }) {
  const headRef  = useRef();
  const angleRef = useRef(phase + Math.PI);

  // Pre-fill trail at starting position so there's no origin flash on mount
  const startA = phase + Math.PI;
  const startX = Math.cos(startA) * radius;
  const startZ = Math.sin(startA) * radius;
  const startY = Math.sin(startA * 2.3 + phase) * tilt * 1.8;

  const trailGeo = useMemo(() => {
    const n = 28;
    const p = new Float32Array(n * 3);
    // Initialize all trail points at start pos — no origin flash
    for (let i = 0; i < n; i++) {
      p[i*3] = startX; p[i*3+1] = startY; p[i*3+2] = startZ;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    return g;
  }, []);

  useFrame(() => {
    angleRef.current += speed * 0.006;
    const a = angleRef.current;
    const x = Math.cos(a) * radius;
    const z = Math.sin(a) * radius;
    const y = Math.sin(a * 2.3 + phase) * tilt * 1.8;

    if (headRef.current) headRef.current.position.set(x, y, z);

    const arr = trailGeo.attributes.position.array;
    const cnt = arr.length / 3;
    for (let i = cnt - 1; i > 0; i--) {
      arr[i*3]   = arr[(i-1)*3];
      arr[i*3+1] = arr[(i-1)*3+1];
      arr[i*3+2] = arr[(i-1)*3+2];
    }
    arr[0] = x; arr[1] = y; arr[2] = z;
    trailGeo.attributes.position.needsUpdate = true;
  });

  return (
    <group>
      <mesh ref={headRef} position={[startX, startY, startZ]}>
        <sphereGeometry args={[0.13, 8, 8]} />
        <meshBasicMaterial color={color} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <points geometry={trailGeo}>
        <pointsMaterial color={color} size={0.06} transparent opacity={0.5}
          sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending}/>
      </points>
    </group>
  );
}


/* ── Certificate frame (planet) ─────────────── */
function CertFrame({ data, index, onSelect }) {
  const groupRef=useRef(), planeRef=useRef(), dotRef=useRef();
  const tex     = useLoader(TextureLoader, data.image);
  const color   = useMemo(()=>new THREE.Color(data.color),[data.color]);
  const angleRef = useRef(data.phase);
  const { camera } = useThree();

  useFrame(({clock},delta)=>{
    angleRef.current += data.speed * 0.004;
    const a = angleRef.current;
    const x = Math.cos(a)*data.radius;
    const z = Math.sin(a)*data.radius;
    const y = Math.sin(a*2.3+data.phase)*data.tilt*1.8;

    if(groupRef.current){
      groupRef.current.position.set(x,y,z);
      // Always face the camera — true billboard orientation fix
      groupRef.current.lookAt(camera.position);
    }
    const t=clock.getElapsedTime();
    if(planeRef.current) planeRef.current.rotation.z=Math.sin(t*0.35+index*0.9)*0.025;
    if(dotRef.current){
      const p=0.5+Math.sin(t*2.5+index)*0.3;
      dotRef.current.material.opacity=p;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Simple cert image — clean, no glow halo */}
      <mesh
        ref={planeRef}
        onClick={()=>onSelect(data)}
        onPointerOver={()=>{document.body.style.cursor='pointer';}}
        onPointerOut={()=>{document.body.style.cursor='default';}}
      >
        <planeGeometry args={[3.4,2.35]} />
        <meshStandardMaterial
          map={tex}
          transparent
          roughness={0.2}
          metalness={0.3}
          emissive={color}
          emissiveIntensity={0.06}
        />
      </mesh>
    </group>
  );
}

/* ── Scroll zoom helper ────────────────────── */
function ScrollZoom({ scrollY }) {
  const { camera } = useThree();
  useFrame(() => {
    // Gently pull camera closer as user scrolls into the section
    const targetFov = 52 - scrollY.current * 14;
    camera.fov += (targetFov - camera.fov) * 0.04;
    camera.updateProjectionMatrix();
  });
  return null;
}

/* ── Cinematic Lightbox modal ─────────────────── */
function Modal({ cert, onClose }) {
  if (!cert) return null;
  return (
    <div onClick={onClose} style={{
      position:'fixed',inset:0,zIndex:9999,
      background:'rgba(0,0,6,0.95)',
      backdropFilter:'blur(24px)',WebkitBackdropFilter:'blur(24px)',
      display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
      cursor:'zoom-out',animation:'mIn 0.35s cubic-bezier(0.22,1,0.36,1)',
    }}>
      <p style={{color:cert.color,fontSize:'0.68rem',textTransform:'uppercase',letterSpacing:'0.3em',margin:'0 0 0.5rem',fontWeight:700}}>{cert.issuer}</p>
      <h3 style={{color:'#fff',margin:'0 0 2rem',fontSize:'clamp(1.3rem,3vw,2.4rem)',fontWeight:800,letterSpacing:'-0.02em'}}>{cert.label}</h3>

      <div onClick={e=>e.stopPropagation()} style={{
        maxWidth:'86vw',maxHeight:'78vh',borderRadius:'16px',overflow:'hidden',
        boxShadow:`0 0 0 1px ${cert.color}44, 0 60px 140px rgba(0,0,0,0.99), 0 0 100px ${cert.color}20`,
        position:'relative',
      }}>
        <div style={{position:'absolute',top:0,left:0,right:0,height:'2px',background:`linear-gradient(90deg,transparent,${cert.color},transparent)`,zIndex:2}}/>
        <img src={cert.image} alt={cert.label} style={{display:'block',width:'100%',maxHeight:'76vh',objectFit:'contain'}}/>
      </div>

      <button onClick={onClose} style={{
        marginTop:'2rem',
        background:'rgba(255,255,255,0.04)',border:`1px solid ${cert.color}50`,
        color:'rgba(255,255,255,0.7)',padding:'0.6rem 2.5rem',borderRadius:'100px',
        fontSize:'0.75rem',letterSpacing:'0.2em',textTransform:'uppercase',cursor:'pointer',fontWeight:600,
      }}>Close</button>
    </div>
  );
}

/* ── Main export ──────────────────────────────── */
export default function CertificationsSection() {
  const secRef  = useRef(null);
  const innerRef = useRef(null); // GSAP pin target
  const scrollY  = useRef(0);
  const [selected,setSelected] = useState(null);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // GSAP ScrollTrigger pin (replaces CSS sticky + window.scroll listener)
  useEffect(() => {
    if (isMobile) return;
    const inner = innerRef.current;
    const pinDistance = window.innerHeight * 2.5;
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: inner,
        start: 'top top',
        end: `+=${pinDistance}`,
        pin: true,
        pinSpacing: true,
        onUpdate: (self) => { scrollY.current = self.progress; },
      });
    }, secRef);
    return () => ctx.revert();
  }, [isMobile]);

  const { ref: viewRef, inView } = useInView({ rootMargin: '300px 0px' });
  const canvasVisible = useStableVisible(secRef, '300px 0px', 1500);

  return (
    <>
      <div ref={(el) => { secRef.current = el; viewRef.current = el; }} id="section-certifications"
        style={{position:'relative',width:'100vw',background:'#00000a'}}>

        <div ref={innerRef}
          style={{width:'100vw',height:'100vh',overflow:'hidden',position:'relative'}}>

          {/* Vignette */}
          <div style={{position:'absolute',inset:0,zIndex:2,pointerEvents:'none',
            background:'radial-gradient(ellipse 80% 80% at 50% 50%, transparent 35%, #00000a 100%)'}}/>

          {/* Top fade \u2014 blends from AchievementsSection seamlessly */}
          <div style={{
            position:'absolute',top:0,left:0,right:0,height:'20vh',
            background:'linear-gradient(to bottom, #00000a 0%, transparent 100%)',
            pointerEvents:'none',zIndex:25,
          }}/>
          {/* Label */}
          <div style={{position:'absolute',top:'2rem',left:'4vw',zIndex:20,pointerEvents:'none',display:'flex',alignItems:'center',gap:'1rem'}}>
            <div style={{width:'2rem',height:'1px',background:'rgba(255,255,255,0.25)'}}/>
            <span style={{color:'rgba(255,255,255,0.4)',fontSize:'0.65rem',textTransform:'uppercase',letterSpacing:'0.35em',fontWeight:600}}>Achievement Orrery</span>
          </div>
          <div style={{position:'absolute',top:'2rem',right:'4vw',zIndex:20,pointerEvents:'none'}}>
            <span style={{color:'rgba(255,255,255,0.2)',fontSize:'0.6rem',textTransform:'uppercase',letterSpacing:'0.2em'}}>Move mouse · Scroll to zoom</span>
          </div>

          {/* Bottom cert labels */}
          <div style={{position:'absolute',bottom:'2.2rem',left:0,right:0,zIndex:20,display:'flex',justifyContent:'center',gap:'4.5vw'}}>
            {ORBITS.map(c=>(
              <button key={c.id} onClick={()=>setSelected(c)}
                style={{textAlign:'center',background:'none',border:'none',cursor:'pointer',padding:'0.4rem 0.6rem',transition:'transform 0.2s ease'}}
                onMouseEnter={e=>e.currentTarget.style.transform='translateY(-5px)'}
                onMouseLeave={e=>e.currentTarget.style.transform='translateY(0)'}
              >
                <div style={{width:'7px',height:'7px',borderRadius:'50%',background:c.color,margin:'0 auto 0.55rem',
                  boxShadow:`0 0 10px ${c.color}, 0 0 24px ${c.color}88`}}/>
                <p style={{color:'rgba(255,255,255,0.38)',fontSize:'0.58rem',textTransform:'uppercase',letterSpacing:'0.15em',margin:'0 0 0.15rem'}}>{c.issuer}</p>
                <p style={{color:'#fff',fontSize:'0.75rem',fontWeight:700,margin:0,letterSpacing:'-0.01em'}}>{c.label}</p>
                <p style={{color:c.color,fontSize:'0.55rem',margin:'0.25rem 0 0',opacity:0.7,letterSpacing:'0.1em'}}>↗ VIEW</p>
              </button>
            ))}
          </div>

          {/*/
            CRITICAL OPTIMIZATIONS:
            - gl antialias={false}: EffectComposer (Bloom) works infinitely faster without multisampling.
            - dpr={[1, 1]}: Caps pixel ratio to 1x to save fragment shader fill-rate on high-density displays (retina).
          /*/}
          {canvasVisible && <Canvas 
            camera={{position:[0,7,18],fov:52}} 
            gl={{antialias:false, alpha:false, toneMappingExposure:1.4, powerPreference:'high-performance'}}
            dpr={[1, 1]}
            frameloop="always"
            onCreated={({gl}) => gl.setClearColor(0x00000a, 1)}
            style={{position:'absolute',inset:0}}
          >
            <color attach="background" args={['#00000a']} />
            <fog attach="fog" args={['#00000a', 30, 90]} />

            {/* Full free-orbit controls — drag anywhere for 360° rotation */}
            <OrbitControls
              enablePan={false}
              enableZoom={false}
              enableDamping
              dampingFactor={0.06}
              rotateSpeed={0.55}
              target={[0,0,0]}
            />
            <ScrollZoom scrollY={scrollY} />
            <ambientLight intensity={0.06} />

            <Milkyway />
            {/* Particle nebula arms (keep for galaxy structure) */}
            {/* Volumetric GLSL nebulae — Original 6 Hubble-palette layers restored */}
            <VolNebula position={[-38,14,-68]} scale={62} color="#cc2299" timeOffset={0} rotation={[0.3,-0.4,0.15]}/>
            <VolNebula position={[42,-10,-75]} scale={70} color="#00bbcc" timeOffset={3} rotation={[-0.2,0.5,-0.1]}/>
            <VolNebula position={[8,32,-72]}  scale={58} color="#ff6600" timeOffset={7} rotation={[0.1,-0.2,0.4]}/>
            <VolNebula position={[-18,-22,-60]} scale={48} color="#6622dd" timeOffset={2} rotation={[0.5,0.3,-0.2]}/>
            <VolNebula position={[30,20,-80]} scale={65} color="#ff2255" timeOffset={5} rotation={[-0.1,0.2,0.3]}/>
            <VolNebula position={[-48,-8,-70]} scale={55} color="#0044ff" timeOffset={9} rotation={[0.2,0.1,-0.3]}/>
            <GalaxyCore />
            <AsteroidBelt />
            <SpaceDust />
            <CentralStar />

            {ORBITS.map(o=>(
              <Ring key={o.id} radius={o.radius} tilt={o.tilt} color={o.color} />
            ))}
            {ORBITS.map(o=>(
              <OrbitRider key={'r'+o.id} radius={o.radius} tilt={o.tilt} speed={o.speed} phase={o.phase} color={o.color} />
            ))}
            {ORBITS.map((o,i)=>(
              <CertFrame key={o.id} data={o} index={i} onSelect={setSelected} />
            ))}

            <EffectComposer>
              <Bloom
                intensity={0.7}
                luminanceThreshold={0.18}
                luminanceSmoothing={0.75}
                radius={0.8}
                blendFunction={BlendFunction.ADD}
              />
              <ChromaticAberration offset={CA_OFFSET} radialModulation={false} modulationOffset={0} />
              <Vignette eskil={false} offset={0.1} darkness={0.9} />
            </EffectComposer>
          </Canvas>}

        </div>
        {/* Bottom fade — bleeds seamlessly into AchievementsSection (same dark space) */}
        <div style={{
          position:'absolute', bottom:0, left:0, right:0, height:'22vh',
          background:'linear-gradient(to bottom, transparent 0%, #00000a 100%)',
          pointerEvents:'none', zIndex:25,
        }}/>
      </div>

      <Modal cert={selected} onClose={()=>setSelected(null)} />

      <style>{`
        @keyframes mIn { from{opacity:0;transform:scale(0.94)} to{opacity:1;transform:scale(1)} }
      `}</style>
    </>
  );
}
