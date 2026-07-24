'use client';

import { ReactNode, useState } from 'react';
import { motion } from 'framer-motion';

interface NeoCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: 'cyan' | 'purple' | 'blue' | 'pink';
  delay?: number;
}

export default function NeoCard({ children, className = '', glowColor = 'purple', delay = 0 }: NeoCardProps) {
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);

  const glowClasses = {
    cyan: 'hover:glow-cyan hover:border-neon-cyan/50',
    purple: 'hover:glow-purple hover:border-neon-purple/50',
    blue: 'hover:glow-blue hover:border-neon-blue/50',
    pink: 'hover:glow-pink hover:border-neon-pink/50'
  };

  const initialGlow = {
    cyan: 'border-cyan-500/10 shadow-[0_0_10px_rgba(0,242,254,0.02)]',
    purple: 'border-purple-500/10 shadow-[0_0_10px_rgba(157,78,221,0.02)]',
    blue: 'border-blue-500/10 shadow-[0_0_10px_rgba(59,130,246,0.02)]',
    pink: 'border-pink-500/10 shadow-[0_0_10px_rgba(244,63,94,0.02)]'
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left - width / 2;
    const mouseY = e.clientY - rect.top - height / 2;

    // Limit rotations to max 12 degrees
    const rX = -(mouseY / height) * 12;
    const rY = (mouseX / width) * 12;

    setRotateX(rX);
    setRotateY(rY);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      animate={{
        y: [0, -5, 0],
        rotateX,
        rotateY
      }}
      transition={{
        y: {
          duration: 5,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "easeInOut",
          delay: delay * 0.3
        },
        rotateX: { type: 'spring', stiffness: 300, damping: 20 },
        rotateY: { type: 'spring', stiffness: 300, damping: 20 },
        default: { duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileHover={{ y: -10, scale: 1.025, transition: { duration: 0.2 } }}
      style={{
        transformStyle: 'preserve-3d',
        perspective: 1000
      }}
      className={`glassmorphism border rounded-xl p-6 transition-all duration-300 wave-reveal ${initialGlow[glowColor]} ${glowClasses[glowColor]} ${className}`}
    >
      {children}
    </motion.div>
  );
}
