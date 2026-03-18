import React, { useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "axios";
import { AppContext } from "../../../../context/appContext";
// import SetupWizard from "../setup/SetupWizard"; // ✅ Import setup wizard screen

// Images
import restaurant from "../../../../image/SmartRestaurant.jpg";
import menu from "../../../../image/emenu.jpg";
import pos from "../../../../image/pos.jpg";

// ✅ Functional component using hooks
const Login = () => {
  const navigate = useNavigate();
  const {
    getEmployeeInfoFromToken,
    setIsLoading,
    apiUrl,
  } = useContext(AppContext);

  // ===============================
  // 🔹 Component States
  // ===============================
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [hasEmployees, setHasEmployees] = useState(null); // null = not loaded yet

  // ===============================
  // 🔹 Check if employees exist
  // ===============================
  const checkIfEmployeesExist = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${apiUrl}/api/employee/count`);
      const count = response?.data?.count || 0;
      setHasEmployees(count > 0);
      if(count === 0){
        navigate("/setup");
        toast.info("No employees found. Please set up your admin account.");
      }
    } catch (error) {
      console.error("Error checking employees:", error);
      toast.error("Network error while checking employees.");
      setHasEmployees(false);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Run check once on mount
  useEffect(() => {
    checkIfEmployeesExist();
  }, []);

  // ===============================
  // 🔹 Handle Admin Login
  // ===============================
  const handleAdminLogin = async (e) => {
    e.preventDefault();

    if (!username.trim() || !password.trim()) {
      toast.error("Please enter both username and password.");
      return;
    }

    try {
      const response = await axios.post(
        `${apiUrl}/api/employee/login`,
        { username, password },
        { withCredentials: true }
      );
      console.log("Login Response:", response);

      const { data } = response;
      if (!data) return toast.error("Login failed. Try again.");

      const employee = await data.employee;
      if (!employee?.employmentInfo.isActive || !employee?.credentials.isAdmin) {
        return toast.error("You are not authorized to access admin panel.");
      }

      // ✅ Save token locally and fetch employee info
      localStorage.setItem("token_e", data.accessToken);
      await new Promise((resolve) => setTimeout(resolve, 150));
      await getEmployeeInfoFromToken();

      toast.success("Login successful!");
      navigate("/admin");
    } catch (error) {
      console.error("Login Error:", error);
      toast.error(
        error.response?.data?.message || "An error occurred during login."
      );
    }
  };

  // ===============================
  // 🔹 UI Render Logic
  // ===============================

  // Still loading employees → show nothing yet
  if (hasEmployees === null) {
    return (
      <div className="d-flex align-items-center justify-content-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="sr-only">Loading...</span>
        </div>
      </div>
    );
  }

  // No employees yet → show setup wizard
  // if (hasEmployees === false) {
  //   return <SetupWizard />;
  // }

  // Employees exist → show login screen
  return (
    <section className="login-body">
      <div className="container h-100">
        <div className="row login-box align-items-center justify-content-center">
          {/* ==========================
              🔹 Login Form Section
          =========================== */}
          <div className="col-12 col-md-6 d-flex flex-column align-items-center justify-content-center p-4">
            <div className="text-center mb-4">
              <h1 className="display-5 fw-bold text-primary mb-2">
                Smart <span className="text-dark">Menu</span>
              </h1>
              <p className="text-muted">
                Enter your phone number and password to access Smart Menu
                dashboard and manage your restaurant.
              </p>
            </div>

            <form className="w-100" onSubmit={handleAdminLogin}>
              <div className="form-group mb-3">
                <input
                  type="text"
                  className="form-control form-control-lg"
                  placeholder="Username"
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div className="form-group mb-4">
                <input
                  type="password"
                  className="form-control form-control-lg"
                  placeholder="Password"
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary btn-lg w-100 py-2"
              >
                Login
              </button>
            </form>
          </div>

          {/* ==========================
              🔹 Image Carousel Section
          =========================== */}
          <div className="col-12 col-md-6 d-none d-md-flex align-items-center justify-content-center h-100">
            <div
              id="loginCarousel"
              className="carousel slide w-100"
              data-ride="carousel"
            >
              {/* Indicators */}
              <ul className="carousel-indicators">
                <li
                  data-target="#loginCarousel"
                  data-slide-to="0"
                  className="active"
                ></li>
                <li data-target="#loginCarousel" data-slide-to="1"></li>
                <li data-target="#loginCarousel" data-slide-to="2"></li>
              </ul>

              {/* Slides */}
              <div className="carousel-inner">
                <div className="carousel-item active">
                  <img
                    src={restaurant}
                    className="d-block w-100 rounded shadow-sm"
                    alt="Smart Restaurant"
                  />
                  <div className="carousel-caption d-none d-md-block">
                    <h5 className="fw-bold">Smart Restaurant Management</h5>
                    <p>Control and monitor your restaurant efficiently.</p>
                  </div>
                </div>
                <div className="carousel-item">
                  <img
                    src={menu}
                    className="d-block w-100 rounded shadow-sm"
                    alt="Digital Menu"
                  />
                  <div className="carousel-caption d-none d-md-block">
                    <h5 className="fw-bold">Manage your digital menu</h5>
                    <p>Update your menu items instantly from anywhere.</p>
                  </div>
                </div>
                <div className="carousel-item">
                  <img
                    src={pos}
                    className="d-block w-100 rounded shadow-sm"
                    alt="POS System"
                  />
                  <div className="carousel-caption d-none d-md-block">
                    <h5 className="fw-bold">POS & Cloud System</h5>
                    <p>Enjoy real-time synchronization and analytics.</p>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <a
                className="carousel-control-prev"
                href="#loginCarousel"
                role="button"
                data-slide="prev"
              >
                <span className="carousel-control-prev-icon"></span>
              </a>
              <a
                className="carousel-control-next"
                href="#loginCarousel"
                role="button"
                data-slide="next"
              >
                <span className="carousel-control-next-icon"></span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export   default Login;
