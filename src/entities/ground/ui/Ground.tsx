import { RigidBody } from "@react-three/rapier";
import { Vector3 } from "three";
import { groundConfig } from "../model";

interface GroundProps {
  size?: Vector3;
}

export const Ground = (props: GroundProps) => {
  return (
    <RigidBody type="fixed" restitution={0} friction={0.7}>
      <mesh position-y={0}>
        <boxGeometry
          args={
            props.size
              ? [props.size.x, props.size.y, props.size.z]
              : [groundConfig.size.x, groundConfig.size.y, groundConfig.size.z]
          }
        />
        <meshBasicMaterial color="#303030" />
      </mesh>
    </RigidBody>
  );
};
