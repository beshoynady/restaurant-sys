import { useContext, useState } from "react";
// import { AppContext } from "../../../context/appContext";
import { employeeLogout } from "../services/auth.service";

const UserDropdown = () => {
//   const { employeeLoginInfo } = useContext(AppContext);

  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <div className="nav-item mx-1 dropdown position-relative">
      <button
        className="nav-link d-flex align-items-center text-light bg-transparent border-0"
        onClick={() => setShowDropdown((prev) => !prev)}
      >
        <div
          className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center"
          style={{
            width: "36px",
            height: "36px",
            fontSize: "18px",
          }}
        >
          {/* {employeeLoginInfo?.username?.charAt(0)} */}
        </div>
      </button>

      {showDropdown && (
        <div
          className="dropdown-menu dropdown-menu-end text-end flex-column show"
          style={{
            position: "absolute",
            minWidth: "220px",
          }}
        >
          <span className="dropdown-item fw-bold">
            {/* {employeeLoginInfo?.username} */}
          </span>

          <span className="dropdown-item text-muted">
            {/* {employeeLoginInfo?.role} */}
          </span>

          <div className="dropdown-divider"></div>

          <button
            className="dropdown-item text-danger"
            onClick={employeeLogout}
          >
            تسجيل الخروج
          </button>
        </div>
      )}
    </div>
  );
};

export default UserDropdown;