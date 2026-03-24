import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Environment, MeshTransmissionMaterial, Html } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from '../hooks/useInView';
import { useStableVisible } from '../hooks/useStableVisible';
import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// ── Devicon class map ─────────────────────────────────────────────────────────
const ICON_MAP = {
  'React.js':    'devicon-react-original colored',
  'Next.js':     'devicon-nextjs-plain colored',
  'Tailwind':    'devicon-tailwindcss-original colored',
  'GSAP':        'devicon-javascript-plain colored',
  'Three.js':    'devicon-threejs-original colored',
  'Framer':      'devicon-figma-plain colored',
  'Node.js':     'devicon-nodejs-plain colored',
  'Express':     'devicon-express-original colored',
  'GraphQL':     'devicon-graphql-plain colored',
  'REST API':    'devicon-fastapi-plain colored',
  'Socket.io':   'devicon-socketio-original colored',
  'MongoDB':     'devicon-mongodb-plain colored',
  'PostgreSQL':  'devicon-postgresql-plain colored',
  'Firebase':    'devicon-firebase-plain colored',
  'Redis':       'devicon-redis-plain colored',
  'Prisma':      'devicon-prisma-original colored',
  'Git/GitHub':  'devicon-github-original colored',
  'Docker':      'devicon-docker-plain colored',
  'Vercel':      'devicon-vercel-original colored',
  'AWS':         'devicon-amazonwebservices-plain colored',
  'CI/CD':       'devicon-git-plain colored',
  'VS Code':     'devicon-vscode-plain colored',
  'Postman':     'devicon-postman-plain colored',
  'Figma':       'devicon-figma-plain colored',
  'Linux':       'devicon-linux-plain colored',
  'Jira':        'devicon-jira-plain colored',
  'npm':         'devicon-npm-original colored',
};

// ── Data ─────────────────────────────────────────────────────────────────────
const DOMAINS = [
  {
    id: 'frontend', label: 'Frontend',
    color: '#aa77ff',
    techs: ['React.js', 'Next.js', 'Tailwind', 'GSAP', 'Three.js', 'Framer'],
  },
  {
    id: 'backend', label: 'Backend',
    color: '#33aaff',
    techs: ['Node.js', 'Express', 'GraphQL', 'REST API', 'Socket.io'],
  },
  {
    id: 'database', label: 'Database',
    color: '#55ddaa',
    techs: ['MongoDB', 'PostgreSQL', 'Firebase', 'Redis', 'Prisma'],
  },
  {
    id: 'devops', label: 'DevOps',
    color: '#ff9944',
    techs: ['Git/GitHub', 'Docker', 'Vercel', 'AWS', 'CI/CD'],
  },
  {
    id: 'tools', label: 'Tools',
    color: '#ff5580',
    techs: ['VS Code', 'Postman', 'Figma', 'Linux', 'Jira', 'npm'],
  },
];

// ── Floating 3D Tech Badge ────────────────────────────────────────────────────
function TechOrb({ name, index, total, color }) {
  const ref = useRef();
  const meshRef = useRef();
  const angle = (index / total) * Math.PI * 2;
  const radius = 3.5;

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const spin = t * 0.4;
    ref.current.position.x = Math.cos(angle + spin) * radius;
    ref.current.position.z = Math.sin(angle + spin) * radius;
    ref.current.position.y = Math.sin(t * 0.8 + index) * 0.6;
    meshRef.current.rotation.x += 0.02;
    meshRef.current.rotation.y += 0.03;
  });

  return (
    <group ref={ref}>
      <Float speed={2} rotationIntensity={1} floatIntensity={1.5}>
        <mesh ref={meshRef}>
          <sphereGeometry args={[0.55, 32, 32]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.4}
            roughness={0.2}
            metalness={0.5}
            transparent
            opacity={0.25}
          />
        </mesh>
        <Html center distanceFactor={6} style={{ pointerEvents: 'none' }} zIndexRange={[0, 0]}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            background: 'rgba(8, 8, 14, 0.55)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: `1px solid ${color}33`,
            borderRadius: '14px',
            padding: '10px 14px',
            minWidth: '80px',
            boxShadow: `0 0 16px ${color}33`,
          }}>
            <i className={ICON_MAP[name] || 'devicon-github-original colored'} style={{ fontSize: '28px' }} />
            <span style={{
              color: '#fff',
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              fontFamily: 'Inter, sans-serif',
            }}>
              {name}
            </span>
          </div>
        </Html>
      </Float>
    </group>
  );
}

// ── Burst Dust Particles ──────────────────────────────────────────────────────
function DustParticles({ color, burstTrigger }) {
  const pointsRef = useRef();
  const COUNT = 500;
  const explosionTimeRef = useRef(null);
  const prevTrigger = useRef(0);

  const data = useMemo(() => {
    const positions  = new Float32Array(COUNT * 3);
    const velocities = new Float32Array(COUNT * 3);
    const speeds     = new Float32Array(COUNT);
    const offsets    = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 12;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 14;
      // Random outward burst direction (unit sphere)
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      const spd   = 0.2 + Math.random() * 0.5;
      velocities[i * 3]     = Math.sin(phi) * Math.cos(theta) * spd;
      velocities[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * spd;
      velocities[i * 3 + 2] = Math.cos(phi) * spd;
      speeds[i]  = 0.06 + Math.random() * 0.2;
      offsets[i] = Math.random() * Math.PI * 2;
    }
    return { positions, velocities, speeds, offsets };
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (!pointsRef.current) return;
    const pos = pointsRef.current.geometry.attributes.position;

    // Detect new burst trigger
    if (burstTrigger !== prevTrigger.current) {
      prevTrigger.current = burstTrigger;
      explosionTimeRef.current = t;
      // Collapse all particles to origin so they burst outward from center
      for (let i = 0; i < COUNT; i++) {
        pos.array[i * 3]     = (Math.random() - 0.5) * 0.5;
        pos.array[i * 3 + 1] = (Math.random() - 0.5) * 0.5;
        pos.array[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
      }
    }

    const since = explosionTimeRef.current !== null ? t - explosionTimeRef.current : 9999;
    const isBursting = since < 3.0;

    for (let i = 0; i < COUNT; i++) {
      if (isBursting) {
        // Exponential decay: fast at first, slows to a gentle drift
        const decay = Math.exp(-since * 1.4);
        pos.array[i * 3]     += data.velocities[i * 3]     * decay;
        pos.array[i * 3 + 1] += data.velocities[i * 3 + 1] * decay;
        pos.array[i * 3 + 2] += data.velocities[i * 3 + 2] * decay;
      } else {
        // Gentle ambient drift
        pos.array[i * 3 + 1] += data.speeds[i] * 0.01;
        pos.array[i * 3]     += Math.sin(t * 0.3 + data.offsets[i]) * 0.003;
        pos.array[i * 3 + 2] += Math.cos(t * 0.2 + data.offsets[i]) * 0.003;
        if (pos.array[i * 3 + 1] > 7) pos.array[i * 3 + 1] = -7;
      }
    }
    pos.needsUpdate = true;
  });

  const threeColor = useMemo(() => new THREE.Color(color), [color]);

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={data.positions}
          count={COUNT}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        sizeAttenuation
        color={threeColor}
        transparent
        opacity={0.75}
        depthWrite={false}
      />
    </points>
  );
}

// ── Central 3D TorusKnot (clickable) ─────────────────────────────────────────
function CenterShape({ color, onBurst }) {
  const ref = useRef();
  const [hovered, setHovered] = useState(false);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.x = clock.getElapsedTime() * 0.3;
    ref.current.rotation.y = clock.getElapsedTime() * 0.5;
    // Pulse scale up on hover
    const target = hovered ? 1.65 : 1.4;
    ref.current.scale.x += (target - ref.current.scale.x) * 0.08;
    ref.current.scale.y = ref.current.scale.x;
    ref.current.scale.z = ref.current.scale.x;
  });

  return (
    <Float speed={1.5} rotationIntensity={0.5} floatIntensity={0.8}>
      <mesh
        ref={ref}
        onClick={(e) => { e.stopPropagation(); onBurst(); }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <torusKnotGeometry args={[1, 0.28, 128, 16]} />
        <MeshTransmissionMaterial
          color={color}
          transmission={0.85}
          thickness={0.5}
          roughness={0.05}
          ior={1.6}
          chromaticAberration={0.05}
          backside
        />
      </mesh>
    </Float>
  );
}

// ── R3F Scene ──────────────────────────────────────────────────────────────────
function Scene({ domain }) {
  const [burstTrigger, setBurstTrigger] = useState(0);
  if (!domain) return null;

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[5, 5, 5]} intensity={2} color={domain.color} />
      <pointLight position={[-5, -5, -5]} intensity={1} />
      <Environment preset="city" />

      <DustParticles color={domain.color} burstTrigger={burstTrigger} />

      <CenterShape color={domain.color} onBurst={() => setBurstTrigger(n => n + 1)} />

      {domain.techs.map((name, i) => (
        <TechOrb
          key={name}
          name={name}
          index={i}
          total={domain.techs.length}
          color={domain.color}
        />
      ))}
    </>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────
export default function SkillsSection() {
  const secRef = useRef();
  const [activeDomain, setActiveDomain] = useState('tools');
  const active = DOMAINS.find(d => d.id === activeDomain);
  const { ref: viewRef, inView } = useInView({ rootMargin: '200px 0px' });
  const isMobile = window.innerWidth <= 768;

  // Pin the section for 2× viewport so user sees the 3D before scrolling away
  useEffect(() => {
    if (isMobile) return;
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: secRef.current,
        start: 'top top',
        end: `+=${window.innerHeight * 2}`,
        pin: true,
        pinSpacing: true,
      });
    });
    return () => ctx.revert();
  }, [isMobile]);

  return (
    <section
      ref={(el) => { secRef.current = el; viewRef.current = el; }}
      id="section-skills"
      onMouseLeave={() => setActiveDomain('tools')}
      style={{
        width: '100vw',
        minHeight: '100vh',
        backgroundColor: '#050505',
        position: 'relative',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: isMobile ? 'flex-start' : 'center',
        alignItems: isMobile ? 'stretch' : 'center',
        overflow: 'hidden',
      }}
    >
      {/* ── Domain list ─────────────────────────────── */}
      <div style={{
        position: isMobile ? 'relative' : 'absolute',
        left: isMobile ? 'auto' : '6vw',
        top: isMobile ? 'auto' : '50%',
        transform: isMobile ? 'none' : 'translateY(-50%)',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: isMobile ? '0.8rem' : '1.5rem',
        padding: isMobile ? '3rem 6vw 1.5rem' : '0',
      }}>
        <p style={{
          color: 'rgba(255,255,255,0.4)',
          fontSize: isMobile ? '0.75rem' : '1.6rem',
          textTransform: 'uppercase',
          letterSpacing: '0.25em',
          marginBottom: isMobile ? '0.5rem' : '1rem',
          fontWeight: 600,
        }}>
          Skills
        </p>

        {DOMAINS.map(domain => (
          <motion.h2
            key={domain.id}
            onHoverStart={() => setActiveDomain(domain.id)}
            onClick={() => setActiveDomain(activeDomain === domain.id ? null : domain.id)}
            animate={{
              color: activeDomain === domain.id ? domain.color : '#c0c0c0',
              x: activeDomain === domain.id ? 18 : 0,
              scale: activeDomain === domain.id ? 1.05 : 1,
            }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            style={{
              fontSize: isMobile ? 'clamp(2rem, 8vw, 3rem)' : 'clamp(3.5rem, 6vw, 7rem)',
              fontWeight: 900,
              textTransform: 'uppercase',
              cursor: 'pointer',
              margin: 0,
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
              userSelect: 'none',
              WebkitTextStroke: '0px',
            }}
          >
            {domain.label}
          </motion.h2>
        ))}
      </div>

      {/* Left shield — gradient covers text area, hides 3D Html badges that drift left */}
      {!isMobile && (
        <div style={{
          position:'absolute', left:0, top:0, bottom:0,
          width:'46%',
          background:'linear-gradient(to right, #050505 60%, transparent 100%)',
          zIndex:8, pointerEvents:'none',
        }}/>
      )}

      {/* ── 3D Canvas Panel ─────────────────────────── */}
      <div style={{
        position: isMobile ? 'relative' : 'absolute',
        right: isMobile ? 'auto' : 0,
        top: isMobile ? 'auto' : 0,
        width: isMobile ? '100%' : '60%',
        height: isMobile ? '50vw' : '100%',
        minHeight: isMobile ? '300px' : 'auto',
        zIndex: 5,
        pointerEvents: 'auto',
        overflow: 'hidden',
      }}>
        <AnimatePresence mode="wait">
          {active && (
            <motion.div
              key={active.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{ width: '100%', height: '100%', position: 'relative' }}
            >
              {/* Glow */}
              <div style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: isMobile ? '60vw' : '700px',
                height: isMobile ? '60vw' : '700px',
                background: `radial-gradient(circle, ${active.color} 15%, transparent 65%)`,
                opacity: 0.85, mixBlendMode: 'screen',
                filter: 'blur(40px)', pointerEvents: 'none', zIndex: 0
              }} />
              <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: isMobile ? 'none' : 'auto' }}>
                <Canvas 
                  camera={{ position: [0, 0, 8], fov: 50 }}
                  dpr={[1, 1]}
                  frameloop={inView ? 'always' : 'demand'}
                  gl={{ antialias: false, powerPreference: 'high-performance' }}
                >
                  <Scene domain={active} />
                </Canvas>
              </div>
            </motion.div>
          )}
        </AnimatePresence>


      </div>
    </section>
  );
}
