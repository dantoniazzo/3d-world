import { useFrame } from "@react-three/fiber";
import { RapierRigidBody } from "@react-three/rapier";
import { useMouseControls } from "features/controls";
import { useEffect, useRef } from "react";
import * as THREE from "three";

export interface ThirdPersonCameraProps {
  target: RapierRigidBody | null;
}
export const useThirdPersonCamera = ({ target }: ThirdPersonCameraProps) => {
  const mouseControls = useMouseControls();

  const cameraState = useRef({
    distance: 4,
    horizontalAngle: 0,
    verticalAngle: 0.5,
    // Add smoothing parameters
    currentHorizontalVelocity: 0,
    currentVerticalVelocity: 0,
    // Configuration
    mouseSensitivity: 0.002,
    orbitSensitivity: 0.005, // Sensitivity for orbital rotation
    smoothingFactor: 0,
    maxVerticalAngle: 0.51,
    minVerticalAngle: 0.1,
    zoomSpeed: 0.5,
    // Track if mouse is moving
    isMouseMoving: false,
    lastMouseMoveTime: 0,
  });

  useEffect(() => {
    // Lock pointer on click
    const canvas = document.querySelector("canvas");
    const handlePointerLockChange = () => {
      canvas?.requestPointerLock();
    };

    if (canvas) {
      canvas.requestPointerLock();
      canvas.addEventListener("click", handlePointerLockChange);
    }

    return () => {
      if (canvas) {
        canvas.removeEventListener("click", handlePointerLockChange);
      }
    };
  }, []);

  useFrame((state) => {
    if (!target) return;

    const {
      mouseSensitivity,
      orbitSensitivity,
      smoothingFactor,
      maxVerticalAngle,
      minVerticalAngle,
    } = cameraState.current;
    // Check if mouse is currently moving
    const currentTime = performance.now();
    const isMoving =
      mouseControls.movementX !== 0 || mouseControls.movementY !== 0;

    if (isMoving) {
      cameraState.current.isMouseMoving = true;
      cameraState.current.lastMouseMoveTime = currentTime;
    } else if (currentTime - cameraState.current.lastMouseMoveTime > 50) {
      // If no movement for 50ms, consider the mouse stopped
      cameraState.current.isMouseMoving = false;
      // Reset velocities when mouse stops
      cameraState.current.currentHorizontalVelocity = 0;
      cameraState.current.currentVerticalVelocity = 0;
    }

    // Handle camera rotation based on mouse state
    if (mouseControls.isRightMouseDown) {
      // Orbital rotation (right mouse button) - direct movement without smoothing
      if (isMoving) {
        cameraState.current.horizontalAngle -=
          mouseControls.movementX * orbitSensitivity;
        cameraState.current.verticalAngle = THREE.MathUtils.clamp(
          cameraState.current.verticalAngle +
            mouseControls.movementY * orbitSensitivity,
          minVerticalAngle,
          maxVerticalAngle,
        );
      }
    } else if (document.pointerLockElement) {
      // First person looking (pointer lock)
      if (isMoving) {
        // Only update velocities when mouse is actually moving
        const targetHorizontalVelocity =
          -mouseControls.movementX * mouseSensitivity;
        const targetVerticalVelocity =
          mouseControls.movementY * mouseSensitivity;

        // Apply movement directly or with minimal smoothing
        cameraState.current.horizontalAngle += targetHorizontalVelocity;
        cameraState.current.verticalAngle = THREE.MathUtils.clamp(
          cameraState.current.verticalAngle + targetVerticalVelocity,
          minVerticalAngle,
          maxVerticalAngle,
        );
      }
    }

    // Calculate camera position using spherical coordinates
    const theta = cameraState.current.horizontalAngle;
    const phi = cameraState.current.verticalAngle;
    const distance = cameraState.current.distance;

    // Smoothly interpolate camera position
    const targetPosition = new THREE.Vector3(
      target.translation().x + distance * Math.sin(theta) * Math.cos(phi),
      target.translation().y + distance * Math.sin(phi),
      target.translation().z + distance * Math.cos(theta) * Math.cos(phi),
    );

    // Apply position smoothing only for camera positioning, not for rotation control
    state.camera.position.lerp(targetPosition, 1 - smoothingFactor);

    // Look at target with offset
    const lookAtPosition = new THREE.Vector3(
      target.translation().x,
      target.translation().y,
      target.translation().z,
    );

    state.camera.lookAt(lookAtPosition);
  });

  return null;
};
