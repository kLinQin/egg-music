import { WEQ8Runtime } from 'weq8c';

export type EqSetup = {
   context: AudioContext;
   source: MediaElementAudioSourceNode;
   runtime: WEQ8Runtime;
};

// 8 band aktif (bukan noop) — supaya preset bisa atur semua band
export const DEFAULT_SPEC = [
   { type: 'lowshelf12', frequency: 60, gain: 0, Q: 0.7, bypass: false },
   { type: 'peaking12', frequency: 170, gain: 0, Q: 0.7, bypass: false },
   { type: 'peaking12', frequency: 350, gain: 0, Q: 0.7, bypass: false },
   { type: 'peaking12', frequency: 1000, gain: 0, Q: 0.7, bypass: false },
   { type: 'peaking12', frequency: 3500, gain: 0, Q: 0.7, bypass: false },
   { type: 'peaking12', frequency: 8000, gain: 0, Q: 0.7, bypass: false },
   { type: 'peaking12', frequency: 12000, gain: 0, Q: 0.7, bypass: false },
   { type: 'highshelf12', frequency: 16000, gain: 0, Q: 0.7, bypass: false },
];

const setups = new WeakMap<HTMLAudioElement, EqSetup>();
let activeSetup: EqSetup | null = null;

export function initEq(audioElement: HTMLAudioElement): EqSetup {
   const existing = setups.get(audioElement);
   if (existing) {
      activeSetup = existing;
      return existing;
   }

   const context = new AudioContext();
   const source = context.createMediaElementSource(audioElement);
   const runtime = new WEQ8Runtime(context, DEFAULT_SPEC);

   source.connect(runtime.input);
   runtime.connect(context.destination);

   const setup: EqSetup = { context, source, runtime };
   setups.set(audioElement, setup);
   activeSetup = setup;
   return setup;
}

export function getEq(): EqSetup | null {
   return activeSetup;
}

export async function resumeEq(): Promise<void> {
   if (activeSetup && activeSetup.context.state === 'suspended') {
      await activeSetup.context.resume();
   }
}

export function destroyEq() {
   if (activeSetup) {
      activeSetup.context.close();
      activeSetup = null;
   }
}