import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { RigidBody } from "@react-three/rapier";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { GrassGeometry, GrassMaterial } from "../model/grass";
import {
  GROUND_COLOR,
  GROUND_WIDTH,
  getGroundHeight,
} from "../model/ground.config";

const BLADE_WIDTH = 0.03;
const BLADE_HEIGHT = 0.15;
const BLADE_JOINTS = 3;
const INSTANCES = 500000;

/** Creates a PlaneGeometry with vertex heights from the noise-based terrain function */
function createGroundGeometry(width: number) {
  const geometry = new THREE.PlaneGeometry(width, width, 32, 32);
  geometry.rotateX(-Math.PI / 2);

  const pos = geometry.attributes.position.array as Float32Array;
  for (let i = 0; i < pos.length / 3; i++) {
    pos[i * 3 + 1] = getGroundHeight(pos[i * 3], pos[i * 3 + 2]);
  }

  geometry.computeVertexNormals();
  return geometry;
}

function createCloudTexture(texture: THREE.Texture) {
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export const Ground = () => {
  const cloudMapRaw = useTexture("/cloud.jpg");
  const alphaMap = useTexture("/grass-blade-alpha.jpg");
  const materialRef = useRef<GrassMaterial | null>(null);

  const cloudMap = useMemo(
    () => createCloudTexture(cloudMapRaw),
    [cloudMapRaw],
  );

  const groundGeometry = useMemo(
    () => createGroundGeometry(GROUND_WIDTH),
    [],
  );

  const grassGeometry = useMemo(
    () =>
      new GrassGeometry({
        bladeWidth: BLADE_WIDTH,
        bladeHeight: BLADE_HEIGHT,
        bladeJoints: BLADE_JOINTS,
        width: GROUND_WIDTH,
        instances: INSTANCES,
        getGroundHeight,
      }),
    [],
  );

  const grassMaterial = useMemo(() => {
    const mat = new GrassMaterial();
    mat.uniforms.uCloud.value = cloudMap;
    mat.uniforms.alphaMap.value = alphaMap;
    mat.uniforms.uBladeHeight.value = BLADE_HEIGHT;
    materialRef.current = mat;
    return mat;
  }, [cloudMap, alphaMap]);

  useFrame(({ clock: { elapsedTime } }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = elapsedTime;
    }
  });

  return (
    <>
      {/* Ground mesh with physics collider matching the terrain shape */}
      <RigidBody type="fixed" colliders="trimesh" restitution={0} friction={0.7}>
        <mesh>
          <primitive object={groundGeometry} />
          <meshStandardMaterial color={GROUND_COLOR} />
        </mesh>
      </RigidBody>

      {/* Grass blades — visual only, no physics */}
      <mesh>
        <primitive object={grassGeometry} />
        <primitive object={grassMaterial} />
      </mesh>
    </>
  );
};
