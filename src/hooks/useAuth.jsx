import { createContext, useContext, useState } from "react";
import { jwtDecode } from "jwt-decode";

const AuthContext = createContext();

const isTokenExpired = (token) => {
  try {
    const decoded = jwtDecode(token);
    const currentTime = Date.now() / 1000;
    return decoded.exp < currentTime;
  } catch {
    return true;
  }
};

export const AuthProvider = ({ children }) => {
  const storedToken = localStorage.getItem("gh_jwt");
  const validToken = storedToken && !isTokenExpired(storedToken) ? storedToken : null;
  console.log("AuthProvider init: storedToken =", !!storedToken, "valid =", !!validToken);
  const [token, setToken] = useState(validToken);
  const [user, setUser] = useState(validToken ? jwtDecode(validToken) : null);
  const [loading, setLoading] = useState(false);

  const login = async (jwt) => {
    if (isTokenExpired(jwt)) {
      console.log("Login: token expired");
      return false;
    }
    console.log("Login: setting token");
    setToken(jwt);
    setUser(jwtDecode(jwt));
    localStorage.setItem("gh_jwt", jwt);
    return true;
  };

  const logout = () => {
    console.log("Logout: clearing session");
    setToken(null);
    setUser(null);
    localStorage.removeItem("gh_jwt");
    window.location.href = "/";
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout, loading, setLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
