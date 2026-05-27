import { useEffect, useState } from "react";

const useNotifications = () => {
  const [showNotifications, setShowNotifications] =
    useState(false);

  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const savedNotifications =
      JSON.parse(localStorage.getItem("notifications")) || [];

    setNotifications(savedNotifications);
  }, []);

  const toggleNotifications = () => {
    setShowNotifications((prev) => !prev);
  };

  const removeNotification = (index) => {
    const updated = notifications.filter(
      (_, i) => i !== index
    );

    setNotifications(updated);

    localStorage.setItem(
      "notifications",
      JSON.stringify(updated)
    );
  };

  return {
    notifications,
    showNotifications,
    toggleNotifications,
    removeNotification,
  };
};

export default useNotifications;