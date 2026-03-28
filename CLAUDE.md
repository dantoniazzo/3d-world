# CLAUDE.md

## Project Overview

3D character controller built with React Three Fiber. A first/third-person fox character exploring a physics-enabled world in the browser.

## Tech Stack

- **Framework:** React 19, TypeScript 5.9, Vite 8
- **3D:** Three.js via @react-three/fiber, @react-three/drei
- **Physics:** Rapier via @react-three/rapier
- **State:** Zustand (settings), React hooks (controls/movement/camera)
- **Styling:** Tailwind CSS 4
- **Debug:** Leva (dev-only settings panel)

## Architecture

Feature Sliced Design (FSD) with model/ui separation per feature:

```
src/
  entities/       # Reusable 3D objects (ground)
  features/       # Domain logic (controls, player, settings)
  widgets/        # Composite scenes (world)
  shared/         # Utilities & common UI (Canvas, Spinner, hooks)
  App.tsx         # Root: KeyboardControls wrapper + Canvas
  main.tsx        # React DOM entry point
```

Each feature has `model/` (logic, hooks, config) and `ui/` (React components).

## Path Aliases

Configured in both `vite.config.ts` and `tsconfig.app.json`:

- `entities/` -> `src/entities/`
- `features/` -> `src/features/`
- `widgets/` -> `src/widgets/`
- `pages/` -> `src/pages/`
- `shared/` -> `src/shared/`

Always use these aliases for imports, never relative paths across layer boundaries.

## Key Systems

**Player Movement** (`features/player/model/person-movement.ts`):
- Impulse-based physics movement (not direct position setting)
- Direction calculated relative to camera orientation
- Walk (0.75x) / Run (1.5x, hold Shift) / Jump (Space)
- Animations: Survey (idle), Walk, Run — fox.glb model

**Camera** (`features/player/model/person-camera.ts`):
- Third-person follow camera using spherical coordinates
- Pointer lock for mouse look, right-click for orbital rotation
- Smooth interpolation, vertical angle clamped 0.1–0.51 rad

**Controls** (`features/controls/model/`):
- Keyboard: WASD + Shift (run) + Space (jump) via drei's KeyboardControls
- Mouse: Custom hook tracking position, buttons, movement delta

**Physics:**
- Rapier engine, gravity [0, -9.81, 0]
- Character: cuboid collider, linear damping 3
- Ground: fixed rigid body, friction 0.7

## Commands

```sh
npm run dev       # Start dev server (Vite HMR)
npm run build     # TypeScript check + production build
npm run lint      # ESLint
npm run preview   # Preview production build
```

## Code Conventions

- Strict TypeScript (`noUnusedLocals`, `noUnusedParameters`, strict mode)
- ESLint flat config with typescript-eslint and react-hooks plugins
- Logic in `model/`, rendering in `ui/` — keep them separated
- Custom hooks for cross-cutting concerns (mouse, mobile detection)
- Physics interactions via rigid body refs and impulses
