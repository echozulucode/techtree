// jsdom lacks layout APIs React Flow touches (see React Flow's testing guide).
// Call once per jsdom test file: `beforeAll(installReactFlowStubs)`.
export function installReactFlowStubs(): void {
  class ResizeObserverStub {
    private pending: Element[] = [];
    constructor(private cb: ResizeObserverCallback) {}
    observe(target: Element) {
      // Asynchronous and batched like the real thing: React Flow's initial
      // fitView runs on the first measurement, which must come after its
      // pan/zoom is set up and include every node observed so far.
      if (this.pending.push(target) > 1) return;
      setTimeout(() => {
        const targets = this.pending;
        this.pending = [];
        this.cb(
          targets.map((t) => ({ target: t }) as ResizeObserverEntry),
          this as unknown as ResizeObserver,
        );
      }, 0);
    }
    unobserve() {}
    disconnect() {}
  }
  class DOMMatrixReadOnlyStub {
    m22: number;
    constructor(transform?: string) {
      const scale = transform?.match(/scale\(([1-9.]+)\)/)?.[1];
      this.m22 = scale !== undefined ? +scale : 1;
    }
  }
  Object.assign(globalThis, { ResizeObserver: ResizeObserverStub, DOMMatrixReadOnly: DOMMatrixReadOnlyStub });
  // Explicit pixel sizes (React Flow nodes) are honoured; anything else
  // (auto, 100 %) reads as a 1200 × 800 canvas.
  const px = (v: string, fallback: number): number => (/^[\d.]+px$/.test(v) ? parseFloat(v) : fallback);
  Object.defineProperties(HTMLElement.prototype, {
    offsetHeight: {
      configurable: true,
      get() {
        return px((this as HTMLElement).style.height, 800);
      },
    },
    offsetWidth: {
      configurable: true,
      get() {
        return px((this as HTMLElement).style.width, 1200);
      },
    },
  });
  (SVGElement.prototype as unknown as { getBBox: () => DOMRect }).getBBox = () =>
    ({ x: 0, y: 0, width: 0, height: 0 }) as DOMRect;
}
