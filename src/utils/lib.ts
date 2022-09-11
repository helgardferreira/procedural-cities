import { createNoise2D } from "simplex-noise";

export const noise2D = createNoise2D();

export function normalized2DNoise(x: number, y: number) {
  return (noise2D(x, y) * 100 + 100) / 100 / 2;
}
