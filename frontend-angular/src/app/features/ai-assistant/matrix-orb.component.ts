import { Component, ElementRef, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

export type OrbState = 'idle' | 'thinking' | 'streaming';
export type OrbColorMode = 'monochrome' | 'lime' | 'orange' | 'cyan';

const GLYPHS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '8', '5', '0', '3', '7', '1'];

interface SpherePoint {
  x: number;
  y: number;
  z: number;
  baseX: number;
  baseY: number;
  baseZ: number;
  lat: number;
  lon: number;
  glyphIndex: number;
  phaseOffset: number;
}

// Generador de Ruido Simplex 3D Rápido y Coherente en CPU
function makeSimplexNoise3D() {
  const F3 = 1.0 / 3.0;
  const G3 = 1.0 / 6.0;
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = Math.floor(Math.random() * 256);
  const perm = new Uint8Array(512);
  const permMod12 = new Uint8Array(512);
  for (let i = 0; i < 512; i++) {
    perm[i] = p[i & 255];
    permMod12[i] = perm[i] % 12;
  }
  const grad3 = [
    [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
    [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
    [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]
  ];

  return function noise3D(xin: number, yin: number, zin: number): number {
    let n0: number, n1: number, n2: number, n3: number;
    const s = (xin + yin + zin) * F3;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const k = Math.floor(zin + s);
    const t = (i + j + k) * G3;
    const X0 = i - t;
    const Y0 = j - t;
    const Z0 = k - t;
    const x0 = xin - X0;
    const y0 = yin - Y0;
    const z0 = zin - Z0;

    let i1: number, j1: number, k1: number;
    let i2: number, j2: number, k2: number;
    if (x0 >= y0) {
      if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
      else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; }
      else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
    } else {
      if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; }
      else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; }
      else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
    }

    const x1 = x0 - i1 + G3;
    const y1 = y0 - j1 + G3;
    const z1 = z0 - k1 + G3;
    const x2 = x0 - i2 + 2.0 * G3;
    const y2 = y0 - j2 + 2.0 * G3;
    const z2 = z0 - k2 + 2.0 * G3;
    const x3 = x0 - 1.0 + 3.0 * G3;
    const y3 = y0 - 1.0 + 3.0 * G3;
    const z3 = z0 - 1.0 + 3.0 * G3;

    const ii = i & 255;
    const jj = j & 255;
    const kk = k & 255;

    let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
    if (t0 < 0) n0 = 0.0;
    else {
      const gi0 = permMod12[ii + perm[jj + perm[kk]]];
      t0 *= t0;
      n0 = t0 * t0 * (grad3[gi0][0] * x0 + grad3[gi0][1] * y0 + grad3[gi0][2] * z0);
    }

    let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
    if (t1 < 0) n1 = 0.0;
    else {
      const gi1 = permMod12[ii + i1 + perm[jj + j1 + perm[kk + k1]]];
      t1 *= t1;
      n1 = t1 * t1 * (grad3[gi1][0] * x1 + grad3[gi1][1] * y1 + grad3[gi1][2] * z1);
    }

    let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
    if (t2 < 0) n2 = 0.0;
    else {
      const gi2 = permMod12[ii + i2 + perm[jj + j2 + perm[kk + k2]]];
      t2 *= t2;
      n2 = t2 * t2 * (grad3[gi2][0] * x2 + grad3[gi2][1] * y2 + grad3[gi2][2] * z2);
    }

    let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
    if (t3 < 0) n3 = 0.0;
    else {
      const gi3 = permMod12[ii + 1 + perm[jj + 1 + perm[kk + 1]]];
      t3 *= t3;
      n3 = t3 * t3 * (grad3[gi3][0] * x3 + grad3[gi3][1] * y3 + grad3[gi3][2] * z3);
    }

    return 32.0 * (n0 + n1 + n2 + n3);
  };
}

const noise3D = makeSimplexNoise3D();

@Component({
  selector: 'app-matrix-orb',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      (mousemove)="handleMouseMove($event)"
      (mouseleave)="handleMouseLeave()"
      class="relative inline-flex items-center justify-center select-none overflow-visible shrink-0"
      [style.width.px]="size"
      [style.height.px]="size"
      title="Copiloto IA"
    >
      <canvas
        #orbCanvas
        class="w-full h-full pointer-events-none drop-shadow-sm"
        [style.width.px]="size"
        [style.height.px]="size"
      ></canvas>
    </div>
  `,
  styles: [`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
  `]
})
export class MatrixOrbComponent implements OnInit, OnChanges, OnDestroy {
  @Input() size = 32;
  @Input() state: OrbState = 'idle';
  @Input() colorMode: OrbColorMode = 'monochrome';
  @Input() speedMultiplier = 1.0;
  @Input() interactive = true;

  @ViewChild('orbCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private animationFrameId: number | null = null;
  private points: SpherePoint[] = [];
  private rotation = { x: 0.2, y: 0.3 };
  private mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
  private isVisible = true;
  private observer: IntersectionObserver | null = null;

  private deformationAmp = 0;
  private flowSpeed = 0;

  ngOnInit(): void {
    this.initPoints();
    this.startAnimation();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['size']) {
      this.initPoints();
      this.resizeCanvas();
    }
  }

  ngOnDestroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.observer) {
      this.observer.disconnect();
    }
  }

  private initPoints(): void {
    const count = this.size <= 28 ? 120 : this.size <= 44 ? 180 : this.size <= 72 ? 260 : 360;
    const pts: SpherePoint[] = [];

    for (let i = 0; i < count; i++) {
      const y = 1 - (i / (count - 1)) * 2;
      const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
      const phi = i * 2.399963229728653; // Golden angle

      const x = Math.cos(phi) * radiusAtY;
      const z = Math.sin(phi) * radiusAtY;

      const lat = Math.asin(Math.max(-1, Math.min(1, y)));
      const lon = Math.atan2(z, x);

      pts.push({
        x,
        y,
        z,
        baseX: x,
        baseY: y,
        baseZ: z,
        lat,
        lon,
        glyphIndex: Math.floor(Math.random() * GLYPHS.length),
        phaseOffset: Math.random() * Math.PI * 2,
      });
    }

    this.points = pts;
  }

  private resizeCanvas(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    const dpr = Math.max(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2.5);
    canvas.width = Math.round(this.size * dpr);
    canvas.height = Math.round(this.size * dpr);
  }

  private startAnimation(): void {
    const canvas = this.canvasRef.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    this.resizeCanvas();

    if (typeof IntersectionObserver !== 'undefined') {
      this.observer = new IntersectionObserver(
        ([entry]) => {
          this.isVisible = entry.isIntersecting;
        },
        { threshold: 0.05 }
      );
      this.observer.observe(canvas);
    }

    const dpr = Math.max(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2.5);
    let lastTime = performance.now();

    const render = (time: number) => {
      this.animationFrameId = requestAnimationFrame(render);

      if (!this.isVisible) return;

      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      const targetDeform = this.state === 'thinking' ? 1.0 : 0.0;
      const targetFlow = this.state === 'streaming' ? 1.0 : this.state === 'thinking' ? 0.4 : 0.0;

      this.deformationAmp += (targetDeform - this.deformationAmp) * Math.min(1, dt * 3.5);
      this.flowSpeed += (targetFlow - this.flowSpeed) * Math.min(1, dt * 4.0);

      const deformAmp = this.deformationAmp;
      const flowSpeed = this.flowSpeed;

      const rotY = (0.35 + deformAmp * 0.45 + flowSpeed * 1.8) * this.speedMultiplier;
      const rotX = (0.22 + deformAmp * 0.25) * this.speedMultiplier;

      this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.08;
      this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.08;

      this.rotation.y += (rotY + this.mouse.x * 1.2) * dt;
      this.rotation.x += (rotX + this.mouse.y * 1.2) * dt;

      const cosY = Math.cos(this.rotation.y);
      const sinY = Math.sin(this.rotation.y);
      const cosX = Math.cos(this.rotation.x);
      const sinX = Math.sin(this.rotation.x);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const sphereRadius = (this.size * dpr * 0.43);
      const fov = 2.8;

      const pts = this.points;
      const pointsToDraw: {
        x: number;
        y: number;
        z: number;
        depth: number;
        char: string;
        alpha: number;
        brightness: number;
      }[] = [];

      const tSec = time * 0.001;

      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];

        let displacement = 0;
        let travelingWavePulse = 0;

        if (deformAmp > 0.005) {
          const simplexVal = noise3D(
            p.baseX * 1.8 + tSec * 0.6,
            p.baseY * 1.8 + tSec * 0.5,
            p.baseZ * 1.8 + tSec * 0.7
          );

          const wavePhase = Math.sin(p.lat * 3.5 - tSec * 2.8 + p.lon * 1.2);
          travelingWavePulse = Math.max(0, wavePhase);
          displacement = (simplexVal * 0.16 + wavePhase * 0.14) * deformAmp;

          if (travelingWavePulse > 0.75 && Math.random() < 0.05 * deformAmp) {
            p.glyphIndex = (p.glyphIndex + 1) % GLYPHS.length;
          }
        }

        const currentRadiusFactor = 1.0 + displacement;
        const px = p.baseX * currentRadiusFactor;
        const py = p.baseY * currentRadiusFactor;
        const pz = p.baseZ * currentRadiusFactor;

        const x1 = px * cosY + pz * sinY;
        const z1 = -px * sinY + pz * cosY;

        const y2 = py * cosX - z1 * sinX;
        const z2 = py * sinX + z1 * cosX;

        if (z2 < -0.6) continue;

        const perspective = fov / (fov + z2);
        const screenX = centerX + x1 * sphereRadius * perspective;
        const screenY = centerY + y2 * sphereRadius * perspective;

        const depthNorm = Math.max(0, Math.min(1, (z2 + 1) / 2));
        let alpha = Math.max(0.18, Math.min(1.0, Math.pow(depthNorm, 1.5)));
        let brightness = depthNorm;

        if (deformAmp > 0.05 && travelingWavePulse > 0.5) {
          const waveGlow = (travelingWavePulse - 0.5) * 2.0 * deformAmp;
          alpha = Math.min(1.0, alpha + waveGlow * 0.4);
          brightness = Math.min(1.0, brightness + waveGlow * 0.5);
        }

        pointsToDraw.push({
          x: screenX,
          y: screenY,
          z: z2,
          depth: depthNorm,
          char: GLYPHS[p.glyphIndex],
          alpha,
          brightness,
        });
      }

      pointsToDraw.sort((a, b) => a.z - b.z);

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const baseSize = Math.max(2.4, Math.min(4.4, this.size * 0.085));
      const minFont = Math.max(2.0 * dpr, Math.round(baseSize * 0.85 * dpr));
      const maxFont = Math.max(3.0 * dpr, Math.round(baseSize * 1.35 * dpr));

      for (let i = 0; i < pointsToDraw.length; i++) {
        const pt = pointsToDraw[i];
        const fontSize = Math.round(minFont + (maxFont - minFont) * pt.depth);

        ctx.font = `800 ${fontSize}px "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace`;

        if (this.colorMode === 'lime') {
          if (pt.brightness > 0.7) {
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, pt.alpha * 1.15)})`;
          } else if (pt.brightness > 0.35) {
            ctx.fillStyle = `rgba(187, 244, 81, ${Math.min(1, pt.alpha * 1.05)})`;
          } else {
            ctx.fillStyle = `rgba(90, 140, 50, ${pt.alpha * 0.65})`;
          }
        } else if (this.colorMode === 'orange') {
          if (pt.brightness > 0.7) {
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, pt.alpha * 1.15)})`;
          } else if (pt.brightness > 0.35) {
            ctx.fillStyle = `rgba(255, 112, 67, ${Math.min(1, pt.alpha * 1.05)})`;
          } else {
            ctx.fillStyle = `rgba(175, 75, 45, ${pt.alpha * 0.65})`;
          }
        } else {
          if (pt.brightness > 0.7) {
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, pt.alpha * 1.2)})`;
          } else if (pt.brightness > 0.35) {
            ctx.fillStyle = `rgba(220, 225, 235, ${Math.min(1, pt.alpha * 0.95)})`;
          } else {
            ctx.fillStyle = `rgba(120, 130, 145, ${pt.alpha * 0.55})`;
          }
        }

        ctx.fillText(pt.char, Math.round(pt.x), Math.round(pt.y));
      }
    };

    this.animationFrameId = requestAnimationFrame(render);
  }

  handleMouseMove(e: MouseEvent): void {
    if (!this.interactive) return;
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    this.mouse.targetX = nx;
    this.mouse.targetY = ny;
  }

  handleMouseLeave(): void {
    this.mouse.targetX = 0;
    this.mouse.targetY = 0;
  }
}
