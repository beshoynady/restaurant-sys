import { useState } from "react";

export default function LoginForm() {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    console.log(formData);
  };

  return (
    <div className="login-form-wrapper">

      <div className="login-header">
        <h1>
          Smart <span>Menu</span>
        </h1>

        <p>
          Login to manage your restaurant system
        </p>
      </div>

      <form onSubmit={handleSubmit}>

        <div className="form-group">
          <input
            type="text"
            placeholder="Username"
            value={formData.username}
            onChange={(e) =>
              setFormData({
                ...formData,
                username: e.target.value,
              })
            }
          />
        </div>

        <div className="form-group">
          <input
            type="password"
            placeholder="Password"
            value={formData.password}
            onChange={(e) =>
              setFormData({
                ...formData,
                password: e.target.value,
              })
            }
          />
        </div>

        <button type="submit">
          Login
        </button>

      </form>
    </div>
  );
}