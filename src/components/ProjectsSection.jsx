import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useInView } from '../hooks/useInView';

const PROJECTS = [
  { id: 1, name: 'DSA Compass', image: '/projects/project1.png', link: '#' },
  { id: 2, name: 'Cohort',      image: '/projects/project2.png', link: 'https://cohort-zeta.vercel.app/' },
];

const LENS_R = 90;

// ── Lens Window ───────────────────────────────────────────────────────────────
function useLens(canvasRef, imgRef, mp, it, inView) {
  const inViewRef = useRef(inView);
  inViewRef.current = inView;

  useEffect(() => {
    const canvas = canvasRef.current, ctx = canvas.getContext('2d'), img = imgRef.current;
    let t = 0, raf;
    const resize = () => {
      // Cap DPR to 1.5 to save performance on retina
      const dpr = Math.min(devicePixelRatio, 1.5);
      canvas.width  = (canvas.offsetWidth  || window.innerWidth)  * dpr;
      canvas.height = (canvas.offsetHeight || window.innerHeight) * dpr;
    };
    resize();
    window.addEventListener('resize', resize);
    const draw = () => {
      raf = requestAnimationFrame(draw);
      if (!inViewRef.current) return; // Skip 100% of GPU work when offscreen
      
      t += 0.05;
      const W=canvas.width, H=canvas.height, dpr=Math.min(devicePixelRatio, 1.5);
      const mx=mp.current.x*dpr, my=mp.current.y*dpr;
      const R=Math.round(LENS_R*dpr*it.current);
      ctx.clearRect(0,0,W,H);
      if(!img.complete||!img.naturalWidth||R<2) return;
      const sc=Math.max(W/img.naturalWidth,H/img.naturalHeight);
      const bx=(W-img.naturalWidth*sc)/2, by=(H-img.naturalHeight*sc)/2;
      const zoom=1.3+Math.sin(t*.7)*.02;
      const sx=(mx-bx)/sc, sy=(my-by)/sc, sr=(R/sc)/zoom;
      ctx.save();ctx.beginPath();ctx.arc(mx,my,R,0,Math.PI*2);ctx.clip();
      ctx.drawImage(img,sx-sr,sy-sr,sr*2,sr*2,mx-R,my-R,R*2,R*2);
      const w=Math.sin(t*3.5)*5;
      ctx.globalAlpha=.15;ctx.drawImage(img,sx-sr+w/sc,sy-sr,sr*2,sr*2,mx-R,my-R,R*2,R*2);ctx.globalAlpha=1;
      const g=ctx.createRadialGradient(mx-R*.28,my-R*.28,0,mx,my,R);
      g.addColorStop(0,'rgba(255,255,255,.16)');g.addColorStop(.45,'rgba(255,255,255,.05)');g.addColorStop(1,'rgba(255,255,255,0)');
      ctx.fillStyle=g;ctx.fill();ctx.restore();
      ctx.save();ctx.beginPath();ctx.arc(mx,my,R,0,Math.PI*2);
      ctx.strokeStyle=`rgba(255,255,255,${.8*it.current})`;ctx.lineWidth=1.5*dpr;ctx.stroke();ctx.restore();
    };
    raf=requestAnimationFrame(draw);
    return()=>{cancelAnimationFrame(raf);window.removeEventListener('resize',resize);};
  },[]);
}

// ── Card ──────────────────────────────────────────────────────────────────────
function Card({ project, inView }) {
  const wrapRef=useRef(null), imgRef=useRef(null), canvasRef=useRef(null), lensRef=useRef(null);
  const mp=useRef({x:-999,y:-999}), it=useRef(0);
  useLens(canvasRef,imgRef,mp,it,inView);

  const onMove=e=>{
    const r=wrapRef.current.getBoundingClientRect();
    mp.current={x:e.clientX-r.left,y:e.clientY-r.top};
    if(lensRef.current){lensRef.current.style.left=`${mp.current.x}px`;lensRef.current.style.top=`${mp.current.y}px`;}

    // Dynamic 3D screen shake/float effect
    const nx = (e.clientX / window.innerWidth - 0.5) * 2;   // -1 to 1
    const ny = (e.clientY / window.innerHeight - 0.5) * 2;  // -1 to 1

    gsap.to(wrapRef.current, {
      x: nx * -40,
      y: ny * -40,
      rotationY: nx * 6,
      rotationX: ny * -6,
      scale: 1.08,             // scale up slightly so edges don't show when moving
      duration: 0.8,
      ease: 'power2.out',
      overwrite: 'auto'
    });
  };
  const onEnter=()=>{
    gsap.to(it,{current:1,duration:.4,ease:'power2.out',overwrite:true});
    lensRef.current&&gsap.to(lensRef.current,{opacity:1,scale:1,duration:.35,ease:'back.out(2)'});
  };
  const onLeave=()=>{
    mp.current={x:-999,y:-999};
    gsap.to(it,{current:0,duration:.4,ease:'power2.in',overwrite:true});
    lensRef.current&&gsap.to(lensRef.current,{opacity:0,scale:.4,duration:.2});

    // Reset 3D transform when mouse leaves
    gsap.to(wrapRef.current, {
      x: 0, y: 0, rotationY: 0, rotationX: 0, scale: 1,
      duration: 1.5, ease: 'power3.out', overwrite: 'auto'
    });
  };

  const onClick = () => {
    if (project.link && project.link !== '#') {
      window.open(project.link, '_blank'); // Opens the URL in a new tab
    }
  };

  return(
    <div ref={wrapRef} style={{position:'absolute',inset:0,cursor:'none',perspective:'1200px',transformOrigin:'center center'}}
      onMouseMove={onMove} onMouseEnter={onEnter} onMouseLeave={onLeave} onClick={onClick}>
      <img ref={imgRef} src={project.image} alt={project.name}
        style={{width:'100%',height:'100%',objectFit:'cover',display:'block',pointerEvents:'none',userSelect:'none'}}/>
      <div style={{position:'absolute',inset:0,background:'linear-gradient(135deg,rgba(255,255,255,.1) 0%,rgba(255,255,255,.03) 35%,transparent 65%)',pointerEvents:'none',mixBlendMode:'overlay'}}/>
      <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse at center,transparent 50%,rgba(0,0,0,.55) 100%)',pointerEvents:'none'}}/>
      <canvas ref={canvasRef} style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none'}}/>
      {/* VIEW lens */}
      <div ref={lensRef} style={{position:'absolute',left:0,top:0,width:LENS_R*2,height:LENS_R*2,transform:'translate(-50%,-50%)',display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'none',opacity:0,zIndex:10}}>
        <span style={{color:'#fff',fontSize:'11px',fontWeight:700,fontFamily:'Inter,sans-serif',letterSpacing:'.18em',textTransform:'uppercase',textShadow:'0 1px 8px rgba(0,0,0,.95)'}}>VIEW</span>
      </div>
      {/* Label */}
      <div style={{position:'absolute',bottom:'2rem',left:'2.5rem',zIndex:20,pointerEvents:'none'}}>
        <p style={{color:'rgba(255,255,255,.35)',fontSize:'.7rem',fontFamily:'Inter,sans-serif',fontWeight:500,letterSpacing:'.2em',textTransform:'uppercase',margin:0}}>
          {String(project.id).padStart(2,'0')} / {project.name}
        </p>
      </div>
    </div>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────
export default function ProjectsSection() {
  const outerRef = useRef(null);
  const stageRef = useRef(null);
  const c1Ref    = useRef(null);   // front
  const c2Ref    = useRef(null);   // slides up from below
  
  const { ref: viewRef, inView } = useInView({ rootMargin: '200px 0px' });

  useEffect(() => {
    const c1 = c1Ref.current;
    const c2 = c2Ref.current;
    const outer = outerRef.current;

    const onScroll = () => {
      const rect  = outer.getBoundingClientRect();
      const total = outer.offsetHeight - window.innerHeight;
      const scrolled = Math.max(0, -rect.top);
      const raw = Math.min(scrolled / total, 1);

      // Total scroll is massive.
      // 0 to 0.2: Hold Project 1 entirely
      // 0.2 to 0.8: VERY slow, luxurious transition
      // 0.8 to 1.0: Hold Project 2 entirely
      const p    = Math.min(1, Math.max(0, (raw - 0.2) / 0.6));
      const ease = p < 0.5 ? 2*p*p : -1 + (4-2*p)*p;

      // c1: Very slow, gentle zoom out, fade out, and soft depth blur
      const sc1 = 1 + ease * 0.08;
      const op1 = Math.max(0, 1 - ease * 1.8);
      const blur1 = ease * 8; // subtle back-blur
      const dark1 = ease * 0.5; // darkens by up to 50%
      c1.style.transform = `scale(${sc1})`;
      c1.style.opacity   = op1;
      c1.style.filter    = `blur(${blur1}px) brightness(${1 - dark1})`;

      // c2: Slow, graceful slide up from bottom with a slight parallax scale from 0.92
      const yPct = 100 * (1 - ease);
      const sc2  = 0.92 + (0.08 * ease);
      c2.style.clipPath  = 'none'; // remove previous circle mask explicitly
      c2.style.transform = `translateY(${yPct}vh) scale(${sc2})`;
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); 
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div ref={(el) => { outerRef.current = el; viewRef.current = el; }} id="section-projects"
      style={{position:'relative',width:'100vw',height:'250vh',backgroundColor:'#07070c'}}>

      {/* Sticky stage */}
      <div ref={stageRef}
        style={{position:'sticky',top:0,width:'100vw',height:'100vh',overflow:'hidden',backgroundColor:'#07070c'}}>

        {/* Card 1 — Back layer zooming out into darkness */}
        <div ref={c1Ref} style={{position:'absolute',inset:0,transformOrigin:'center center',zIndex:1}}>
          <Card project={PROJECTS[0]} inView={inView} />
        </div>

        {/* Card 2 — Floating up elegantly from off-screen on top */}
        <div ref={c2Ref} style={{position:'absolute',inset:0,transformOrigin:'center center',zIndex:2,transform:'translateY(100vh)'}}>
          <Card project={PROJECTS[1]} inView={inView} />
        </div>

      </div>
    </div>
  );
}
