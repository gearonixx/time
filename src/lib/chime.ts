import type { ChimeKind } from './announce';
let audio: AudioContext | null = null;
function context(): AudioContext | null {
  try {
    const Ctx =
      globalThis.AudioContext ??
      (
        globalThis as unknown as {
          webkitAudioContext: typeof AudioContext;
        }
      ).webkitAudioContext;
    if (!Ctx) return null;
    audio ??= new Ctx();
    return audio;
  } catch {
    return null;
  }
}
export async function running(): Promise<AudioContext | null> {
  const ctx = context();
  if (!ctx) return null;
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch {
      return null;
    }
  }
  return ctx.state === 'running' ? ctx : null;
}
export function primeAudio(): void {
  if (typeof window === 'undefined') return;
  const wake = () => void running();
  const opts = { passive: true } as const;
  window.addEventListener('pointerdown', wake, opts);
  window.addEventListener('keydown', wake, opts);
  window.addEventListener('touchstart', wake, opts);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') wake();
  });
}
export async function chime(kind: ChimeKind): Promise<boolean> {
  try {
    const ctx = await running();
    if (!ctx) return false;
    const notes =
      kind === 'focus'
        ? [523.25, 659.25, 783.99]
        : kind === 'break'
          ? [783.99, 523.25]
          : kind === 'mark'
            ? [659.25]
            : [523.25, 659.25, 783.99, 1046.5];
    const peak = kind === 'mark' ? 0.1 : 0.25;
    const start = ctx.currentTime + 0.02;
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const at = start + i * 0.16;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(peak, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.4);
      osc.connect(gain).connect(ctx.destination);
      osc.start(at);
      osc.stop(at + 0.45);
    });
    return true;
  } catch {
    return false;
  }
}
