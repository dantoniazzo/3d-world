import * as THREE from "three";

// --- Tree shape constants ---

const TRUNK_RADIUS_BOTTOM = 0.15;
const TRUNK_RADIUS_TOP = 0.1;
const TRUNK_HEIGHT = 2.5;
const TRUNK_SEGMENTS = 6;

const CANOPY_LAYERS = [
  { radius: 1.5, height: 2.5, y: 2.5 },
  { radius: 1.1, height: 2.0, y: 4.2 },
  { radius: 0.7, height: 1.5, y: 5.5 },
];

const CANOPY_SEGMENTS = 8;

const TRUNK_COLOR = new THREE.Color("#4a3520");
const CANOPY_COLORS = [
  new THREE.Color("#1a5c12"),
  new THREE.Color("#2d7a1e"),
  new THREE.Color("#3d8b2a"),
];

// --- Geometry helpers ---

/** Merge multiple BufferGeometries into one, preserving position, normal, and a per-vertex color attribute. */
function mergeWithColors(
  parts: { geometry: THREE.BufferGeometry; color: THREE.Color }[],
): THREE.BufferGeometry {
  let totalVerts = 0;
  let totalIdx = 0;
  for (const { geometry } of parts) {
    totalVerts += geometry.attributes.position.count;
    totalIdx += geometry.index ? geometry.index.count : 0;
  }

  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  const colors = new Float32Array(totalVerts * 3);
  const indices = new Uint16Array(totalIdx);

  let vOff = 0;
  let iOff = 0;

  for (const { geometry, color } of parts) {
    const pos = geometry.attributes.position;
    const norm = geometry.attributes.normal;
    const idx = geometry.index;

    for (let i = 0; i < pos.count; i++) {
      positions[(vOff + i) * 3] = pos.getX(i);
      positions[(vOff + i) * 3 + 1] = pos.getY(i);
      positions[(vOff + i) * 3 + 2] = pos.getZ(i);

      normals[(vOff + i) * 3] = norm ? norm.getX(i) : 0;
      normals[(vOff + i) * 3 + 1] = norm ? norm.getY(i) : 1;
      normals[(vOff + i) * 3 + 2] = norm ? norm.getZ(i) : 0;

      // Add slight random variation to canopy color
      const variation = color.g > 0.2 ? (Math.random() - 0.5) * 0.08 : 0;
      colors[(vOff + i) * 3] = color.r + variation;
      colors[(vOff + i) * 3 + 1] = color.g + variation;
      colors[(vOff + i) * 3 + 2] = color.b + variation * 0.5;
    }

    if (idx) {
      for (let i = 0; i < idx.count; i++) {
        indices[iOff + i] = idx.array[i] + vOff;
      }
      iOff += idx.count;
    }

    vOff += pos.count;
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  merged.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  merged.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  merged.setIndex(new THREE.BufferAttribute(indices, 1));
  return merged;
}

/** Build the base tree geometry: trunk cylinder + stacked canopy cones with vertex colors. */
function createTreeBase(): THREE.BufferGeometry {
  const trunk = new THREE.CylinderGeometry(
    TRUNK_RADIUS_TOP,
    TRUNK_RADIUS_BOTTOM,
    TRUNK_HEIGHT,
    TRUNK_SEGMENTS,
  );
  trunk.translate(0, TRUNK_HEIGHT / 2, 0);

  const parts: { geometry: THREE.BufferGeometry; color: THREE.Color }[] = [
    { geometry: trunk, color: TRUNK_COLOR },
  ];

  for (let i = 0; i < CANOPY_LAYERS.length; i++) {
    const { radius, height, y } = CANOPY_LAYERS[i];
    const cone = new THREE.ConeGeometry(radius, height, CANOPY_SEGMENTS);
    cone.translate(0, y + height / 2, 0);
    parts.push({ geometry: cone, color: CANOPY_COLORS[i] });
  }

  return mergeWithColors(parts);
}

// --- Shaders ---

const treeVertexShader = /* glsl */ `
    precision highp float;

    attribute vec3 color;
    attribute vec3 offset;
    attribute float treeScale;
    attribute float rotY;

    uniform float uTime;
    uniform float uTreeHeight;

    varying vec3 vColor;
    varying vec3 vNormal;

    void main() {
        // Rotate around Y axis
        float s = sin(rotY);
        float c = cos(rotY);
        vec3 pos = vec3(
            position.x * c - position.z * s,
            position.y,
            position.x * s + position.z * c
        );

        // Scale
        pos *= treeScale;

        // Wind sway — increases with height, unique per tree
        float heightFactor = max(pos.y - 1.5 * treeScale, 0.0) / (uTreeHeight * treeScale);
        float windX = sin(uTime * 1.5 + offset.x * 0.4 + offset.z * 0.2) * 0.4 * heightFactor;
        float windZ = sin(uTime * 1.1 + offset.z * 0.3) * 0.25 * heightFactor;
        pos.x += windX;
        pos.z += windZ;

        // World position
        vec3 worldPos = offset + pos;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(worldPos, 1.0);

        // Rotate normals to match tree orientation
        vec3 n = normal;
        n = vec3(n.x * c - n.z * s, n.y, n.x * s + n.z * c);
        vNormal = normalMatrix * n;
        vColor = color;
    }
`;

const treeFragmentShader = /* glsl */ `
    precision highp float;

    varying vec3 vColor;
    varying vec3 vNormal;

    void main() {
        vec3 lightDir = normalize(vec3(0.5, 1.0, 0.3));
        float diffuse = max(dot(normalize(vNormal), lightDir), 0.0);
        vec3 color = vColor * (0.45 + diffuse * 0.55);

        gl_FragColor = vec4(color, 1.0);

        #include <tonemapping_fragment>
        #include <colorspace_fragment>
    }
`;

// --- Material ---

export class TreeMaterial extends THREE.ShaderMaterial {
  constructor() {
    super({
      uniforms: {
        uTime: { value: 0 },
        uTreeHeight: { value: 7 },
      },
      vertexShader: treeVertexShader,
      fragmentShader: treeFragmentShader,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
  }
}

// --- Instanced Geometry ---

export type TreeGeometryOptions = {
  count: number;
  spread: number;
  getGroundHeight: (x: number, z: number) => number;
};

export class TreeGeometry extends THREE.InstancedBufferGeometry {
  constructor({ count, spread, getGroundHeight }: TreeGeometryOptions) {
    super();

    const base = createTreeBase();

    this.index = base.index;
    this.setAttribute("position", base.attributes.position);
    this.setAttribute("normal", base.attributes.normal);
    this.setAttribute("color", base.attributes.color);

    const offsets = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const rotations = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const x = Math.random() * spread - spread / 2;
      const z = Math.random() * spread - spread / 2;

      // Keep a clear area around the spawn point
      const distFromCenter = Math.sqrt(x * x + z * z);
      if (distFromCenter < 5) {
        // Push outward
        const angle = Math.atan2(z, x);
        offsets[i * 3] = Math.cos(angle) * (5 + Math.random() * 2);
        offsets[i * 3 + 2] = Math.sin(angle) * (5 + Math.random() * 2);
      } else {
        offsets[i * 3] = x;
        offsets[i * 3 + 2] = z;
      }

      offsets[i * 3 + 1] = getGroundHeight(
        offsets[i * 3],
        offsets[i * 3 + 2],
      );

      scales[i] = 0.6 + Math.random() * 0.8;
      rotations[i] = Math.random() * Math.PI * 2;
    }

    this.setAttribute(
      "offset",
      new THREE.InstancedBufferAttribute(offsets, 3),
    );
    this.setAttribute(
      "treeScale",
      new THREE.InstancedBufferAttribute(scales, 1),
    );
    this.setAttribute(
      "rotY",
      new THREE.InstancedBufferAttribute(rotations, 1),
    );

    this.instanceCount = count;
    this.boundingSphere = new THREE.Sphere(
      new THREE.Vector3(),
      (Math.sqrt(2) * spread) / 2,
    );
  }
}
