import React from "react";
import LoginForm from "./LoginForm";
import Register from "./Register";
import Logout from "./Logout";

export default function UserLoginPage() {
  return (
    <div>
      <LoginForm />
      <Register />
      <Logout />
    </div>
  );
}
