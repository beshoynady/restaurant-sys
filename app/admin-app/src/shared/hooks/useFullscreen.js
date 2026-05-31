// src/shared/hooks/useFullscreen.js
import { useState } from "react";

export default function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return {
    isFullscreen,
    toggleFullscreen,
  };
}