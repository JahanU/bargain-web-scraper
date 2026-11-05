// vitest-axe 0.1 types its matcher on the legacy global `Vi` namespace; expose it on Vitest's.
import type { AxeMatchers } from "vitest-axe/matchers";

declare module "vitest" {
  interface Assertion<T = any> extends AxeMatchers {}
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}
