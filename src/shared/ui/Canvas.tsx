import { Canvas as R3FCanvas } from "@react-three/fiber";
import { Suspense } from "react";
import { Settings } from "features/settings";
import { Spinner } from "./Spinner";

export const Canvas = ({
  children,
  ...rest
}: Parameters<typeof R3FCanvas>[0]) => (
  <Suspense fallback={<Spinner />}>
    <R3FCanvas onLoad={() => console.log("Canvas loaded")} id="gl" {...rest}>
      {children}
    </R3FCanvas>

    <Settings />
  </Suspense>
);
