import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Logout() {
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.removeItem("isAdmin");
    localStorage.removeItem("adminEmail");
    localStorage.removeItem("adminName");

    fetch("http://localhost/tajworld/Backend/backend/form/logout.php")
      .then((res) => res.json())
      .catch((err) => console.error(err))
      .finally(() => {
        navigate("/admin-login");
      });
  }, [navigate]);

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h2>Logging out...</h2>
    </div>
  );
}