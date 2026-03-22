import React, { useEffect, useRef } from 'react';
import { ReactLenis } from 'lenis/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import HeroSequence from './components/HeroSequence';
import OverlayNav from './components/OverlayNav';
import SkillsSection from './components/SkillsSection';
import ProjectsSection from './components/ProjectsSection';
import CertificationsSection from './components/CertificationsSection';
import AchievementsSection from './components/AchievementsSection';
import ContactSection from './components/ContactSection';

gsap.registerPlugin(ScrollTrigger);

function App() {
  const lenisRef = useRef(null);

  useEffect(() => {
    // Sync Lenis scroll with GSAP ticker for frame-perfect animations without jitter
    function update(time) {
      lenisRef.current?.lenis?.raf(time * 1000);
    }
    gsap.ticker.add(update);
    // Disable GSAP's default lag smoothing to prevent conflicts with Lenis momentum
    gsap.ticker.lagSmoothing(0);
    
    return () => {
      gsap.ticker.remove(update);
    };
  }, []);

  return (
    <ReactLenis root ref={lenisRef} autoRaf={false} options={{ lerp: 0.05, duration: 1.2, smoothWheel: true }}>
      <div className="app-container">
        <OverlayNav />
        {/* Hero section — "Home" nav link scrolls here */}
        <div id="section-home" style={{ position: 'relative' }}>
          <HeroSequence />
        </div>
        
        {/* Interactive Tech Stacks Section */}
        <SkillsSection />

        {/* Projects Showcase — premium WebGL distortion + parallax */}
        <ProjectsSection />

        {/* Horizontal Scroll Awards/Certifications sequence */}
        <CertificationsSection />
        <AchievementsSection />
        
        {/* Deep Space Contact Footer */}
        <ContactSection />
      </div>
    </ReactLenis>
  );
}

export default App;
