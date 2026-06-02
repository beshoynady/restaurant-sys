// src/shared/ui/buttons/FullscreenButton.jsx
import useFullscreen from "../../../shared/hooks/useFullscreen";
import { Maximize, Minimize } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * Fullscreen toggle button
 * Fully integrated with:
 * - Theme system (surface / border / foreground)
 * - i18n system
 * - UI system consistency
 */

export default function FullscreenButton() {
  const { isFullscreen, toggleFullscreen } =
    useFullscreen();

  const { t } = useTranslation("common");

  return (
    <button
      onClick={toggleFullscreen}
      title={
        isFullscreen
          ? t("exitFullscreen")
          : t("enterFullscreen")
      }
      className="
        h-10 w-10
        flex items-center justify-center
        rounded-xl
        border border-border
        bg-surface
        text-foreground
        hover:bg-surface-secondary
        transition
      "
    >
      {isFullscreen ? (
        <Minimize size={18} />
      ) : (
        <Maximize size={18} />
      )}
    </button>
  );
}