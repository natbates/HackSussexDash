import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import LoadingScreen from "./loading";

const ProtectedRoute = ({ children }) => {
  const { token, loading, error } = useAuth();
  const location = useLocation();
  const isDev = process.env.REACT_APP_DEV_MODE === "true";

  console.log("ProtectedRoute render: token =", !!token, "loading =", loading, "error =", error);

  if (loading) {
    return (
      <div className="confirm-auth">
        <LoadingScreen message="confirming auth" />
      </div>
    );
  }

  if (!token || (error && !isDev)) {
    console.log("No token or error, redirecting to /");
    localStorage.setItem("redirect_after_login", location.pathname);

    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
