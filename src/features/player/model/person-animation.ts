import { useFrame, type ObjectMap } from "@react-three/fiber";
import { type ThirdPersonCameraProps } from "./person-camera";
import { useAnimations, useKeyboardControls } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";
import { type GLTF } from "three-stdlib";

// --- Constants ---

const JUMP_IMPULSE = 3;
/** Character is considered grounded when rigid body y is below this value */
const GROUND_THRESHOLD = 0.15;
/** Duration (seconds) of the standing jump crouch wind-up before the impulse fires */
const JUMP_DELAY = 0.5;

/** Crossfade duration for standard transitions (idle <-> walk <-> run) */
const CROSSFADE_DURATION = 0.2;
/** Fast crossfade when entering a jump animation */
const JUMP_IN_CROSSFADE = 0.1;
/** Slower crossfade when landing — blends the jump pose smoothly into walk/run/idle */
const JUMP_OUT_CROSSFADE = 0.5;

type JumpAnim = "jump" | "running-jump";

const JUMP_ANIMS = new Set<string>(["jump", "running-jump"]);

// --- Hook ---

export interface PersonAnimationProps extends ThirdPersonCameraProps {
  model: GLTF & ObjectMap;
}

/**
 * Manages the character's animation state machine and jump physics impulse.
 *
 * Animation states: idle | walk | run | jump | running-jump
 *
 * Jump flow:
 *   Standing jump  — crouch wind-up (JUMP_DELAY) then impulse
 *   Moving jump    — impulse fires immediately (no wind-up)
 */
export const usePersonAnimation = ({
  targetRef,
  model,
}: PersonAnimationProps) => {
  const { actions, mixer } = useAnimations(model.animations, model.scene);
  const [, getKeys] = useKeyboardControls();

  // Animation state
  const currentAnim = useRef("idle");
  const animInitialized = useRef(false);

  // Jump state
  const wasJumpPressed = useRef(false);
  /** -1 = not crouching, >= 0 = elapsed crouch time (standing jump only) */
  const crouchTimer = useRef(-1);
  /** Stays true from impulse until the character actually leaves the ground,
   *  preventing the animation from flickering back to idle for 1-2 frames */
  const awaitingLiftoff = useRef(false);
  /** Which jump animation to play for the current jump */
  const jumpAnim = useRef<JumpAnim>("jump");

  useFrame((_, delta) => {
    // Play idle animation on the first frame (before rigid body is ready)
    if (!animInitialized.current && actions["idle"]) {
      actions["idle"].play();
      animInitialized.current = true;
    }

    const target = targetRef.current;
    if (!target) return;

    const keys = getKeys();
    const isGrounded = target.translation().y < GROUND_THRESHOLD;
    const isMoving = keys.forward || keys.back || keys.left || keys.right;

    // ── Jump initiation (rising edge of Space key) ──────────────────────
    if (keys.jump && isGrounded && !wasJumpPressed.current && crouchTimer.current < 0) {
      jumpAnim.current = isMoving ? "running-jump" : "jump";

      if (jumpAnim.current === "running-jump") {
        // Moving jump — apply impulse immediately, no crouch wind-up
        target.applyImpulse({ x: 0, y: JUMP_IMPULSE, z: 0 }, true);
        awaitingLiftoff.current = true;
      } else {
        // Standing jump — start the crouch wind-up timer
        crouchTimer.current = 0;
      }
    }
    wasJumpPressed.current = !!keys.jump;

    // ── Standing jump crouch timer ──────────────────────────────────────
    if (crouchTimer.current >= 0) {
      if (!isGrounded) {
        // Fell off a ledge during crouch — cancel the jump
        crouchTimer.current = -1;
      } else {
        crouchTimer.current += delta;
        if (crouchTimer.current >= JUMP_DELAY) {
          // Crouch phase complete — fire the impulse
          target.applyImpulse({ x: 0, y: JUMP_IMPULSE, z: 0 }, true);
          crouchTimer.current = -1;
          awaitingLiftoff.current = true;
        }
      }
    }

    // Clear liftoff flag once the character is actually airborne
    if (!isGrounded) {
      awaitingLiftoff.current = false;
    }

    // ── Determine desired animation ─────────────────────────────────────
    const isCrouching = crouchTimer.current >= 0;
    const inJump = !isGrounded || isCrouching || awaitingLiftoff.current;

    const desired = inJump
      ? jumpAnim.current
      : isMoving
        ? keys.shift
          ? "run"
          : "walk"
        : "idle";

    // ── Crossfade on state change ───────────────────────────────────────
    if (desired !== currentAnim.current) {
      const next = actions[desired];
      if (next) {
        // Configure jump animations to play once and hold the final frame
        if (JUMP_ANIMS.has(desired)) {
          const clip = model.animations.find((c) => c.name === desired);
          if (clip) {
            const action = mixer.clipAction(clip);
            action.setLoop(THREE.LoopOnce, 1);
            action.clampWhenFinished = true;
          }
        }

        // Pick crossfade duration: fast into jumps, slow out of jumps, normal otherwise
        const fade = JUMP_ANIMS.has(desired)
          ? JUMP_IN_CROSSFADE
          : JUMP_ANIMS.has(currentAnim.current)
            ? JUMP_OUT_CROSSFADE
            : CROSSFADE_DURATION;

        next.reset().fadeIn(fade).play();
        actions[currentAnim.current]?.fadeOut(fade);
      }
      currentAnim.current = desired;
    }
  });
};
