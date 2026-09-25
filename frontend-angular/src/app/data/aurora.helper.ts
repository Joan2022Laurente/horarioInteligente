function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function pseudoRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function getAuroraStyle(seed: number = 42): Record<string, string> {
  const r = pseudoRandom(seed);
  const dur1 = lerp(9, 28, r());
  const dur2 = lerp(9, 28, r());
  const delay1 = -lerp(0, dur1, r());
  const delay2 = -lerp(0, dur2, r());
  const useAlt = r() > 0.5;
  const anim1 = useAlt ? 'aurora-harmonic-orbit-alt-1' : 'aurora-harmonic-orbit-1';
  const anim2 = useAlt ? 'aurora-harmonic-orbit-alt-2' : 'aurora-harmonic-orbit-2';

  return {
    '--aurora-dur-1': `${dur1.toFixed(2)}s`,
    '--aurora-dur-2': `${dur2.toFixed(2)}s`,
    '--aurora-delay-1': `${delay1.toFixed(2)}s`,
    '--aurora-delay-2': `${delay2.toFixed(2)}s`,
    '--aurora-anim-1': anim1,
    '--aurora-anim-2': anim2,
  };
}
