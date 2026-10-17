import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LoginForm.css";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch("http://localhost/tajworld/Backend/backend/form/login.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (data.success) {
        localStorage.setItem("isAdmin", "true");
        localStorage.setItem("adminEmail", data.email);
        localStorage.setItem("adminName", data.name);
        navigate("/admin-dashboard");
      } else {
        setMsg(data.message);
      }
    } catch (err) {
      console.error(err);
      setMsg("Server or Connection Error!");
    }
  };

  return (
    <div className="auth-card">
      <h2>Admin Login</h2>
      {msg && <p className="error">{msg}</p>}

      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit">Login</button>
      </form>

      <button className="switch-btn" onClick={() => navigate("/admin-register")}>
        Go to Register
      </button>
    </div>
  );
}