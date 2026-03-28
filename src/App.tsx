import { KeyboardControls } from "@react-three/drei";
import { keys } from "./features/controls";
import { Canvas } from "./shared";
import { World } from "./widgets/world";

const keyboardControls = Object.values(keys).map((value) => value);

function App() {
  return (
    <div className="w-screen h-screen bg-black">
      <KeyboardControls map={keyboardControls}>
        <Canvas>
          <World />
        </Canvas>
      </KeyboardControls>
    </div>
  );
}

export default App;
