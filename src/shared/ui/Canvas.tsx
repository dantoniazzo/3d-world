import { Canvas as R3FCanvas } from "@react-three/fiber";
import { Suspense, useCallback, useEffect, useState } from "react";
import { Settings } from "features/settings";

const SceneReady = ({ onReady }: { onReady: () => void }) => {
  useEffect(onReady, [onReady]);
  return null;
};

const LoadingScreen = ({ ready }: { ready: boolean }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (ready) {
      const timer = setTimeout(() => setVisible(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [ready]);

  if (!visible) return null;

  return (
    <div
      className={`absolute inset-0 z-10 flex flex-col items-center justify-center bg-black transition-opacity duration-1000 ${
        ready ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <span className="loader" />
    </div>
  );
};

export const Canvas = ({
  children,
  ...rest
}: Parameters<typeof R3FCanvas>[0]) => {
  const [ready, setReady] = useState(false);
  const handleReady = useCallback(() => setReady(true), []);

  return (
    <div className="relative w-full h-full">
      <R3FCanvas id="gl" {...rest}>
        <Suspense fallback={null}>
          {children}
          <SceneReady onReady={handleReady} />
        </Suspense>
      </R3FCanvas>
      <LoadingScreen ready={ready} />
      <Settings />
    </div>
  );
};
