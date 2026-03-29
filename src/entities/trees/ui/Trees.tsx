import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { GROUND_WIDTH, getGroundHeight } from "entities/ground";
import { TreeGeometry, TreeMaterial } from "../model/tree";

const TREE_COUNT = 150;

export const Trees = () => {
  const materialRef = useRef<TreeMaterial | null>(null);

  const treeGeometry = useMemo(
    () =>
      new TreeGeometry({
        count: TREE_COUNT,
        spread: GROUND_WIDTH,
        getGroundHeight,
      }),
    [],
  );

  const treeMaterial = useMemo(() => {
    const mat = new TreeMaterial();
    materialRef.current = mat;
    return mat;
  }, []);

  useFrame(({ clock: { elapsedTime } }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = elapsedTime;
    }
  });

  return (
    <mesh>
      <primitive object={treeGeometry} />
      <primitive object={treeMaterial} />
    </mesh>
  );
};
