// A canvas for PointerSource in node, which has no DOM: it keeps the listeners, and a test calls one with an event
// of its own. No EventTarget: its dispatch creates objects, which the heap test would count as the source's.

/** As much of a PointerEvent as PointerSource reads. */
export interface FakePointer {
  clientX: number;
  clientY: number;
  /** The button that changed (0 main, 2 secondary, -1 none), as on a pointerdown or pointerup. */
  button: number;
  /** The buttons held after the event, a bit each (1 main, 2 secondary), as on every pointer event. */
  buttons: number;
  isPrimary: boolean;
  pointerId: number;
}

export const CANVAS_WIDTH_PX = 800;
export const CANVAS_HEIGHT_PX = 600;

export function fakeCanvas(): {
  element: HTMLElement;
  fire: (type: string, event: FakePointer) => void;
  captured: number[];
  listening: () => number;
} {
  const listeners = new Map<string, (event: FakePointer) => void>();
  const rect = { left: 0, top: 0, width: CANVAS_WIDTH_PX, height: CANVAS_HEIGHT_PX };
  const captured: number[] = [];
  const element = {
    style: { touchAction: '' },
    addEventListener: (type: string, fn: (event: FakePointer) => void) => void listeners.set(type, fn),
    // As the DOM does: only the same function is removed.
    removeEventListener: (type: string, fn: (event: FakePointer) => void) => {
      if (listeners.get(type) === fn) listeners.delete(type);
    },
    getBoundingClientRect: () => rect,
    setPointerCapture: (id: number) => void captured.push(id),
  };
  return {
    element: element as unknown as HTMLElement,
    fire: (type, event) => listeners.get(type)?.(event),
    captured,
    listening: () => listeners.size,
  };
}

/** A primary pointer at (x, y) px, the main button the one that changed, nothing held; `more` overrides. */
export const at = (clientX: number, clientY: number, more: Partial<FakePointer> = {}): FakePointer => ({
  clientX,
  clientY,
  button: 0,
  buttons: 0,
  isPrimary: true,
  pointerId: 1,
  ...more,
});
