export type EqPreset = {
   name: string;
   gains: number[];
};

export const EQ_PRESETS: EqPreset[] = [
   {
      name: 'Flat',
      gains: [0, 0, 0, 0, 0, 0, 0, 0],
   },
   {
      name: 'Bass Boost',
      gains: [6, 5, 3, 0, 0, 0, 0, 0],
   },
   {
      name: 'Vocal',
      gains: [-3, -2, 0, 3, 4, 3, 1, 0],
   },
   {
      name: 'Rock',
      gains: [5, 3, -1, -2, 1, 3, 4, 5],
   },
   {
      name: 'Pop',
      gains: [-1, 0, 2, 4, 4, 2, 0, -1],
   },
   {
      name: 'Electronic',
      gains: [5, 4, 1, 0, -1, 1, 3, 5],
   },
];

export function applyPreset(
   runtime: { setFilterGain: (idx: number, gain: number) => void },
   preset: EqPreset
): void {
   preset.gains.forEach((gain, idx) => {
      runtime.setFilterGain(idx, gain);
   });
}