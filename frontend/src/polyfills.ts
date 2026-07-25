// @ts-ignore
const g = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : globalThis;

// @ts-ignore
g.TAMAGUI_TARGET = 'web';

// Prevent Tamagui visualizer from crashing
// @ts-ignore
g.Tamagui = g.Tamagui || {};
// @ts-ignore
if (!g.Tamagui.visualizer) {
  // @ts-ignore
  g.Tamagui.visualizer = { active: false };
}
// @ts-ignore
if (!g.Tamagui.version) {
    // @ts-ignore
    g.Tamagui.version = '2.0.0-rc.26';
}

export {};
