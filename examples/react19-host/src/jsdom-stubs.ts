// jsdom lacks layout APIs React Flow touches (see React Flow's testing guide).
// Call once per jsdom test file: `beforeAll(installReactFlowStubs)`.
export function installReactFlowStubs(): void {
  class ResizeObserverStub {
    constructor(private cb: ResizeObserverCallback) {}
    observe(target: Element) {
      this.cb([{ target } as ResizeObserverEntry], this as unknown as ResizeObserver);
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
  Object.defineProperties(HTMLElement.prototype, {
    offsetHeight: {
      configurable: true,
      get() {
        return parseFloat((this as HTMLElement).style.height) || 800;
      },
    },
    offsetWidth: {
      configurable: true,
      get() {
        return parseFloat((this as HTMLElement).style.width) || 1200;
      },
    },
  });
  (SVGElement.prototype as unknown as { getBBox: () => DOMRect }).getBBox = () =>
    ({ x: 0, y: 0, width: 0, height: 0 }) as DOMRect;
}
