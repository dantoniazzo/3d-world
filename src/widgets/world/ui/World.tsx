import { PerspectiveCamera, OrbitControls } from "@react-three/drei";
import { Vector3 } from "three";
import { Physics } from "@react-three/rapier";
import { Ground } from "entities/ground";
import { Player } from "features/player/ui/Player";

export const World = () => {
  return (
    <>
      <PerspectiveCamera
        makeDefault
        position={new Vector3(0, 1.55, 3.96)}
        rotation={[0, 0, 0]}
        fov={75}
      />
      <OrbitControls makeDefault />
      <ambientLight intensity={1.5} />
      <Physics gravity={[0, -9.81, 0]}>
        <Player />
        <Ground />
      </Physics>
    </>
  );
};
