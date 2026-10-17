import React from "react";
import { Navigate, Outlet } from "react-router-dom";

export default function ProtectedRoute() {
  const isAdmin = localStorage.getItem("isAdmin") === "true";

  // যদি এডমিন লগইন করা না থাকে তবে Admin Login পেজে পাঠাবে
  return isAdmin ? <Outlet /> : <Navigate to="/admin-login" replace />;
}