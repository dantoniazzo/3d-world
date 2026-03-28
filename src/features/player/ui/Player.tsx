import { RigidBody, RapierRigidBody, CuboidCollider } from "@react-three/rapier";
import { useRef } from "react";
import { useThirdPersonCamera } from "../model/person-camera";
import { usePersonMovement } from "../model/person-movement";
import { useGLTF } from "@react-three/drei";
import { Vector3 } from "three";

const DAMPING = 3;
const DEFAULT_POSITION = new Vector3(0, 0.05, 0);

export interface PersonProps {
  isLocalUser?: boolean;
  initialPosition?: Vector3;
}

export const Player = (props: PersonProps) => {
  const { initialPosition = DEFAULT_POSITION } = props;
  const body = useRef<RapierRigidBody | null>(null);
  const model = useGLTF("/soldier.glb");

  useThirdPersonCamera({
    target: body.current,
  });
  usePersonMovement({
    target: body.current,
    model,
    initialPosition,
  });

  return (
    <RigidBody
      ref={body}
      colliders={false}
      linearDamping={DAMPING}
      friction={0.5}
      lockRotations
      position={initialPosition}
    >
      <CuboidCollider args={[0.3, 0.9, 0.3]} position={[0, 0.9, 0]} />
      <primitive scale={1} object={model.scene} castShadow />
    </RigidBody>
  );
};
