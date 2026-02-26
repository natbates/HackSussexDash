import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import LoadingScreen from "../../components/misc/loading";
import { useAuth } from "../../hooks/useAuth";

const Callback = () => {
  const navigate = useNavigate();
  const { login, setLoading } = useAuth();
  const isLoggingIn = useRef(false);

  useEffect(() => {
    if (isLoggingIn.current) return;
    isLoggingIn.current = true;

    const code = new URLSearchParams(window.location.search).get("code");
    if (!code) {
      navigate("/", { replace: true, state: { error: "Missing code" } });
      return;
    }

    const fetchTokenAndLogin = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/.netlify/functions/github-oauth?code=${code}`);
        const data = await res.json();

        if (!res.ok || !data?.authorized) {
          navigate("/", { replace: true, state: { error: data?.message || "Not authorized" } });
          return;
        }

        localStorage.setItem("gh_jwt", data.token);
        await login(data.token); 

        navigate("/dashboard", { replace: true });
      } catch (err) {
        console.error("Login failed:", err);
        navigate("/", { replace: true, state: { error: "Failed to login" } });
      } finally {
        setLoading(false);
      }
    };

    fetchTokenAndLogin();
  }, [login, navigate, setLoading]);

  return (
    <div className="call-back">
      <LoadingScreen message="Logging in..." />
    </div>
  );
};

export default Callback;
