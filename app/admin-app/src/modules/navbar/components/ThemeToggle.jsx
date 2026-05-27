import useTheme from "../hooks/useTheme";

const ThemeToggle = () => {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <div
      className="nav-item d-flex align-items-center justify-content-center mx-1"
      style={{ cursor: "pointer" }}
      onClick={toggleTheme}
    >
      <button className="btn btn-sm btn-outline-light">
        {isDarkMode ? "☀️" : "🌙"}
      </button>
    </div>
  );
};

export default ThemeToggle;