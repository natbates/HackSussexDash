import { createContext, useContext, useState } from "react";
import { jwtDecode } from "jwt-decode";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("gh_jwt"));
  const [user, setUser] = useState(token ? jwtDecode(token) : null);
  const [loading, setLoading] = useState(false);

  const login = async (jwt) => {
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
