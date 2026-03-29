import { createNoise2D } from "simplex-noise";

/** Terrain width/depth in world units */
export const GROUND_WIDTH = 50;

/** Dark green color for the ground mesh under the grass */
export const GROUND_COLOR = "#001700";

const noise2D = createNoise2D();

/** Compute terrain height at a given (x, z) world position using layered simplex noise */
export const getGroundHeight = (x: number, z: number): number => {
  let y = 0.05 * noise2D(x / 50, z / 50);
  y += 0.08 * noise2D(x / 100, z / 100);
  y += 0.02 * noise2D(x / 10, z / 10);
  return y;
};
