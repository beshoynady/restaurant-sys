// src/shared/ui/FullscreenButton.jsx
import useFullscreen from "../hooks/useFullscreen";
import { Maximize, Minimize } from "lucide-react";

export default function FullscreenButton() {
  const { isFullscreen, toggleFullscreen } = useFullscreen();

  return (
    <button
      onClick={toggleFullscreen}
      className="h-10 w-10 flex items-center justify-center rounded-xl border bg-card hover:bg-accent"
    >
      {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
    </button>
  );
}
