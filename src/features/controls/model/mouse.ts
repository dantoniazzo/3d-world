import { useEffect, useState, useRef } from "react";

export const useMouseControls = () => {
  const [mouseState, setMouseState] = useState({
    isLeftMouseDown: false,
    isRightMouseDown: false,
    lastX: 0,
    lastY: 0,
    movementX: 0,
    movementY: 0,
  });

  // Add a timer ref to track mouse movement
  const moveTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      // e.button: 0 = left, 2 = right
      setMouseState((prev) => ({
        ...prev,
        isLeftMouseDown: e.button === 0 ? true : prev.isLeftMouseDown,
        isRightMouseDown: e.button === 2 ? true : prev.isRightMouseDown,
        lastX: e.clientX,
        lastY: e.clientY,
      }));
    };

    const handleMouseUp = (e: MouseEvent) => {
      setMouseState((prev) => ({
        ...prev,
        isLeftMouseDown: e.button === 0 ? false : prev.isLeftMouseDown,
        isRightMouseDown: e.button === 2 ? false : prev.isRightMouseDown,
        // Reset movement on mouse up
        movementX: 0,
        movementY: 0,
      }));
    };

    // Helper function to reset movement values
    const resetMovement = () => {
      setMouseState((prev) => ({
        ...prev,
        movementX: 0,
        movementY: 0,
      }));
    };

    const handleMouseMove = (e: MouseEvent) => {
      // Clear any existing timeout
      if (moveTimeoutRef.current !== null) {
        window.clearTimeout(moveTimeoutRef.current);
      }

      if (document.pointerLockElement) {
        setMouseState((prev) => ({
          ...prev,
          movementX: e.movementX,
          movementY: e.movementY,
        }));
      } else if (mouseState.isRightMouseDown) {
        // Calculate movement for orbital rotation
        setMouseState((prev) => ({
          ...prev,
          movementX: e.clientX - prev.lastX,
          movementY: e.clientY - prev.lastY,
          lastX: e.clientX,
          lastY: e.clientY,
        }));
      }

      // Set a timeout to reset movement values after mouse stops
      moveTimeoutRef.current = window.setTimeout(resetMovement, 50);
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault(); // Prevent context menu from appearing
    };

    const handlePointerLockChange = () => {
      if (!document.pointerLockElement) {
        setMouseState((prev) => ({
          ...prev,
          isLeftMouseDown: false,
          movementX: 0,
          movementY: 0,
        }));
      }
    };

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("pointerlockchange", handlePointerLockChange);

    return () => {
      // Clear timeout on cleanup
      if (moveTimeoutRef.current !== null) {
        window.clearTimeout(moveTimeoutRef.current);
      }
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener(
        "pointerlockchange",
        handlePointerLockChange,
      );
    };
  }, [mouseState.isRightMouseDown]);

  return mouseState;
};
