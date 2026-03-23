import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { useInView } from '../hooks/useInView';
import { Vector2 } from 'three';

const CA_OFFSET = new Vector2(0.0004, 0.0004);
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Register THREE.Line as JSX <line_>
extend({ Line_: THREE.Line });

/* ─── Achievement data ─── */
const ACHIEVEMENTS = [
  {
    id: 1, stat: 'Top Ranker', label: 'CodeChef Contestant',
    desc: 'Consistently competed in CodeChef coding contests, steadily climbing global rankings.',
    platform: 'CodeChef', color: '#ffa94d', glowHex: 0xffa94d,
    orbitR: 5.8, speed: 0.13, tilt: 0.28, phase: 0.0,
  },
  {
    id: 2, stat: '250+', label: 'Problems Solved',
    desc: 'Mastered 250+ DSA problems across LeetCode & GFG — arrays, graphs, trees, DP.',
    platform: 'LeetCode & GFG', color: '#74c0fc', glowHex: 0x74c0fc,
    orbitR: 9.5, speed: 0.075, tilt: -0.18, phase: 2.1,
  },
  {
    id: 3, stat: '4-Star', label: 'HackerRank Rating',
    desc: 'Earned a prestigious 4-star rating on HackerRank — top-tier across all domains.',
    platform: 'HackerRank', color: '#69db7c', glowHex: 0x69db7c,
    orbitR: 13.5, speed: 0.045, tilt: 0.14, phase: 4.2,
  },
];

/* ─── GLSL shaders ─── */
const EarthVert = `
  varying vec3 vNormal; varying vec3 vViewPos; varying vec2 vUv;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vViewPos = (modelViewMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const EarthFrag = `
  uniform sampler2D tDiff; uniform vec3 uSun;
  varying vec3 vNormal; varying vec3 vViewPos; varying vec2 vUv;
  void main() {
    vec4 base = texture2D(tDiff, vUv);
    vec3 N = normalize(vNormal); vec3 V = normalize(-vViewPos);
    float NdotS = dot(N, normalize(uSun));
    float dayFactor = smoothstep(-0.08, 0.35, NdotS);
    vec3 day   = base.rgb * (0.06 + dayFactor * 1.1);
    vec3 night = base.rgb * (1.0 - dayFactor) * 0.22;
    float fresnel = pow(1.0 - max(0.0, dot(N, V)), 4.5);
    vec3 atm = vec3(0.15, 0.45, 1.0) * fresnel * 1.5;
    gl_FragColor = vec4(day + night + atm, 1.0);
  }
`;
const AtmVert = `
  varying vec3 vNormal; varying vec3 vViewPos;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vViewPos = (modelViewMatrix * vec4(position,1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
  }
`;
const AtmFrag = `
  varying vec3 vNormal; varying vec3 vViewPos;
  void main() {
    vec3 N = normalize(vNormal); vec3 V = normalize(-vViewPos);
    float edge = pow(1.0 - max(0.0, dot(N, V)), 3.8);
    gl_FragColor = vec4(0.18, 0.52, 1.0, edge * 0.55);
  }
`;
const NebulaVert = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
const NebulaFrag = `
  uniform float uTime; uniform vec3 uCol; varying vec2 vUv;
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float hash3(vec2 p){return fract(sin(dot(p,vec2(269.5,183.3)))*43758.5453);}
  float noise(vec2 p){
    vec2 i=floor(p);vec2 f=fract(p);
    f=f*f*f*(f*(f*6.0-15.0)+10.0);
    return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
  }
  float fbm(vec2 p){
    float v=0.0,a=0.55,freq=1.0;
    mat2 rot=mat2(cos(0.7),-sin(0.7),sin(0.7),cos(0.7));
    // Reduced from 7 to 6 octaves to save some cycles while keeping full aesthetic depth
    for(int i=0;i<6;i++){v+=a*noise(p*freq);p=rot*p;freq*=2.08;a*=0.52;}
    return v;
  }
  void main(){
    vec2 uv=(vUv-0.5)*2.2;
    /* domain warp — warp the UV by fbm before sampling for organic tendrils */
    vec2 q=vec2(fbm(uv+uTime*0.012), fbm(uv+vec2(5.2,1.3)+uTime*0.01));
    vec2 r=vec2(fbm(uv+2.8*q+vec2(1.7,9.2)+uTime*0.008), fbm(uv+2.8*q+vec2(8.3,2.8)));
    float f=fbm(uv+2.2*r);
    float dist=length(uv);
    f = f * f * 1.2;
    float alpha = f * (1.0-smoothstep(0.28,0.92,dist));
    vec3 col = mix(uCol*0.4, uCol*1.6+0.15, f);
    col = mix(col, vec3(1.0,0.95,0.9), f*f*0.35);
    gl_FragColor=vec4(col, alpha*0.32);
  }
`;

/* ─── Earth texture ─── */
function makeEarthTex() {
  const W=1024,H=512,c=document.createElement('canvas');
  c.width=W;c.height=H;
  const ctx=c.getContext('2d');
  const g=ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#08213d');g.addColorStop(0.5,'#0a1f3a');g.addColorStop(1,'#06172c');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  [[165,95,118,72,'#1e4520'],[290,105,140,65,'#1a3d1c'],[430,125,105,58,'#1e4520'],
   [555,108,95,52,'#204821'],[650,115,88,64,'#1c4220'],[185,195,85,52,'#1a4020'],
   [340,218,68,44,'#1e4520'],[470,235,75,48,'#1a3d1c'],[105,275,95,62,'#1e4520'],
   [165,342,130,52,'#1c4020'],[310,368,98,44,'#204821']].forEach(([x,y,rx,ry,col])=>{
    ctx.fillStyle=col;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#264d22';ctx.beginPath();ctx.ellipse(x+rx*0.2,y-ry*0.1,rx*0.45,ry*0.5,0,0,Math.PI*2);ctx.fill();
  });
  ctx.fillStyle='rgba(210,230,248,0.8)';
  ctx.beginPath();ctx.ellipse(W*0.5,12,W*0.48,28,0,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.ellipse(W*0.5,H-12,W*0.48,26,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='rgba(255,195,50,0.65)';
  [[172,98],[295,110],[435,130],[560,112],[655,120],[195,200],[345,222],[475,240],[110,280],[170,348],[315,372]].forEach(([x,y])=>{
    for(let k=0;k<8;k++){ctx.beginPath();ctx.arc(x+(Math.random()-0.5)*28,y+(Math.random()-0.5)*18,0.7+Math.random()*1.3,0,Math.PI*2);ctx.fill();}
  });
  for(let i=0;i<22;i++){
    ctx.fillStyle=`rgba(255,255,255,${0.04+Math.random()*0.06})`;
    ctx.beginPath();ctx.ellipse(Math.random()*W,Math.random()*H,60+Math.random()*130,8+Math.random()*14,Math.random()*Math.PI,0,Math.PI*2);ctx.fill();
  }
  return new THREE.CanvasTexture(c);
}

/* ─── Earth component ─── */
function Earth() {
  const meshRef=useRef(),atmRef=useRef();
  const earthTex=useMemo(()=>makeEarthTex(),[]);
  const sunDir=useMemo(()=>new THREE.Vector3(1,0.4,0.6).normalize(),[]);
  const earthMat=useMemo(()=>new THREE.ShaderMaterial({
    vertexShader:EarthVert,fragmentShader:EarthFrag,
    uniforms:{tDiff:{value:earthTex},uSun:{value:sunDir}},
  }),[earthTex,sunDir]);
  const atmMat=useMemo(()=>new THREE.ShaderMaterial({
    vertexShader:AtmVert,fragmentShader:AtmFrag,
    side:THREE.BackSide,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
  }),[]);
  useFrame(({clock})=>{
    if(meshRef.current)meshRef.current.rotation.y=clock.getElapsedTime()*0.011;
    if(atmRef.current)atmRef.current.rotation.y=clock.getElapsedTime()*0.012;
  });
  return(
    <group>
      <mesh ref={meshRef} material={earthMat}><sphereGeometry args={[2.8,128,128]}/></mesh>
      <mesh ref={atmRef} material={atmMat}><sphereGeometry args={[3.05,64,64]}/></mesh>
      <mesh><sphereGeometry args={[3.3,32,32]}/><meshBasicMaterial color="#1a6aff" transparent opacity={0.012} side={THREE.BackSide} depthWrite={false} blending={THREE.AdditiveBlending}/></mesh>
    </group>
  );
}

/* ─── Stars with color variety ─── */
function Stars() {
  const ref = useRef();
  const geos = useMemo(() => {
    const mk = (n, rMin, rMax, colors) => {
      const p = new Float32Array(n * 3);
      const c = new Float32Array(n * 3);
      const palette = colors.map(h => new THREE.Color(h));
      for (let i = 0; i < n; i++) {
        const r = rMin + Math.random() * rMax;
        const t = Math.random() * Math.PI * 2;
        const ph = Math.acos(2 * Math.random() - 1);
        p[i*3]   = r * Math.sin(ph) * Math.cos(t);
        p[i*3+1] = r * Math.sin(ph) * Math.sin(t);
        p[i*3+2] = r * Math.cos(ph);
        const col = palette[Math.floor(Math.random() * palette.length)];
        c[i*3] = col.r; c[i*3+1] = col.g; c[i*3+2] = col.b;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(p, 3));
      g.setAttribute('color',    new THREE.BufferAttribute(c, 3));
      return g;
    };
    return [
      mk(5000, 80, 180, ['#ffffff','#e8f0ff','#ffe8d0','#ffc8a0','#d0e8ff','#c8d8ff']), // bright varied
      mk(14000, 50, 350, ['#8899cc','#aab8dd','#bb9977','#9988cc']),                   // dim background
    ];
  }, []);
  useFrame(({ clock }) => { if (ref.current) ref.current.rotation.y = clock.getElapsedTime() * 0.0006; });
  return (
    <group ref={ref}>
      <points geometry={geos[0]}><pointsMaterial vertexColors size={0.16} transparent opacity={0.95} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} /></points>
      <points geometry={geos[1]}><pointsMaterial vertexColors size={0.055} transparent opacity={0.4} sizeAttenuation depthWrite={false} /></points>
    </group>
  );
}

/* ─── Asteroid belt particle ring ─── */
function AsteroidBelt() {
  const ref = useRef();
  const geo = useMemo(() => {
    const n = 800;
    const p = new Float32Array(n * 3);
    const c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = 11.2 + (Math.random() - 0.5) * 1.6;
      const a = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.5) * 0.7;
      p[i*3] = Math.cos(a) * r; p[i*3+1] = y; p[i*3+2] = Math.sin(a) * r;
      // warm reddish-brown rocky color
      const brightness = 0.18 + Math.random() * 0.22;
      c[i*3] = brightness * 1.4; c[i*3+1] = brightness * 0.9; c[i*3+2] = brightness * 0.6;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    g.setAttribute('color',    new THREE.BufferAttribute(c, 3));
    return g;
  }, []);
  useFrame(({ clock }) => { if (ref.current) ref.current.rotation.y = clock.getElapsedTime() * 0.008; });
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial vertexColors size={0.055} transparent opacity={0.65} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

/* ─── Signal beam Earth → satellite ─── */
function SignalBeam({ from, to, color }) {
  const ref = useRef();
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    return g;
  }, []);
  useFrame(() => {
    if (!ref.current || !to.current) return;
    const pos = geo.attributes.position;
    pos.setXYZ(0, from.x, from.y, from.z);
    const tp = new THREE.Vector3();
    to.current.getWorldPosition(tp);
    pos.setXYZ(1, tp.x, tp.y, tp.z);
    pos.needsUpdate = true;
  });
  return (
    <line_ ref={ref} geometry={geo}>
      <lineBasicMaterial color={color} transparent opacity={0.45} depthWrite={false} blending={THREE.AdditiveBlending} />
    </line_>
  );
}

/* ─── Sun corona sprite ─── */
function SunFlare() {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.material.opacity = 0.18 + Math.sin(clock.getElapsedTime() * 0.7) * 0.06;
  });
  return (
    <group position={[28, 18, 12]}>
      {/* Core point */}
      <mesh>
        <sphereGeometry args={[0.5, 8, 8]} />
        <meshBasicMaterial color="#fff8e0" />
      </mesh>
      {/* Outer haze */}
      <mesh ref={ref}>
        <sphereGeometry args={[4.5, 16, 16]} />
        <meshBasicMaterial color="#ffdd88" transparent opacity={0.18} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      {/* Rays — thin cylinders rotated */}
      {[0,45,90,135].map((deg, i) => (
        <mesh key={i} rotation={[0, 0, (deg * Math.PI) / 180]}>
          <boxGeometry args={[0.04, 12, 0.04]} />
          <meshBasicMaterial color="#ffeeaa" transparent opacity={0.07} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
      <pointLight color="#fff6dd" intensity={3.2} distance={200} decay={1.5} />
    </group>
  );
}

/* ─── Nebula ─── */
function Nebula({position,scale,color,timeOffset=0,rotation=[0.2,-0.3,0.1]}) {
  const mat=useMemo(()=>new THREE.ShaderMaterial({
    vertexShader:NebulaVert,fragmentShader:NebulaFrag,
    uniforms:{uTime:{value:0},uCol:{value:new THREE.Color(color)}},
    transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
  }),[color]);
  useFrame(({clock})=>{if(mat.uniforms)mat.uniforms.uTime.value=clock.getElapsedTime()+timeOffset;});
  return(
    <mesh position={position} scale={scale} rotation={rotation} material={mat}>
      <planeGeometry args={[1,1,1,1]}/>
    </mesh>
  );
}

/* placeholder removed */
/* ─── Scroll-driven FOV zoom (same pattern as CertificationsSection) ─── */
function ScrollZoom({ scrollY }) {
  const { camera } = useThree();
  useFrame(() => {
    // FOV 52° (wide, full scene) → 22° (very close feel) — camera never moves, Earth safe
    const targetFov = 52 - scrollY.current * 38;
    camera.fov += (targetFov - camera.fov) * 0.05;
    camera.updateProjectionMatrix();
  });
  return null;
}

/* ─── Mouse parallax — subtle camera drift ─── */
function MouseParallax() {
  const { camera } = useThree();
  const mouse = useRef({ x: 0, y: 0 });
  const target = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const onMove = (e) => {
      mouse.current.x = (e.clientX / window.innerWidth  - 0.5) * 2;
      mouse.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, []);
  useFrame(() => {
    target.current.x += (mouse.current.x * 1.8 - target.current.x) * 0.028;
    target.current.y += (-mouse.current.y * 1.2 - target.current.y) * 0.028;
    camera.position.x += (target.current.x - camera.position.x) * 0.02;
    camera.position.y += (target.current.y - camera.position.y) * 0.02;
  });
  return null;
}

/* ─── Galactic core background glow ─── */
function GalaxyCore() {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (ref.current) ref.current.material.opacity = 0.08 + Math.sin(clock.getElapsedTime() * 0.22) * 0.025;
  });
  return (
    <group position={[0, -8, -120]}>
      {/* Core haze */}
      <mesh ref={ref}>
        <sphereGeometry args={[28, 32, 24]} />
        <meshBasicMaterial color="#ffddaa" transparent opacity={0.08} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.BackSide} />
      </mesh>
      {/* Dense bright center */}
      <mesh>
        <sphereGeometry args={[6, 16, 16]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.06} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      {/* Disc — equatorial band */}
      <mesh rotation={[Math.PI * 0.08, 0, 0]}>
        <torusGeometry args={[22, 3.5, 4, 128]} />
        <meshBasicMaterial color="#ffeecc" transparent opacity={0.022} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

/* ─── Space dust for depth ─── */
function SpaceDust() {
  const ref = useRef();
  const geo = useMemo(() => {
    const n = 450;
    const p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      p[i*3]   = (Math.random() - 0.5) * 60;
      p[i*3+1] = (Math.random() - 0.5) * 40;
      p[i*3+2] = (Math.random() - 0.5) * 60;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    return g;
  }, []);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = clock.getElapsedTime() * 0.003;
  });
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial size={0.025} color="#aabbdd" transparent opacity={0.18} sizeAttenuation depthWrite={false} />
    </points>
  );
}

/* ─── Earth polar aurora rings ─── */
function EarthAurora() {
  const northRef = useRef();
  const southRef = useRef();
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const pulse = 0.55 + Math.sin(t * 1.1) * 0.25;
    if (northRef.current) northRef.current.material.opacity = pulse * 0.35;
    if (southRef.current) southRef.current.material.opacity = pulse * 0.28;
    if (northRef.current) northRef.current.rotation.y = t * 0.4;
    if (southRef.current) southRef.current.rotation.y = -t * 0.35;
  });
  return (
    <group>
      {/* North aurora */}
      <mesh ref={northRef} position={[0, 2.7, 0]} rotation={[0.18, 0, 0]}>
        <torusGeometry args={[1.6, 0.08, 8, 80]} />
        <meshBasicMaterial color="#44ffaa" transparent opacity={0.35} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      {/* Second green ring */}
      <mesh position={[0, 2.62, 0]} rotation={[0.22, 0, 0]}>
        <torusGeometry args={[1.85, 0.04, 6, 80]} />
        <meshBasicMaterial color="#22ccff" transparent opacity={0.18} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      {/* South aurora */}
      <mesh ref={southRef} position={[0, -2.7, 0]} rotation={[-0.18, 0, 0]}>
        <torusGeometry args={[1.6, 0.07, 8, 80]} />
        <meshBasicMaterial color="#aa44ff" transparent opacity={0.28} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

/* ─── Orbit trail (bright dashed ring) ─── */
function OrbitTrail({ radius, tilt, color }) {
  const geo = useMemo(() => {
    const n = 320, p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      p[i*3]   = Math.cos(a) * radius;
      p[i*3+1] = Math.sin(a) * tilt * radius * 0.25;
      p[i*3+2] = Math.sin(a) * radius;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    return g;
  }, [radius, tilt]);
  return (
    <points geometry={geo}>
      <pointsMaterial size={0.038} color={color} transparent opacity={0.55} depthWrite={false} sizeAttenuation blending={THREE.AdditiveBlending} />
    </points>
  );
}

/* ─── Cinematic Meteor — particle spray head + long tail ─── */
function Meteor({ speed, delay, tiltX, tiltZ, scale }) {
  const group = useRef();
  const headRef = useRef();
  const lightRef = useRef();

  // Build long tail as many particles scattered around a line
  const tailGeo = useMemo(() => {
    const n = 200;
    const p = new Float32Array(n * 3);
    const c = new Float32Array(n * 3);
    const s = new Float32Array(n); // sizes
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      // Core line
      const cx = t * 10;
      const cy = -t * 0.5;
      // Random spray around the line, wider near head, tight at tail tip
      const scatter = (1 - t) * 0.08;
      p[i * 3]     = cx + (Math.random() - 0.5) * scatter;
      p[i * 3 + 1] = cy + (Math.random() - 0.5) * scatter * 0.3;
      p[i * 3 + 2] = (Math.random() - 0.5) * scatter;
      // Color: bright white/blue at head, dim warm orange at tail
      const headColor = new THREE.Color('#e8f4ff');
      const tailColor = new THREE.Color('#ff8844');
      const col = headColor.clone().lerp(tailColor, t * t);
      c[i * 3] = col.r * (1 - t * 0.85);
      c[i * 3 + 1] = col.g * (1 - t * 0.85);
      c[i * 3 + 2] = col.b * (1 - t * 0.85);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    g.setAttribute('color',    new THREE.BufferAttribute(c, 3));
    return g;
  }, []);

  useFrame(({ clock }) => {
    const t = ((clock.getElapsedTime() * speed + delay) % 1);
    if (!group.current) return;

    // Traverse a diagonal path across the scene
    const px = 55 - t * 130;
    const py = 22 - t * 34;
    const pz = -15 + t * 30;
    group.current.position.set(px, py, pz);
    group.current.rotation.set(tiltX, 0, tiltZ);
    group.current.scale.setScalar(scale);

    const vis = t > 0.01 && t < 0.97;
    group.current.visible = vis;

    // Fade in/out
    const fade = t < 0.08 ? t / 0.08 : t > 0.88 ? (1 - t) / 0.12 : 1;
    if (headRef.current) headRef.current.material.opacity = fade;
    if (lightRef.current) lightRef.current.intensity = fade * 18 * scale;
  });

  return (
    <group ref={group}>
      {/* Particle spray tail */}
      <points geometry={tailGeo}>
        <pointsMaterial
          vertexColors transparent opacity={0.88}
          size={0.055} sizeAttenuation
          depthWrite={false} blending={THREE.AdditiveBlending}
        />
      </points>
      {/* Bright glowing head */}
      <mesh ref={headRef}>
        <sphereGeometry args={[0.11, 12, 12]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={1} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {/* Inner hot core */}
      <mesh>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshBasicMaterial color="#aaddff" blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {/* Moving light for scene illumination */}
      <pointLight ref={lightRef} color="#88ccff" intensity={18} distance={12} decay={2} />
    </group>
  );
}

function Meteors() {
  const list = useMemo(() => Array.from({ length: 9 }, (_, i) => ({
    speed:  0.045 + Math.random() * 0.07,
    delay:  i / 9 + Math.random() * 0.04,
    tiltX:  (Math.random() - 0.5) * 0.3,
    tiltZ:  -0.18 + (Math.random() - 0.5) * 0.2,
    scale:  0.55 + Math.random() * 0.7,
  })), []);
  return <>{list.map((m, i) => <Meteor key={i} {...m} />)}</>;
}

/* ─── Pulsing rings on selected satellite ─── */
function SelectionRings({ color }) {
  const r1 = useRef(), r2 = useRef(), r3 = useRef();
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    [r1, r2, r3].forEach((r, i) => {
      if (!r.current) return;
      const s = 1 + ((t * 0.7 + i * 0.33) % 1) * 2.2;
      r.current.scale.setScalar(s);
      r.current.material.opacity = Math.max(0, 1 - s / 3.2) * 0.6;
    });
  });
  const col = new THREE.Color(color);
  return (
    <group>
      {[r1, r2, r3].map((ref, i) => (
        <mesh key={i} ref={ref} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.55, 0.012, 8, 64]} />
          <meshBasicMaterial color={col} transparent opacity={0.5} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
    </group>
  );
}

/* ─── Realistic satellite ─── */
function Satellite({ data, selected, onSelect }) {
  const group   = useRef();
  const dishRef = useRef();
  const angle   = useRef(data.phase);
  const { camera } = useThree();
  const isSelected = selected === data.id;

  useFrame(({ clock }) => {
    angle.current += data.speed * 0.004;
    const a = angle.current;
    if (group.current) {
      group.current.position.set(
        Math.cos(a) * data.orbitR,
        Math.sin(a) * data.tilt * data.orbitR * 0.25,
        Math.sin(a) * data.orbitR
      );
      group.current.lookAt(camera.position);
    }
    if (dishRef.current) dishRef.current.rotation.y = clock.getElapsedTime() * 0.3;
  });

  const bodyMat  = useMemo(() => new THREE.MeshStandardMaterial({ color: '#c8ccd8', metalness: 0.95, roughness: 0.12 }), []);
  const goldMat  = useMemo(() => new THREE.MeshStandardMaterial({ color: '#d4a843', metalness: 0.9,  roughness: 0.22 }), []);
  const darkMat  = useMemo(() => new THREE.MeshStandardMaterial({ color: '#181c28', metalness: 0.7,  roughness: 0.4  }), []);
  const solarMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#08152e', metalness: 0.6, roughness: 0.35,
    emissive: new THREE.Color('#030d22'), emissiveIntensity: 0.6,
  }), []);
  const thrustMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#888899', metalness: 1, roughness: 0.08 }), []);

  return (
    <group ref={group}>
      {/* Selection pulse rings */}
      {isSelected && <SelectionRings color={data.color} />}

      {/* Main bus */}
      <mesh material={bodyMat}
        onClick={() => onSelect(isSelected ? null : data.id)}
        onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'default'; }}
      >
        <cylinderGeometry args={[0.28, 0.28, 0.7, 6]} />
      </mesh>

      <mesh material={goldMat} position={[0, 0.35, 0]}><cylinderGeometry args={[0.27, 0.27, 0.02, 6]} /></mesh>
      <mesh material={goldMat} position={[0, -0.35, 0]}><cylinderGeometry args={[0.27, 0.27, 0.02, 6]} /></mesh>

      {[0,1,2,3,4,5].map(i => {
        const ang = (i/6)*Math.PI*2;
        return <mesh key={i} material={darkMat} position={[Math.cos(ang)*0.29,0,Math.sin(ang)*0.29]} rotation={[0,-ang,0]}><boxGeometry args={[0.01,0.65,0.18]}/></mesh>;
      })}

      {[-1,1].map(s => (
        <group key={s}>
          <mesh material={bodyMat} position={[s*0.78,0,0]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[0.018,0.018,1.0,8]}/></mesh>
          <mesh material={darkMat} position={[s*1.32,0,0]}><boxGeometry args={[0.09,0.09,0.09]}/></mesh>
          {[0,1].map(pIdx => {
            const py=(pIdx-0.5)*0.72;
            return (
              <group key={pIdx} position={[s*1.55,py,0]}>
                <mesh material={solarMat}><boxGeometry args={[0.82,0.58,0.022]}/></mesh>
                {Array.from({length:7},(_,k)=><mesh key={k} material={new THREE.MeshBasicMaterial({color:'#1a3560'})} position={[-0.33+k*0.11,0,0.013]}><boxGeometry args={[0.007,0.56,0.004]}/></mesh>)}
                {Array.from({length:5},(_,k)=><mesh key={k} material={new THREE.MeshBasicMaterial({color:'#1a3560'})} position={[0,-0.22+k*0.11,0.013]}><boxGeometry args={[0.8,0.006,0.004]}/></mesh>)}
              </group>
            );
          })}
          <mesh material={bodyMat} position={[s*1.55,0,0]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[0.008,0.008,0.14,6]}/></mesh>
        </group>
      ))}

      <group ref={dishRef} position={[0,0.55,0]}>
        <mesh material={bodyMat}><cylinderGeometry args={[0.012,0.012,0.38,6]}/></mesh>
        <mesh material={bodyMat} position={[0,0.28,0]} rotation={[Math.PI*0.55,0,0]}><sphereGeometry args={[0.22,16,8,0,Math.PI*2,0,Math.PI*0.48]}/></mesh>
        <mesh material={thrustMat} position={[0,0.35,0.04]}><cylinderGeometry args={[0.014,0.022,0.08,8]}/></mesh>
      </group>

      {[[0.26,0],[-0.26,0],[0,0.26],[0,-0.26]].map(([tx,tz],i)=>(
        <mesh key={i} material={thrustMat} position={[tx,-0.38,tz]}><cylinderGeometry args={[0.022,0.032,0.06,8]}/></mesh>
      ))}
      <mesh material={darkMat} position={[0.3,0.1,0]}><cylinderGeometry args={[0.04,0.04,0.1,8]}/></mesh>

      <pointLight color={data.color} intensity={isSelected?14:2.5} distance={isSelected?12:8} decay={2}/>

      <Html center position={[0,1.6,0]} distanceFactor={14} style={{pointerEvents:'none'}}>
        <div onClick={() => onSelect(isSelected ? null : data.id)}
          style={{
            pointerEvents: 'auto', cursor: 'pointer',
            background:'linear-gradient(145deg,rgba(4,8,24,0.94),rgba(8,14,36,0.9))',
            border:`1px solid ${data.color}${isSelected?'cc':'55'}`,
            borderRadius:12,padding:'10px 16px',minWidth:148,
            backdropFilter:'blur(14px)',
            boxShadow:isSelected
              ?`0 0 0 2px ${data.color}88,0 20px 60px rgba(0,0,0,0.95),0 0 60px ${data.color}55`
              :`0 0 0 1px ${data.color}22,0 16px 50px rgba(0,0,0,0.9),0 0 36px ${data.color}28`,
            position:'relative',overflow:'hidden',
            transform:isSelected?'scale(1.15)':'scale(1)',
            transition:'transform 0.35s ease, box-shadow 0.35s ease, border-color 0.35s ease',
          }}
        >
          <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,transparent,${data.color}dd,transparent)`}}/>
          <div style={{position:'absolute',bottom:-22,left:'50%',width:1,height:22,background:`linear-gradient(to bottom,${data.color}55,transparent)`,transform:'translateX(-50%)'}}/>
          <p style={{fontFamily:'monospace',fontSize:'7px',letterSpacing:'0.28em',textTransform:'uppercase',color:data.color+'bb',margin:'0 0 3px'}}>◆ {data.platform}</p>
          <div style={{fontSize:'26px',fontWeight:900,letterSpacing:'-0.04em',color:'#fff',lineHeight:1,textShadow:`0 0 24px ${data.color}`,marginBottom:2}}>{data.stat}</div>
          <div style={{fontSize:'9px',fontWeight:600,color:'rgba(255,255,255,0.62)'}}>{data.label}</div>
          {isSelected && <div style={{marginTop:5,fontSize:'7px',fontFamily:'monospace',color:data.color+'88',letterSpacing:'0.15em'}}>▼ CLICK FOR DETAILS</div>}
        </div>
      </Html>
    </group>
  );
}

/* ─── Full-screen cinematic achievement modal ─── */
function Modal({ ach, onClose }) {
  if (!ach) return null;
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,1,12,0.92)',
      backdropFilter: 'blur(28px) saturate(180%)',
      animation: 'achIn 0.45s cubic-bezier(0.22,1,0.36,1)',
      cursor: 'zoom-out',
    }}>
      {/* Glow orb behind modal */}
      <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
        <div style={{ width:600, height:600, borderRadius:'50%', background:`radial-gradient(circle, ${ach.color}18 0%, transparent 70%)`, filter:'blur(40px)' }}/>
      </div>

      <div onClick={e => e.stopPropagation()} style={{
        position: 'relative',
        width: '92vw', maxWidth: 780,
        background: 'linear-gradient(135deg, rgba(4,8,22,0.98) 0%, rgba(6,10,28,0.98) 100%)',
        border: `1px solid ${ach.color}44`,
        borderRadius: 24, overflow: 'hidden',
        boxShadow: `0 0 0 1px ${ach.color}22, 0 80px 160px rgba(0,0,0,1), 0 0 120px ${ach.color}22`,
        cursor: 'default',
      }}>
        {/* Top glowing edge */}
        <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,transparent,${ach.color},transparent)` }}/>

        {/* Scanlines overlay */}
        <div style={{ position:'absolute', inset:0, backgroundImage:'repeating-linear-gradient(0deg,rgba(0,0,0,0.03) 0px,rgba(0,0,0,0.03) 1px,transparent 1px,transparent 4px)', pointerEvents:'none', zIndex:1 }}/>

        {/* Corner brackets */}
        {[['top','left'],['top','right'],['bottom','left'],['bottom','right']].map(([v,h])=>(
          <div key={v+h} style={{ position:'absolute',[v]:20,[h]:20,width:24,height:24,zIndex:2,
            borderTop:v==='top'?`2px solid ${ach.color}77`:'none',
            borderBottom:v==='bottom'?`2px solid ${ach.color}77`:'none',
            borderLeft:h==='left'?`2px solid ${ach.color}77`:'none',
            borderRight:h==='right'?`2px solid ${ach.color}77`:'none',
          }}/>
        ))}

        {/* Split layout: left stat / right info */}
        <div style={{ display:'flex', alignItems:'stretch', minHeight:340 }}>

          {/* LEFT — giant stat */}
          <div style={{
            flex:'0 0 45%', padding:'3.5rem 2.5rem',
            borderRight:`1px solid ${ach.color}22`,
            background:`linear-gradient(135deg, ${ach.color}0a 0%, transparent 60%)`,
            display:'flex', flexDirection:'column', justifyContent:'center',
          }}>
            <p style={{ fontFamily:'monospace', fontSize:'0.58rem', letterSpacing:'0.35em', textTransform:'uppercase', color:ach.color+'88', marginBottom:'1rem' }}>◆ {ach.platform}</p>
            <div style={{
              fontSize:'clamp(4rem,12vw,7rem)',
              fontWeight:900, letterSpacing:'-0.05em', lineHeight:0.85,
              color:'#fff',
              textShadow:`0 0 80px ${ach.color}99, 0 0 160px ${ach.color}44`,
              marginBottom:'1rem',
            }}>{ach.stat}</div>
            <div style={{ width:40, height:2, background:ach.color, marginBottom:'1rem', boxShadow:`0 0 12px ${ach.color}` }}/>
            <p style={{ fontFamily:'monospace', fontSize:'0.6rem', color:ach.color+'66', letterSpacing:'0.12em', textTransform:'uppercase' }}>Achievement Unlocked</p>
          </div>

          {/* RIGHT — details */}
          <div style={{ flex:1, padding:'3.5rem 2.8rem', display:'flex', flexDirection:'column', justifyContent:'center' }}>
            <h2 style={{ fontSize:'clamp(1.2rem,2.5vw,1.7rem)', fontWeight:800, color:'rgba(255,255,255,0.92)', marginBottom:'1rem', letterSpacing:'-0.025em', lineHeight:1.2 }}>
              {ach.label}
            </h2>
            <p style={{ fontSize:'0.92rem', color:'rgba(255,255,255,0.38)', lineHeight:1.8, marginBottom:'2.5rem' }}>{ach.desc}</p>

            {/* Stats row */}
            <div style={{ display:'flex', gap:'1.5rem', marginBottom:'2.5rem' }}>
              {[{l:'Platform',v:ach.platform},{l:'Status',v:'VERIFIED'},{l:'Tier',v:'Elite'}].map(({l,v})=>(
                <div key={l}>
                  <p style={{ fontFamily:'monospace', fontSize:'0.5rem', letterSpacing:'0.2em', color:'rgba(255,255,255,0.25)', textTransform:'uppercase', marginBottom:4 }}>{l}</p>
                  <p style={{ fontFamily:'monospace', fontSize:'0.72rem', fontWeight:700, color:ach.color+'cc', letterSpacing:'0.05em' }}>{v}</p>
                </div>
              ))}
            </div>

            <button onClick={onClose} style={{
              alignSelf:'flex-start', background:'transparent',
              border:`1px solid ${ach.color}44`, color:`${ach.color}cc`,
              padding:'0.6rem 2.4rem', borderRadius:100,
              fontFamily:'monospace', fontSize:'0.62rem', letterSpacing:'0.28em',
              textTransform:'uppercase', cursor:'pointer', fontWeight:700,
              transition:'all 0.25s ease',
            }}
              onMouseEnter={e=>{ e.target.style.background=`${ach.color}18`; e.target.style.borderColor=`${ach.color}99`; }}
              onMouseLeave={e=>{ e.target.style.background='transparent'; e.target.style.borderColor=`${ach.color}44`; }}
            >CLOSE TRANSMISSION</button>
          </div>
        </div>

        {/* Bottom signal bar */}
        <div style={{ height:3, background:`linear-gradient(90deg,transparent,${ach.color}88,${ach.color},${ach.color}88,transparent)`, animation:'scanBar 2s ease-in-out infinite' }}/>
      </div>
    </div>
  );
}

/* ─── Main ─── */
export default function AchievementsSection() {
  const secRef    = useRef();
  const hdrRef    = useRef();
  const canvasWrapRef = useRef();
  const scrollY   = useRef(0);                         // 0 → 1 section scroll progress
  const [selectedId, setSelectedId] = useState(null);
  const [canvasHovered, setCanvasHovered] = useState(false);
  const selectedAch = ACHIEVEMENTS.find(a => a.id === selectedId) || null;

  // Track section scroll progress (same as CertificationsSection)
  useEffect(() => {
    const fn = () => {
      const rect = secRef.current?.getBoundingClientRect();
      if (!rect) return;
      const total = secRef.current.offsetHeight - window.innerHeight;
      scrollY.current = Math.min(Math.max(0, -rect.top) / total, 1);
    };
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const { ref: viewRef, inView } = useInView({ rootMargin: '0px' });

  // Forward wheel events from canvas wrapper to page so scrolling works on canvas
  useEffect(() => {
    const el = canvasWrapRef.current;
    if (!el) return;
    const onWheel = (e) => { window.scrollBy({ top: e.deltaY, behavior: 'auto' }); };
    el.addEventListener('wheel', onWheel, { passive: true });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // DOM hover for reference (kept)
  useEffect(() => {
    const el = canvasWrapRef.current;
    if (!el) return;
    const enter = () => setCanvasHovered(true);
    const leave = () => setCanvasHovered(false);
    el.addEventListener('mouseenter', enter);
    el.addEventListener('mouseleave', leave);
    return () => { el.removeEventListener('mouseenter', enter); el.removeEventListener('mouseleave', leave); };
  }, []);

  useEffect(()=>{
    if(!hdrRef.current)return;
    const ctx=gsap.context(()=>{
      gsap.fromTo(hdrRef.current,{opacity:0,y:40},{opacity:1,y:0,duration:1.4,ease:'power4.out',
        scrollTrigger:{trigger:hdrRef.current,start:'top 88%',toggleActions:'play none none reverse'}});
    },secRef);
    return()=>ctx.revert();
  },[]);

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  return(
    <section ref={(el) => { secRef.current = el; viewRef.current = el; }} id="section-achievements"
      style={{position:'relative',width:'100vw',height: isMobile ? '100vh' : '350vh',background:'#00000a'}}>

      <div style={{position:'sticky',top:0,width:'100vw',height:'100vh',overflow:'hidden'}}>

        {/* Top fade */}
        <div style={{
          position:'absolute',top:0,left:0,right:0,height:'18vh',
          background:'linear-gradient(to bottom, #00000a 0%, transparent 100%)',
          pointerEvents:'none',zIndex:25,
        }}/>

        {/* Bottom fade — blends seamlessly into CertificationsSection */}
        <div style={{
          position:'absolute',bottom:0,left:0,right:0,height:'22vh',
          background:'linear-gradient(to top, #00000a 0%, transparent 100%)',
          pointerEvents:'none',zIndex:25,
        }}/>

        {/* Minimal corner label */}
        <div ref={hdrRef} style={{position:'absolute',top:'2rem',left:'4vw',zIndex:30,pointerEvents:'none',display:'flex',alignItems:'center',gap:'1rem'}}>
          <div style={{width:'2rem',height:'1px',background:'rgba(255,255,255,0.18)'}}/>
          <span style={{fontFamily:'monospace',color:'rgba(255,255,255,0.28)',fontSize:'0.6rem',textTransform:'uppercase',letterSpacing:'0.4em',fontWeight:500}}>Achievements</span>
        </div>
        <div style={{position:'absolute',top:'2.2rem',right:'4vw',zIndex:30,pointerEvents:'none'}}>
          <span style={{fontFamily:'monospace',color:'rgba(255,255,255,0.12)',fontSize:'0.52rem',letterSpacing:'0.15em',textTransform:'uppercase'}}>Drag · Scroll to zoom · Click satellite</span>
        </div>

        {/* Bottom labels */}
        <div style={{position:'absolute',bottom:'2.2rem',left:0,right:0,zIndex:30,display:'flex',justifyContent:'center',gap:'5vw',flexWrap:'wrap'}}>
          {ACHIEVEMENTS.map(a=>(
            <button key={a.id} onClick={()=>setSelectedId(a.id===selectedId?null:a.id)}
              style={{textAlign:'center',background:'none',border:'none',cursor:'pointer',padding:'0.4rem 0.7rem',
                transition:'transform 0.25s ease,opacity 0.3s ease',opacity:selectedId&&selectedId!==a.id?0.25:1}}
              onMouseEnter={e=>e.currentTarget.style.transform='translateY(-5px)'}
              onMouseLeave={e=>e.currentTarget.style.transform='translateY(0)'}
            >
              <div style={{width:7,height:7,borderRadius:'50%',background:a.color,margin:'0 auto 0.5rem',boxShadow:`0 0 10px ${a.color},0 0 24px ${a.color}77`}}/>
              <p style={{fontFamily:'monospace',color:'rgba(255,255,255,0.28)',fontSize:'0.5rem',textTransform:'uppercase',letterSpacing:'0.15em',margin:'0 0 2px'}}>{a.platform}</p>
              <p style={{color:'rgba(255,255,255,0.7)',fontSize:'0.7rem',fontWeight:700,margin:0}}>{a.label}</p>
            </button>
          ))}
        </div>

        <div ref={canvasWrapRef} style={{position:'absolute',inset:0,zIndex:0}}>
        <Canvas
          camera={{position:[0,5,55],fov:52}}
          gl={{antialias:false,toneMappingExposure:1.4,toneMapping:THREE.ACESFilmicToneMapping}}
          dpr={[1, 1]}
          frameloop={inView ? 'always' : 'never'}
          style={{position:'absolute',inset:0}}
        >
          <color attach="background" args={['#00000a']} />
          <fog attach="fog" args={['#01020d',55,130]}/>
          {/* Cinematic lighting */}
          <directionalLight position={[28,18,12]} intensity={3.2} color="#fff8ee"/>
          <directionalLight position={[-22,-8,-18]} intensity={0.12} color="#3355ff"/>
          <ambientLight intensity={0.03}/>

          <Stars/>

          {/* Rich Hubble-palette nebulae — 6 layers restored for full cinematic depth */}
          <Nebula position={[-38,14,-68]} scale={62} color="#cc2299" timeOffset={0} rotation={[0.3,-0.4,0.15]}/>
          <Nebula position={[42,-10,-75]} scale={70} color="#00bbcc" timeOffset={3} rotation={[-0.2,0.5,-0.1]}/>
          <Nebula position={[8,32,-72]} scale={58} color="#ff6600" timeOffset={7} rotation={[0.1,-0.2,0.4]}/>
          <Nebula position={[-18,-22,-60]} scale={48} color="#6622dd" timeOffset={2} rotation={[0.5,0.3,-0.2]}/>
          <Nebula position={[30,20,-80]} scale={65} color="#ff2255" timeOffset={5} rotation={[-0.1,0.2,0.3]}/>
          <Nebula position={[-48,-8,-70]} scale={55} color="#0044ff" timeOffset={9} rotation={[0.2,0.1,-0.3]}/>

          <GalaxyCore/>
          <AsteroidBelt/>
          <Meteors/>
          <Earth/>
          <EarthAurora/>
          <SunFlare/>
          <SpaceDust/>

          {ACHIEVEMENTS.map(a=><OrbitTrail key={a.id} radius={a.orbitR} tilt={a.tilt} color={a.color}/>)}
          {ACHIEVEMENTS.map((a,i)=><Satellite key={a.id} data={a} index={i} selected={selectedId} onSelect={setSelectedId}/>)}

          <OrbitControls
            enablePan={false}
            enableZoom={false}
            enableDamping
            dampingFactor={0.06}
            rotateSpeed={0.55}
            target={[0,0,0]}
          />
          <ScrollZoom scrollY={scrollY} />
          <EffectComposer>
            <Bloom intensity={0.7} luminanceThreshold={0.18} luminanceSmoothing={0.75} radius={0.8} blendFunction={BlendFunction.ADD}/>
            <ChromaticAberration offset={CA_OFFSET} radialModulation={false} modulationOffset={0}/>
            <Vignette eskil={false} offset={0.1} darkness={0.9}/>
          </EffectComposer>
        </Canvas>
        </div>
      </div>

      <Modal ach={selectedAch} onClose={()=>setSelectedId(null)}/>
      <style>{`
        @keyframes achIn{from{opacity:0;transform:scale(0.93) translateY(12px)}to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes scanBar{0%,100%{opacity:0.4;transform:scaleX(0.5)}50%{opacity:1;transform:scaleX(1)}}
      `}</style>
    </section>
  );
}
