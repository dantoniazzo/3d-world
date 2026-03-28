import { useFrame, type ObjectMap } from "@react-three/fiber";
import { type ThirdPersonCameraProps } from "./person-camera";
import { useAnimations, useKeyboardControls } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";
import { type GLTF } from "three-stdlib";

const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _moveDir = new THREE.Vector3();
const _targetQuat = new THREE.Quaternion();
const _currentQuat = new THREE.Quaternion();
const Y_AXIS = new THREE.Vector3(0, 1, 0);

const WALK_SPEED = 0.75;
const RUN_SPEED = 1.5;
const JUMP_IMPULSE = 0.05;
const GROUND_THRESHOLD = 0.1;
const ROTATION_SPEED = 10;
const RUN_TIMESCALE = 2;

export interface PersonMovementProps extends ThirdPersonCameraProps {
  model: GLTF & ObjectMap;
  initialPosition: THREE.Vector3;
}

export const usePersonMovement = ({
  target,
  model,
  initialPosition,
}: PersonMovementProps) => {
  const { actions } = useAnimations(model.animations, model.scene);
  const [, getKeys] = useKeyboardControls();
  const currentAnim = useRef("Survey");
  const runTimeScaleSet = useRef(false);

  useFrame(({ camera }, delta) => {
    if (!target) return;

    const keys = getKeys();

    if (keys.reset) {
      target.setTranslation(initialPosition, true);
      target.setLinvel({ x: 0, y: 0, z: 0 }, true);
      target.setAngvel({ x: 0, y: 0, z: 0 }, true);
      return;
    }

    if (keys.jump && target.translation().y < GROUND_THRESHOLD) {
      target.applyImpulse({ x: 0, y: JUMP_IMPULSE, z: 0 }, true);
    }

    // Set run animation speed once
    if (!runTimeScaleSet.current && actions["Run"]) {
      actions["Run"].timeScale = RUN_TIMESCALE;
      runTimeScaleSet.current = true;
    }

    // Switch animation only when state changes
    const isMoving = keys.forward || keys.back || keys.left || keys.right;
    const desired = isMoving ? (keys.shift ? "Run" : "Walk") : "Survey";
    if (desired !== currentAnim.current) {
      actions[currentAnim.current]?.stop();
      actions[desired]?.play();
      currentAnim.current = desired;
    }

    if (!isMoving) return;

    // Camera-relative movement direction
    camera.getWorldDirection(_forward);
    _forward.y = 0;
    _forward.normalize();
    _right.set(-_forward.z, 0, _forward.x);

    _moveDir.set(0, 0, 0);
    if (keys.forward) _moveDir.add(_forward);
    if (keys.back) _moveDir.sub(_forward);
    if (keys.right) _moveDir.add(_right);
    if (keys.left) _moveDir.sub(_right);
    _moveDir.normalize();

    const speed = keys.shift ? RUN_SPEED : WALK_SPEED;
    target.applyImpulse(
      { x: _moveDir.x * speed * delta, y: 0, z: _moveDir.z * speed * delta },
      true,
    );

    // Smooth rotation towards movement direction
    const targetAngle = Math.atan2(_moveDir.x, _moveDir.z);
    _targetQuat.setFromAxisAngle(Y_AXIS, targetAngle);

    const rot = target.rotation();
    _currentQuat.set(rot.x, rot.y, rot.z, rot.w);
    _currentQuat.slerp(_targetQuat, ROTATION_SPEED * delta);
    target.setRotation(_currentQuat, true);
  });
};
