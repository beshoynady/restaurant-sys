import { useState } from "react";

const useFullscreen = () => {
  const [fullscreen, setFullscreen] = useState(false);

  const toggleFullscreen = () => {
    const doc = window.document;

    if (!doc.fullscreenElement) {
      doc.documentElement.requestFullscreen();

      setFullscreen(true);
    } else {
      doc.exitFullscreen();

      setFullscreen(false);
    }
  };

  return {
    fullscreen,
    toggleFullscreen,
  };
};

export default useFullscreen;