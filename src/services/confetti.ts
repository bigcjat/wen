// Lightweight zero-dependency Canvas Confetti Cannon

interface Particle {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  vx: number;
  vy: number;
  rotation: number;
  vRotation: number;
  opacity: number;
  scale: number;
}

const COLORS = [
  '#00f0ff', // Electric Cyan
  '#10b981', // Emerald Green
  '#f59e0b', // Radiant Gold
  '#ec4899', // Neon Pink
  '#8b5cf6', // Electric Purple
  '#ffffff'  // Pure White
];

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let particles: Particle[] = [];
let animationId: number | null = null;

function getCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'confettiCanvas';
    canvas.style.position = 'fixed';
    canvas.style.inset = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '9999';
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d')!;

    const resize = () => {
      if (canvas) {
        canvas.width = window.innerWidth * window.devicePixelRatio;
        canvas.height = window.innerHeight * window.devicePixelRatio;
      }
    };
    window.addEventListener('resize', resize);
    resize();
  }
  return { canvas, ctx: ctx! };
}

export function fireConfetti(count = 120) {
  const { canvas, ctx } = getCanvas();
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.width;
  const height = canvas.height;

  // Burst from two lower sides
  for (let i = 0; i < count; i++) {
    const isLeft = i % 2 === 0;
    const originX = isLeft ? width * 0.15 : width * 0.85;
    const originY = height * 0.75;
    const angle = isLeft
      ? (Math.random() * 45 + 30) * (Math.PI / 180)
      : (Math.random() * 45 + 105) * (Math.PI / 180);
    const speed = (Math.random() * 18 + 14) * dpr;

    particles.push({
      x: originX,
      y: originY,
      w: (Math.random() * 10 + 6) * dpr,
      h: (Math.random() * 6 + 4) * dpr,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      vx: Math.cos(angle) * speed * (isLeft ? 1 : -1),
      vy: -Math.sin(angle) * speed,
      rotation: Math.random() * 360,
      vRotation: (Math.random() - 0.5) * 12,
      opacity: 1,
      scale: 1
    });
  }

  if (!animationId) {
    loop(ctx, width, height);
  }
}

function loop(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.clearRect(0, 0, width, height);

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.45; // gravity
    p.vx *= 0.98; // air resistance
    p.rotation += p.vRotation;
    p.opacity -= 0.008; // fade out

    if (p.opacity <= 0 || p.y > height + 50) {
      particles.splice(i, 1);
      continue;
    }

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate((p.rotation * Math.PI) / 180);
    ctx.globalAlpha = Math.max(0, p.opacity);
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    ctx.restore();
  }

  if (particles.length > 0) {
    animationId = requestAnimationFrame(() => loop(ctx, width, height));
  } else {
    animationId = null;
    ctx.clearRect(0, 0, width, height);
  }
}
