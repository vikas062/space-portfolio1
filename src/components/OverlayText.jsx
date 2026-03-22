import React from 'react';
import { motion } from 'framer-motion';

export default function OverlayText() {
  const containerVars = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.5,
      }
    }
  };

  const itemVars = {
    hidden: { opacity: 0, y: 50 },
    show: { 
      opacity: 1, 
      y: 0, 
      transition: { 
        type: 'spring', 
        stiffness: 100, 
        damping: 20 
      } 
    }
  };

  return (
    <motion.div 
      className="text-overlay"
      variants={containerVars}
      initial="hidden"
      animate="show"
    >
      <motion.h1 className="hero-title" variants={itemVars}>
        Crafting Digital <br/> Experiences
      </motion.h1>
      <motion.p className="hero-subtitle" variants={itemVars}>
        I build high-performance, beautiful applications that fuse storytelling with state-of-the-art web technology.
      </motion.p>
      
      <motion.div variants={itemVars} style={{ marginTop: '2rem' }}>
        <button style={{
          padding: '1rem 2rem',
          background: 'var(--text-primary)',
          color: 'var(--bg-dark)',
          border: 'none',
          borderRadius: '50px',
          fontSize: '1.1rem',
          fontWeight: 600,
          cursor: 'pointer',
          pointerEvents: 'auto',
          boxShadow: '0 10px 30px rgba(255,255,255,0.2)'
        }}>
          Explore Work
        </button>
      </motion.div>
    </motion.div>
  );
}
