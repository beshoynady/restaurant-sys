import UserDropdown from "./UserDropdown";
import MessagesDropdown from "./MessagesDropdown";
import NotificationsDropdown from "./NotificationsDropdown";
import FullscreenToggle from "./FullscreenToggle";
import ThemeToggle from "./ThemeToggle";
import LanguageToggle from "./LanguageToggle";

const NavBar = () => {
  return (
    <nav
      className="navbar w-100 navbar-expand-lg flex-row p-0 m-0 pr-2 sticky-top"
      style={{
        height: "50px",
        backgroundColor: "#343a40",
        zIndex: 999,
      }}
    >
      <div className="navbar-nav flex-row align-items-center w-100 px-1 mx-1 ms-auto h-100">
        <UserDropdown />

        <MessagesDropdown />

        <NotificationsDropdown />

        <FullscreenToggle />

        <ThemeToggle />

        <LanguageToggle />
      </div>
    </nav>
  );
};

export default NavBar;