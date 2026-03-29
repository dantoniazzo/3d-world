import { useFrame, type ObjectMap } from "@react-three/fiber";
import { type ThirdPersonCameraProps } from "./person-camera";
import { useAnimations, useKeyboardControls } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";
import { type GLTF } from "three-stdlib";

// --- Constants ---

const JUMP_IMPULSE = 1.5;
/** Character is grounded when vertical velocity magnitude is below this value.
 *  Using velocity instead of Y position so hills/terrain height don't matter. */
const GROUNDED_VELOCITY = 1.5;
/** Duration (seconds) of the standing jump crouch wind-up before the impulse fires */
const JUMP_DELAY = 0.5;

/** Crossfade duration for standard transitions (idle <-> walk <-> run) */
const CROSSFADE_DURATION = 0.2;
/** Fast crossfade when entering a jump animation */
const JUMP_IN_CROSSFADE = 0.1;
/** Slower crossfade when landing — blends the jump pose smoothly into walk/run/idle */
const JUMP_OUT_CROSSFADE = 0.5;

type JumpAnim = "jump" | "running-jump";
type Anim = "idle" | "walk" | "run" | JumpAnim;

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
  const currentAnim = useRef<Anim>("idle");
  const animInitialized = useRef(false);

  // Jump state
  const wasJumpPressed = useRef(false);
  /** -1 = not crouching, >= 0 = elapsed crouch time (standing jump only) */
  const crouchTimer = useRef(-1);
  /** Frame counter after impulse — keeps jump animation active for a few frames
   *  while the physics body hasn't risen above GROUND_THRESHOLD yet.
   *  Counts down to 0, then expires. Prevents permanent lock if impulse is
   *  too weak to clear the threshold. */
  const liftoffFrames = useRef(0);
  /** Which jump animation to play for the current jump */
  const jumpAnim = useRef<JumpAnim>("jump");

  /**
   * Crossfade from the current animation to a new one.
   *
   * Uses `crossFadeFrom` which atomically fades out the previous action's weight
   * while fading in the new action — this works correctly even when the previous
   * action is a paused/clamped LoopOnce jump animation.
   */
  const transitionTo = (to: Anim, fadeDuration: number) => {
    const next = actions[to];
    if (!next) return;

    // Configure jump animations to play once and hold the final frame
    if (JUMP_ANIMS.has(to)) {
      const clip = model.animations.find((c) => c.name === to);
      if (clip) {
        const action = mixer.clipAction(clip);
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
      }
    }

    const prev = actions[currentAnim.current];

    // Reset the target action (clears time, fading, warping; sets enabled=true)
    next.reset();

    // crossFadeFrom handles the weight blend atomically:
    //   - calls prev.fadeOut(duration)  → weight 1→0
    //   - calls next.fadeIn(duration)   → weight 0→1
    // The mixer processes weight interpolants for all active actions (including
    // paused/clamped ones), so the outgoing jump pose blends smoothly.
    if (prev && prev !== next) {
      next.crossFadeFrom(prev, fadeDuration, false);
    }

    next.play();
    currentAnim.current = to;
  };

  useFrame((_, delta) => {
    // ── Initialize idle animation on first frame ────────────────────────
    if (!animInitialized.current && actions["idle"]) {
      actions["idle"].play();
      animInitialized.current = true;
    }

    const target = targetRef.current;
    if (!target) return;

    const keys = getKeys();
    const isGrounded = Math.abs(target.linvel().y) < GROUNDED_VELOCITY;
    const isMoving = keys.forward || keys.back || keys.left || keys.right;

    // ── Jump initiation (rising edge of Space key) ──────────────────────
    if (
      keys.jump &&
      isGrounded &&
      !wasJumpPressed.current &&
      crouchTimer.current < 0 &&
      liftoffFrames.current === 0
    ) {
      jumpAnim.current = isMoving ? "running-jump" : "jump";

      if (jumpAnim.current === "running-jump") {
        // Moving jump — apply impulse immediately, no crouch wind-up
        target.applyImpulse({ x: 0, y: JUMP_IMPULSE, z: 0 }, true);
        liftoffFrames.current = 10;
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
          liftoffFrames.current = 10;
        }
      }
    }

    // Liftoff counter: counts down each frame, clears immediately if airborne
    if (liftoffFrames.current > 0) {
      if (!isGrounded) {
        liftoffFrames.current = 0;
      } else {
        liftoffFrames.current--;
      }
    }

    // ── Determine desired animation ─────────────────────────────────────
    const isCrouching = crouchTimer.current >= 0;
    const isLiftingOff = liftoffFrames.current > 0;

    // If a jump animation is currently playing, check whether it has finished.
    // Keep playing the jump animation until it completes AND the character has landed.
    const playingJump = JUMP_ANIMS.has(currentAnim.current);
    let jumpAnimDone = false;
    if (playingJump) {
      const clip = model.animations.find((c) => c.name === currentAnim.current);
      if (clip) {
        const action = mixer.clipAction(clip);
        jumpAnimDone = action.time >= clip.duration - 0.05;
      }
    }

    const inJump = playingJump
      ? !jumpAnimDone || !isGrounded // stay in jump until animation finishes AND landed
      : !isGrounded || isCrouching || isLiftingOff;

    const desired: Anim = inJump
      ? jumpAnim.current
      : isMoving
        ? keys.shift
          ? "run"
          : "walk"
        : "idle";

    // ── Transition on state change ──────────────────────────────────────
    if (desired !== currentAnim.current) {
      const enteringJump = JUMP_ANIMS.has(desired);
      const leavingJump = JUMP_ANIMS.has(currentAnim.current);

      const fade = enteringJump
        ? JUMP_IN_CROSSFADE
        : leavingJump
          ? JUMP_OUT_CROSSFADE
          : CROSSFADE_DURATION;

      transitionTo(desired, fade);
    }
  });
};
