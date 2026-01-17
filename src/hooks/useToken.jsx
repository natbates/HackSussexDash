import { useEffect, useState } from "react";

export default function useToken() {
  const isDev = process.env.REACT_APP_DEV_MODE === "true" && false;

  const [token, setToken] = useState(() => {
    return isDev ? "FAKE_TOKEN" : localStorage.getItem("gh_token");
  });

  useEffect(() => {
    if (isDev) return; 

    const handleStorageChange = () => {
      setToken(localStorage.getItem("gh_token"));
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [isDev]);

  return token;
}
