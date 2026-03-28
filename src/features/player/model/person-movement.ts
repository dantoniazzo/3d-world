import { useFrame, type ObjectMap } from "@react-three/fiber";
import { type ThirdPersonCameraProps } from "./person-camera";
import { useAnimations, useKeyboardControls } from "@react-three/drei";
import * as THREE from "three";
import { type GLTF } from "three-stdlib";

export interface PersonMovementProps extends ThirdPersonCameraProps {
  model: GLTF & ObjectMap;
  initialPosition: THREE.Vector3;
}

export const usePersonMovement = (props: PersonMovementProps) => {
  const animations = useAnimations(props.model.animations, props.model.scene);
  const [, getKeys] = useKeyboardControls();

  const reset = () => {
    if (!props.target) return;
    props.target.setTranslation(props.initialPosition, true);
    props.target.setLinvel({ x: 0, y: 0, z: 0 }, true);
    props.target.setAngvel({ x: 0, y: 0, z: 0 }, true);
  };
  const jumpUp = () => {
    if (!props.target) return;
    const translation = props.target.translation();
    if (translation.y < 0.1) {
      props.target.applyImpulse({ x: 0, y: 0.05, z: 0 }, true);
    }
  };

  useFrame((state, delta) => {
    if (!props.target) return;
    const speed = getKeys().shift ? 1.5 : 0.75;

    // Get camera's forward and right directions
    const cameraForward = new THREE.Vector3();
    state.camera.getWorldDirection(cameraForward);
    cameraForward.y = 0;
    cameraForward.normalize();

    const cameraRight = new THREE.Vector3(cameraForward.z, 0, -cameraForward.x);

    // Calculate movement direction
    const moveDir = new THREE.Vector3(0, 0, 0);
    if (getKeys().forward) moveDir.add(cameraForward);
    if (getKeys().back) moveDir.sub(cameraForward);
    if (getKeys().right) moveDir.sub(cameraRight);
    if (getKeys().left) moveDir.add(cameraRight);
    if (getKeys().jump) jumpUp();
    if (getKeys().reset) reset();

    const walk = animations.actions["Walk"];
    const run = animations.actions["Run"];
    const idle = animations.actions["Survey"];
    if (run) run.timeScale = 2; // Adjust run speed
    if (
      getKeys().forward ||
      getKeys().back ||
      getKeys().left ||
      getKeys().right
    ) {
      if (getKeys().shift) {
        idle?.stop();
        walk?.stop();
        run?.play();
      } else {
        idle?.stop();
        run?.stop();
        walk?.play();
      }
    } else {
      idle?.play();
      walk?.stop();
      run?.stop();
    }

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();

      const newPosition = {
        x: moveDir.x * speed * delta,
        y: 0,
        z: moveDir.z * speed * delta,
      };
      // Move character
      props.target.applyImpulse(newPosition, true);

      // Calculate props.target rotation angle based on movement direction
      const targetAngle = Math.atan2(moveDir.x, moveDir.z);

      // Interpolate towards target angle using quaternions for smooth rotation
      const targetQuaternion = new THREE.Quaternion();
      targetQuaternion.setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        targetAngle,
      );

      // Retrieve the current rotation as a quaternion
      const currentQuaternion = new THREE.Quaternion();
      const currentRotation = props.target.rotation();
      currentQuaternion.set(
        currentRotation.x,
        currentRotation.y,
        currentRotation.z,
        currentRotation.w,
      );

      // Smoothly interpolate rotation with quaternion slerp
      currentQuaternion.slerp(targetQuaternion, 10 * delta); // 10 * delta adjusts rotation speed

      // Apply the new rotation to the target
      props.target.setRotation(currentQuaternion, true);
    }
  });
};
