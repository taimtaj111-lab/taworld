import React from "react";
import "./Logout.css";

export default function Logout() {
  const handleLogout = () => {
    alert("You are logged out!");
  };

  return (
    <div className="logout-btn-container">
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}
