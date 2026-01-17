import React, { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const isDev = process.env.REACT_APP_DEV_MODE === "true";

  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const fetchUser = async (t) => {
    try {
      setLoading(true);

      // 1. Get user info
      const res = await fetch("https://api.github.com/user", {
        headers: { Authorization: `token ${t}` },
      });

      if (!res.ok) throw new Error(`Invalid or expired token (status ${res.status})`);

      const data = await res.json();

      // 2. IF DEV MODE → skip collab check entirely
      if (!isDev) {
        const collabRes = await fetch(
          `https://api.github.com/repos/${process.env.REACT_APP_GITHUB_REPO}/collaborators/${data.login}`,
          { headers: { Authorization: `token ${t}` } }
        );

        if (collabRes.status !== 204) {
          throw new Error("Not a collaborator");
        }
      } else {
        console.log("⚠️ Dev mode: collaborator check skipped");
      }

      // 3. Save authenticated user
      setUser(data);
      setToken(t);
      localStorage.setItem("gh_token", t);
      setError(null);

      return true;

    } catch (err) {
      console.error("[Auth] fetchUser error:", err);
      setUser(null);
      setToken(null);
      localStorage.removeItem("gh_token");
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    const handleStorage = () => {
      const storedToken = localStorage.getItem("gh_token");

      if (storedToken) {
        console.log("here");
        setLoading(true);
        fetchUser(storedToken);
      } else {
        if (!isDev)
        {
          console.log("no token")
          setUser(null);
          setToken(null);
        }
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const login = async (newToken) => {
    if (!newToken) {
      throw new Error("No token returned from GitHub");
    }

    // Validate token by fetching user
    const valid = await fetchUser(newToken);
    if (!valid) throw new Error("Invalid GitHub token");

    return true;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("gh_token");
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout, loading, setLoading, error }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
