declare module 'weq8c' {
   export class WEQ8Runtime {
      readonly input: AudioNode;
      constructor(audioCtx: BaseAudioContext, spec?: unknown);
      connect(node: AudioNode): void;
      disconnect(node: AudioNode): void;
      setFilterType(idx: number, type: string): void;
      toggleBypass(idx: number, bypass: boolean): void;
      setFilterFrequency(idx: number, frequency: number): void;
      setFilterQ(idx: number, q: number): void;
      setFilterGain(idx: number, gain: number): void;
      inputGain: number;
      outputGain: number;
      on(event: 'filtersChanged', callback: (state: unknown) => void): () => void;
   }
}

declare module 'weq8c/ui' {
   export class WEQ8UIElement extends HTMLElement {
      runtime: unknown;
      static addCustomStyles(css: string): void;
   }
   export class EQUIFilterRowElement extends HTMLElement {
      static addCustomStyles(css: string): void;
   }
}

declare namespace React {
   namespace JSX {
      interface IntrinsicElements {
         'weq8-ui': React.DetailedHTMLProps<
            React.HTMLAttributes<HTMLElement>,
            HTMLElement
         >;
      }
   }
}