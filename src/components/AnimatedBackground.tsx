'use client';

import { useEffect, useRef } from 'react';

export default function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Track mouse position
    const mouse = {
      x: null as number | null,
      y: null as number | null,
      radius: 150
    };

    // Lists of dynamic objects
    const particles: Particle[] = [];
    const bubbles: Bubble[] = [];
    const bubbleFragments: BubbleFragment[] = [];
    const ripples: Ripple[] = [];
    const caustics: CausticRay[] = [];

    // Trigger expansion ripples on mouse move (throttled) and clicks
    let lastRippleTime = 0;
    const handleMouseMove = (event: MouseEvent) => {
      mouse.x = event.clientX;
      mouse.y = event.clientY;

      // Spawn subtle trail ripples on mouse move
      const now = Date.now();
      if (now - lastRippleTime > 150) {
        ripples.push(new Ripple(event.clientX, event.clientY, 80, 0.8, 1));
        lastRippleTime = now;
      }

      // Check bubble collisions on hover to pop them
      checkBubbleCollisions(event.clientX, event.clientY);
    };

    const handleClick = (event: MouseEvent) => {
      // Spawn large click ripples
      ripples.push(new Ripple(event.clientX, event.clientY, 180, 2.5, 0.45));
      checkBubbleCollisions(event.clientX, event.clientY, true);
    };

    const checkBubbleCollisions = (x: number, y: number, forcePop = false) => {
      for (let i = 0; i < bubbles.length; i++) {
        const b = bubbles[i];
        if (!b.popped) {
          const dist = Math.hypot(b.x - x, b.y - y);
          // Pop if hovered or clicked inside radius
          if (dist < b.size + (forcePop ? 25 : 12)) {
            b.pop();
          }
        }
      }
    };

    const handleMouseLeave = () => {
      mouse.x = null;
      mouse.y = null;
    };

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('resize', handleResize);

    // 1. Constellation Particles
    const particleCount = Math.min(60, Math.floor((width * height) / 24000));
    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;

      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.35;
        this.vy = (Math.random() - 0.5) * 0.35;
        this.size = Math.random() * 2 + 1;
        this.color = Math.random() > 0.4 ? 'rgba(157, 78, 221, 0.35)' : 'rgba(0, 242, 254, 0.35)';
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > width) this.vx = -this.vx;
        if (this.y < 0 || this.y > height) this.vy = -this.vy;

        // Push away from mouse
        if (mouse.x !== null && mouse.y !== null) {
          const dx = this.x - mouse.x;
          const dy = this.y - mouse.y;
          const distance = Math.hypot(dx, dy);

          if (distance < mouse.radius) {
            const force = (mouse.radius - distance) / mouse.radius;
            this.x += (dx / distance) * force * 1.5;
            this.y += (dy / distance) * force * 1.5;
          }
        }
      }

      draw(c: CanvasRenderingContext2D) {
        c.beginPath();
        c.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        c.fillStyle = this.color;
        c.fill();
      }
    }

    // 2. Micro-Bubbles
    class Bubble {
      x!: number;
      y!: number;
      vy!: number;
      size!: number;
      wobbleSpeed!: number;
      wobbleRange!: number;
      wobbleAngle!: number;
      popped!: boolean;

      constructor() {
        this.reset();
        this.y = Math.random() * height; // Distribute initial bubbles
      }

      reset() {
        this.x = Math.random() * width;
        this.y = height + Math.random() * 100 + 10;
        this.vy = -(Math.random() * 0.5 + 0.35);
        this.size = Math.random() * 6 + 3;
        this.wobbleSpeed = Math.random() * 0.02 + 0.01;
        this.wobbleRange = Math.random() * 1.5 + 0.5;
        this.wobbleAngle = Math.random() * Math.PI * 2;
        this.popped = false;
      }

      update() {
        if (this.popped) return;

        this.y += this.vy;
        this.wobbleAngle += this.wobbleSpeed;
        this.x += Math.sin(this.wobbleAngle) * this.wobbleRange * 0.45;

        // Reset if reached top
        if (this.y < -50) {
          this.reset();
        }
      }

      pop() {
        this.popped = true;
        // Spawn pop particles
        const fragmentsCount = Math.floor(Math.random() * 5) + 6;
        for (let i = 0; i < fragmentsCount; i++) {
          bubbleFragments.push(new BubbleFragment(this.x, this.y));
        }
        // Respawn bubble
        setTimeout(() => this.reset(), 1000 + Math.random() * 2000);
      }

      draw(c: CanvasRenderingContext2D) {
        if (this.popped) return;
        c.beginPath();
        c.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        // Translucent blue glass bubble color
        c.strokeStyle = 'rgba(0, 242, 254, 0.45)';
        c.lineWidth = 1;
        c.stroke();

        // Bubble highlight reflection
        c.beginPath();
        c.arc(this.x - this.size * 0.3, this.y - this.size * 0.3, this.size * 0.25, 0, Math.PI * 2);
        c.fillStyle = 'rgba(255, 255, 255, 0.6)';
        c.fill();
      }
    }

    // Bubble Fragments (Pop Effect)
    class BubbleFragment {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      alpha: number;
      color: string;

      constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 1.5 + 0.5;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed - 0.2; // slight upward drift
        this.size = Math.random() * 1.5 + 0.5;
        this.alpha = 1.0;
        this.color = Math.random() > 0.5 ? '0, 242, 254' : '255, 255, 255';
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= 0.045; // fade out
      }

      draw(c: CanvasRenderingContext2D) {
        if (this.alpha <= 0) return;
        c.beginPath();
        c.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        c.fillStyle = `rgba(${this.color}, ${this.alpha})`;
        c.fill();
      }
    }

    // 3. Cursor-Reactive Ripples
    class Ripple {
      x: number;
      y: number;
      radius: number;
      maxRadius: number;
      alpha: number;
      speed: number;
      color: string;

      constructor(x: number, y: number, maxRadius = 100, speed = 1.5, startAlpha = 1.0) {
        this.x = x;
        this.y = y;
        this.radius = 1;
        this.maxRadius = maxRadius;
        this.alpha = startAlpha;
        this.speed = speed;
        this.color = Math.random() > 0.5 ? '0, 242, 254' : '157, 78, 221';
      }

      update() {
        this.radius += this.speed;
        this.alpha = 1 - (this.radius / this.maxRadius);
      }

      draw(c: CanvasRenderingContext2D) {
        if (this.alpha <= 0) return;
        c.beginPath();
        c.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        c.strokeStyle = `rgba(${this.color}, ${this.alpha * 0.45})`;
        c.lineWidth = 1.5;
        c.stroke();
      }
    }

    // 4. Ambient Caustic Rays
    class CausticRay {
      x: number;
      y: number;
      angle: number;
      speed: number;
      length: number;
      width: number;

      constructor(index: number) {
        this.angle = (index * Math.PI) / 2;
        this.speed = 0.0006 + Math.random() * 0.0004;
        this.length = Math.min(width, height) * 0.85;
        this.width = width / 2.5;
        this.x = (index * width) / 3;
        this.y = -100;
      }

      update() {
        this.angle += this.speed;
      }

      draw(c: CanvasRenderingContext2D) {
        const gradient = c.createRadialGradient(
          this.x + Math.sin(this.angle) * 100, this.y, 10,
          this.x + Math.sin(this.angle) * 100, this.y + 100, this.length
        );
        gradient.addColorStop(0, 'rgba(0, 242, 254, 0.03)');
        gradient.addColorStop(0.5, 'rgba(157, 78, 221, 0.01)');
        gradient.addColorStop(1, 'rgba(4, 4, 13, 0)');

        c.save();
        c.beginPath();
        c.moveTo(this.x - this.width, 0);
        c.lineTo(this.x + this.width, 0);
        c.lineTo(this.x + this.width * 1.5, height);
        c.lineTo(this.x - this.width * 1.5, height);
        c.closePath();
        c.fillStyle = gradient;
        c.fill();
        c.restore();
      }
    }

    // Initialize Particles, Bubbles, Caustics
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }
    const bubbleCount = Math.min(25, Math.floor(width / 75));
    for (let i = 0; i < bubbleCount; i++) {
      bubbles.push(new Bubble());
    }
    for (let i = 0; i < 3; i++) {
      caustics.push(new CausticRay(i));
    }

    // Loop
    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw background noise color
      ctx.fillStyle = '#04040d';
      ctx.fillRect(0, 0, width, height);

      // 1. Draw Caustics Rays first
      for (let i = 0; i < caustics.length; i++) {
        caustics[i].update();
        caustics[i].draw(ctx);
      }

      // 2. Draw & Connect Particles
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        p1.update();
        p1.draw(ctx);

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.hypot(dx, dy);

          if (dist < 110) {
            const alpha = (110 - dist) / 110 * 0.15;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(157, 78, 221, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // 3. Draw & Update Bubbles
      for (let i = 0; i < bubbles.length; i++) {
        const b = bubbles[i];
        b.update();
        b.draw(ctx);
      }

      // 4. Draw & Update Bubble Fragments (Pop Particles)
      for (let i = bubbleFragments.length - 1; i >= 0; i--) {
        const f = bubbleFragments[i];
        f.update();
        f.draw(ctx);
        if (f.alpha <= 0) {
          bubbleFragments.splice(i, 1);
        }
      }

      // 5. Draw & Update Ripples
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.update();
        r.draw(ctx);
        if (r.alpha <= 0) {
          ripples.splice(i, 1);
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10 pointer-events-none w-full h-full"
    />
  );
}
