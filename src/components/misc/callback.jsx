import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import LoadingScreen from "./loading";
import { useAuth } from "../../hooks/useAuth";

const Callback = () => {
  const navigate = useNavigate();
  const { login, setLoading} = useAuth();
  const isLoggingIn = useRef(false); // ✅ track if login is already in progress

  useEffect(() => {
    if (isLoggingIn.current) return; // block multiple runs
    isLoggingIn.current = true;

    const code = new URLSearchParams(window.location.search).get("code");
    if (!code) {
      navigate("/");
      return;
    }

    const fetchTokenAndLogin = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/.netlify/functions/github-oauth?code=${code}`);

        // Read body once
        const bodyText = await res.text();
        let data;
        try {
          data = JSON.parse(bodyText);
        } catch {
          data = null;
        }

        if (!res.ok || !data?.access_token) {
          console.error("Failed to fetch token:", res.status, bodyText);

          // Pass error message to home page
          navigate("/", { replace: true, state: { error: "Failed to login: " + bodyText } });
          return;
        }

        const token = data.access_token;

        try {
          await login(token);
        } catch (e) {
          console.error("Login failed:", e);

          const msg = e?.message;

          navigate("/", { replace: true, state: { error: msg } });
          return;
        }

        navigate("/dashboard", { replace: true });

      } catch (err) {
        console.error("Login failed:", err);
        navigate("/", { replace: true, state: { error: "Failed to login" } });
      } finally {
        setLoading(false);
      }
    };


    fetchTokenAndLogin();
  }, [login, navigate]);

  return (
    <div className="call-back">
      <LoadingScreen message="Logging in..." />
    </div>
  );
};

export default Callback;
