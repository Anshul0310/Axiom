"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
}

interface Field {
  x: number;
  y: number;
  radius: number;
  color: string;
  phase: number;
  speed: number;
}

export default function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let particles: Particle[] = [];

    const fields: Field[] = [
      { x: 0.18, y: 0.12, radius: 0.54, color: "rgba(0, 212, 255, 0.18)", phase: 0.2, speed: 0.00016 },
      { x: 0.82, y: 0.18, radius: 0.48, color: "rgba(0, 245, 160, 0.12)", phase: 1.4, speed: 0.00013 },
      { x: 0.56, y: 0.82, radius: 0.52, color: "rgba(139, 92, 246, 0.13)", phase: 2.2, speed: 0.00011 },
    ];

    const createParticles = () => {
      const count = Math.min(72, Math.max(28, Math.floor(width / 22)));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        radius: Math.random() * 1.8 + 0.8,
        alpha: Math.random() * 0.36 + 0.16,
      }));
    };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      createParticles();
      if (reducedMotion) render(0);
    };

    const drawBase = () => {
      const bg = ctx.createLinearGradient(0, 0, 0, height);
      bg.addColorStop(0, "#020611");
      bg.addColorStop(0.45, "#071024");
      bg.addColorStop(1, "#02040b");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);
    };

    const drawFields = (time: number) => {
      ctx.globalCompositeOperation = "screen";
      for (const field of fields) {
        field.phase += field.speed * (reducedMotion ? 0 : 16);
        const x = width * field.x + Math.sin(time * field.speed + field.phase) * width * 0.08;
        const y = height * field.y + Math.cos(time * field.speed * 1.35 + field.phase) * height * 0.08;
        const radius = Math.max(width, height) * field.radius;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
        grad.addColorStop(0, field.color);
        grad.addColorStop(0.32, field.color.replace(/0\.\d+\)/, "0.055)"));
        grad.addColorStop(0.68, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
    };

    const drawGrid = (time: number) => {
      const spacing = 72;
      const drift = reducedMotion ? 0 : (time * 0.012) % spacing;
      ctx.lineWidth = 1;

      for (let x = -spacing + drift; x <= width + spacing; x += spacing) {
        const alpha = 0.025 + Math.max(0, 1 - Math.abs(x - width / 2) / width) * 0.018;
        ctx.strokeStyle = `rgba(184, 235, 255, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + width * 0.08, height);
        ctx.stroke();
      }

      for (let y = -spacing; y <= height + spacing; y += spacing) {
        const alpha = 0.018 + Math.max(0, 1 - Math.abs(y - height * 0.42) / height) * 0.018;
        ctx.strokeStyle = `rgba(184, 235, 255, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(0, y + drift * 0.4);
        ctx.lineTo(width, y + drift * 0.4);
        ctx.stroke();
      }
    };

    const drawParticles = () => {
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (!reducedMotion) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < -20) p.x = width + 20;
          if (p.x > width + 20) p.x = -20;
          if (p.y < -20) p.y = height + 20;
          if (p.y > height + 20) p.y = -20;
        }

        ctx.fillStyle = `rgba(194, 244, 255, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < 118) {
            const alpha = (1 - distance / 118) * 0.11;
            ctx.strokeStyle = `rgba(0, 212, 255, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        }
      }
    };

    const drawSignals = (time: number) => {
      const lanes = [
        { y: height * 0.28, speed: 0.18, color: "rgba(0, 245, 160, 0.34)" },
        { y: height * 0.62, speed: 0.13, color: "rgba(0, 212, 255, 0.32)" },
      ];

      for (const lane of lanes) {
        const x = reducedMotion ? width * 0.4 : ((time * lane.speed) % (width + 260)) - 160;
        const grad = ctx.createLinearGradient(x - 120, lane.y, x + 120, lane.y);
        grad.addColorStop(0, "rgba(0,0,0,0)");
        grad.addColorStop(0.5, lane.color);
        grad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - 120, lane.y);
        ctx.lineTo(x + 120, lane.y + Math.sin(time * 0.002) * 18);
        ctx.stroke();
      }
    };

    const drawVignette = () => {
      const vig = ctx.createRadialGradient(
        width * 0.5,
        height * 0.45,
        Math.min(width, height) * 0.2,
        width * 0.5,
        height * 0.5,
        Math.max(width, height) * 0.82
      );
      vig.addColorStop(0, "rgba(2, 6, 17, 0)");
      vig.addColorStop(0.65, "rgba(2, 6, 17, 0.24)");
      vig.addColorStop(1, "rgba(2, 6, 17, 0.78)");
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, width, height);
    };

    const render = (time: number) => {
      drawBase();
      drawFields(time);
      drawGrid(time);
      drawParticles();
      drawSignals(time);
      drawVignette();
    };

    const animate = (time: number) => {
      render(time);
      animRef.current = requestAnimationFrame(animate);
    };

    resize();
    window.addEventListener("resize", resize);

    if (!reducedMotion) {
      animRef.current = requestAnimationFrame(animate);
    }

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
      }}
      aria-hidden="true"
    />
  );
}
