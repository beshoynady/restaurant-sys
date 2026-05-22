import "../styles/login.css";

import LoginForm from "../components/LoginForm";
import LoginSlider from "../components/LoginSlider";

export default function LoginPage() {
  return (
    <section className="login-page">
      <div className="login-container">

        {/* Left Side */}
        <div className="login-form-section">
          <LoginForm />
        </div>

        {/* Right Side */}
        <div className="login-slider-section">
          <LoginSlider />
        </div>

      </div>
    </section>
  );
}