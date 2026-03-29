import { useFrame } from "@react-three/fiber";
import { RapierRigidBody } from "@react-three/rapier";
import { useMouseControls } from "features/controls";
import { type RefObject, useEffect, useRef } from "react";
import * as THREE from "three";

const _cameraPos = new THREE.Vector3();
const _lookAt = new THREE.Vector3();

const DISTANCE = 4;
const MOUSE_SENSITIVITY = 0.002;
const ORBIT_SENSITIVITY = 0.005;
const MIN_VERTICAL = 0.1;
const MAX_VERTICAL = 0.51;

export interface ThirdPersonCameraProps {
  targetRef: RefObject<RapierRigidBody | null>;
}

export const useThirdPersonCamera = ({ targetRef }: ThirdPersonCameraProps) => {
  const mouse = useMouseControls();
  const angles = useRef({ horizontal: 0, vertical: 0.5 });

  useEffect(() => {
    const canvas = document.querySelector("canvas");
    if (!canvas) return;

    canvas.requestPointerLock();
    const onClick = () => canvas.requestPointerLock();
    canvas.addEventListener("click", onClick);
    return () => canvas.removeEventListener("click", onClick);
  }, []);

  useFrame(({ camera }) => {
    const target = targetRef.current;
    if (!target) return;

    const hasMovement = mouse.movementX !== 0 || mouse.movementY !== 0;
    if (hasMovement && (mouse.isRightMouseDown || document.pointerLockElement)) {
      const sensitivity = mouse.isRightMouseDown
        ? ORBIT_SENSITIVITY
        : MOUSE_SENSITIVITY;

      angles.current.horizontal -= mouse.movementX * sensitivity;
      angles.current.vertical = THREE.MathUtils.clamp(
        angles.current.vertical + mouse.movementY * sensitivity,
        MIN_VERTICAL,
        MAX_VERTICAL,
      );
    }

    const { horizontal: theta, vertical: phi } = angles.current;
    const { x, y, z } = target.translation();
    const cosPhi = Math.cos(phi);

    _cameraPos.set(
      x + DISTANCE * Math.sin(theta) * cosPhi,
      y + DISTANCE * Math.sin(phi),
      z + DISTANCE * Math.cos(theta) * cosPhi,
    );

    camera.position.copy(_cameraPos);
    camera.lookAt(_lookAt.set(x, y, z));
  });
};
