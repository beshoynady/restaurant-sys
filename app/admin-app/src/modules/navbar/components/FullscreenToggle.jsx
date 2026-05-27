import useFullscreen from "../hooks/useFullscreen";

const FullscreenToggle = () => {
  const { fullscreen, toggleFullscreen } = useFullscreen();

  return (
    <div
      className="nav-item d-flex align-items-center justify-content-center mx-1"
      style={{ cursor: "pointer" }}
      onClick={toggleFullscreen}
    >
      {!fullscreen ? (
        <i className="fa-solid fa-maximize fa-xl text-light"></i>
      ) : (
        <i className="fa-solid fa-minimize fa-xl text-light"></i>
      )}
    </div>
  );
};

export default FullscreenToggle;