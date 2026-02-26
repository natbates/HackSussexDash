import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FaGithub } from "react-icons/fa";
import styles from "./login.module.css";
import { useAuth } from "../../hooks/useAuth";
import LoadingScreen from "../../components/misc/loading";

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, logout, token } = useAuth();

  const [checkingStored, setCheckingStored] = useState(true);
  const [errorMsg, setErrorMsg] = useState(location.state?.error || null);

  const validatingStoredToken = useRef(false);

  const clientId = process.env.REACT_APP_GITHUB_CLIENT_ID;
  const redirectUri = `${window.location.origin}/callback`;
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=read:user`;

  useEffect(() => {
    if (location.state?.error) {
      setErrorMsg(location.state.error);
      navigate(location.pathname, { replace: true });
    }
  }, [location, navigate]);

  useEffect(() => {
    if (validatingStoredToken.current) return;
    validatingStoredToken.current = true;

    const storedToken = localStorage.getItem("gh_jwt");
    if (!storedToken) {
      setCheckingStored(false);
      validatingStoredToken.current = false;
      return;
    }

    const validateStored = async () => {
      try {
        const valid = await login(storedToken); 
        if (valid) {
          setErrorMsg(null);
          const redirectPath =
            localStorage.getItem("redirect_after_login") || "/dashboard";
          localStorage.removeItem("redirect_after_login");
          navigate(redirectPath, { replace: true });
          return;
        }
      } catch (e) {
        console.warn("[LoginPage] Stored token invalid:", e.message);
        setErrorMsg(e.message || "Failed to log in");
      }

      localStorage.removeItem("gh_jwt");
      setCheckingStored(false);
      validatingStoredToken.current = false;
    };

    validateStored();
  }, [login, navigate]);

  const handleLogin = () => {
    localStorage.removeItem("gh_jwt");
    logout();
    setErrorMsg(null);
    navigate(location.pathname, { replace: true, state: {} });

    window.location.href = githubAuthUrl;
  };

  if (checkingStored)
    return (
      <div className="call-back">
        <LoadingScreen message="Logging in..." />
      </div>
    );

  return (
    <div className={styles.container}>
      <div className={styles.loginContainer}>
        <h1 className={styles.title}>Welcome to the HackSussex Dashboard</h1>
        <p>
          To sign in, you need to be added as a contributor to the Hack Sussex
          Website Repo. You can find someone to add you in the Discord or ask
          fellow committee members. If you have any problems, please reach out
          on the Hack Sussex Discord for help.
        </p>

        <div className={styles.buttonErrorContainer}>
          <button className={styles.githubBtn} onClick={handleLogin}>
            <FaGithub className={styles.githubLogo} size={24} />
            Sign in with GitHub
          </button>
        </div>

        {errorMsg && <p className="error-msg">{errorMsg}</p>}
      </div>
    </div>
  );
};

export default LoginPage;
