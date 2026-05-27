import useNotifications from "../hooks/useNotifications";

const NotificationsDropdown = () => {
  const {
    notifications,
    showNotifications,
    toggleNotifications,
    removeNotification,
  } = useNotifications();

  return (
    <div className="nav-item mx-1 dropdown position-relative">
      <button
        className="nav-link dropdown-toggle text-light bg-transparent border-0"
        onClick={toggleNotifications}
      >
        <i className="bx bx-bell"></i>

        <span className="badge bg-danger rounded-pill">
          {notifications.length}
        </span>
      </button>

      {showNotifications && (
        <div
          className="dropdown-menu dropdown-menu-end flex-column show"
          style={{
            position: "absolute",
            minWidth: "300px",
            maxHeight: "400px",
            overflow: "auto",
          }}
        >
          {notifications.length > 0 ? (
            notifications.map((notification, index) => (
              <button
                key={index}
                className="dropdown-item text-end border-0 bg-transparent"
                onClick={() => removeNotification(index)}
              >
                {notification}
              </button>
            ))
          ) : (
            <span className="dropdown-item text-center">
              لا يوجد اشعارات
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationsDropdown;