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

const WALK_SPEED = 5;
const RUN_SPEED = 10;
const JUMP_IMPULSE = 3;
const GROUND_THRESHOLD = 0.15;
const ROTATION_SPEED = 10;
const CROSSFADE_DURATION = 0.2;
const JUMP_CROSSFADE = 0.1;

export interface PersonMovementProps extends ThirdPersonCameraProps {
  model: GLTF & ObjectMap;
  initialPosition: THREE.Vector3;
}

export const usePersonMovement = ({
  targetRef,
  model,
  initialPosition,
}: PersonMovementProps) => {
  const { actions } = useAnimations(model.animations, model.scene);
  const [, getKeys] = useKeyboardControls();
  const currentAnim = useRef("Idle");
  const wasJumpPressed = useRef(false);
  const animInitialized = useRef(false);

  useFrame(({ camera }, delta) => {
    // Start Idle animation as soon as actions are ready (before target check)
    if (!animInitialized.current && actions["Idle"]) {
      actions["Idle"].play();
      animInitialized.current = true;
    }

    const target = targetRef.current;
    if (!target) return;

    const keys = getKeys();

    if (keys.reset) {
      target.setTranslation(initialPosition, true);
      target.setLinvel({ x: 0, y: 0, z: 0 }, true);
      target.setAngvel({ x: 0, y: 0, z: 0 }, true);
      return;
    }

    const isGrounded = target.translation().y < GROUND_THRESHOLD;

    // Jump on rising edge only
    if (keys.jump && isGrounded && !wasJumpPressed.current) {
      target.applyImpulse({ x: 0, y: JUMP_IMPULSE, z: 0 }, true);
    }
    wasJumpPressed.current = !!keys.jump;

    // Animation state
    const isMoving = keys.forward || keys.back || keys.left || keys.right;
    const desired = !isGrounded
      ? "Jump"
      : isMoving
        ? keys.shift
          ? "Run"
          : "Walk"
        : "Idle";

    if (desired !== currentAnim.current) {
      const prev = actions[currentAnim.current];
      const next = actions[desired];
      const fade =
        desired === "Jump" || currentAnim.current === "Jump"
          ? JUMP_CROSSFADE
          : CROSSFADE_DURATION;
      if (next) {
        next.reset().fadeIn(fade).play();
        prev?.fadeOut(fade);
      }
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
    const targetAngle = Math.atan2(_moveDir.x, _moveDir.z) + Math.PI;
    _targetQuat.setFromAxisAngle(Y_AXIS, targetAngle);

    const rot = target.rotation();
    _currentQuat.set(rot.x, rot.y, rot.z, rot.w);
    _currentQuat.slerp(_targetQuat, ROTATION_SPEED * delta);
    target.setRotation(_currentQuat, true);
  });
};
