import React from "react";
import "./LoginForm.css";

export default function LoginForm() {
  return (
    <div className="login-form">
      <h2>User Login</h2>
      <form>
        <input type="email" placeholder="Email" required />
        <input type="password" placeholder="Password" required />
        <button type="submit">Login</button>
      </form>
    </div>
  );
}
