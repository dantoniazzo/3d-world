import { RigidBody, RapierRigidBody } from "@react-three/rapier";
import { useRef } from "react";
import { useThirdPersonCamera } from "../model/person-camera";
import { usePersonMovement } from "../model/person-movement";
import { useGLTF } from "@react-three/drei";
import { Vector3 } from "three";

const DAMPING = 3; // Linear damping to prevent sliding

export interface PersonProps {
  isLocalUser?: boolean;
  initialPosition?: Vector3;
}

export const Player = (props: PersonProps) => {
  const { initialPosition = new Vector3() } = props;
  const body = useRef<RapierRigidBody | null>(null);
  const fox = useGLTF("/fox.glb");

  useThirdPersonCamera({
    target: body.current,
  });
  usePersonMovement({
    target: body.current,
    model: fox,
    initialPosition,
  });

  return (
    <RigidBody
      ref={body}
      colliders="cuboid"
      linearDamping={DAMPING}
      friction={0.5}
      rotation={[0, Math.PI, 0]}
      position={initialPosition}
    >
      <primitive scale={0.006} object={fox.scene} castShadow />
    </RigidBody>
  );
};
