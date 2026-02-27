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
  const [token, setToken] = useState(storedToken && !isTokenExpired(storedToken) ? storedToken : null);
  const [user, setUser] = useState(token ? jwtDecode(token) : null);
  const [loading, setLoading] = useState(false);

  const login = async (jwt) => {
    if (isTokenExpired(jwt)) {
      return false;
    }
    setToken(jwt);
    setUser(jwtDecode(jwt));
    localStorage.setItem("gh_jwt", jwt);
    return true;
  };

  const logout = () => {
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
