import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Register.css";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("http://localhost/tajworld/Backend/backend/form/register.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      
      const data = await res.json();
      if (data.success) {
        alert("Registration successful! Please login.");
        navigate("/admin-login");
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
      <h2>Admin Register</h2>
      {msg && <p className="error">{msg}</p>}
      <form onSubmit={handleRegister}>
        <input type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button type="submit">Register</button>
      </form>
      <button className="switch-btn" onClick={() => navigate("/admin-login")}>
        Go to Login
      </button>
    </div>
  );
}