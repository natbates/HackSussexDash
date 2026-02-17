import { useAuth } from "../hooks/useAuth.jsx";

export const useApi = () => {
  const { logout } = useAuth();

  const fetchWithAuth = async (url, options = {}) => {
    const jwtToken = localStorage.getItem("gh_jwt");
    const headers = {
      ...options.headers,
      Authorization: `Bearer ${jwtToken}`,
    };

    const res = await fetch(url, { ...options, headers });

    if (res.status === 401) {
      try {
        const data = await res.json();
        if (data.error === "JWT_EXPIRED") {
          logout();
          window.location.href = "/"; 
          return; 
        }
      } catch (err) {
        console.error("Failed to parse 401 response:", err);
      }
    }

    return res;
  };

  return { fetchWithAuth };
};
