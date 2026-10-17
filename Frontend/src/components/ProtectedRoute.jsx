import React from "react";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const isAdmin = localStorage.getItem("isAdmin");
  return isAdmin ? children : <Navigate to="/admin-login" />;
}
