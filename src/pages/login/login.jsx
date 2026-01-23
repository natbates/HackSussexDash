import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=repo`;

  useEffect(() => {
    if (location.state?.error) {
      setErrorMsg(location.state.error);
      navigate(location.pathname, { replace: true });
    }
  }, [location, navigate]);

  useEffect(() => {
    if (validatingStoredToken.current) return;
    validatingStoredToken.current = true;

    const storedToken = localStorage.getItem("gh_token");
    if (!storedToken) {
      setCheckingStored(false);
      validatingStoredToken.current = false;
      return;
    }

    const validateStored = async () => {
      try {
        const valid = await login(storedToken);
        if (valid) {
          setErrorMsg(null); // ✅ Clear any existing error on success
          const redirectPath = localStorage.getItem("redirect_after_login") || "/dashboard";
          localStorage.removeItem("redirect_after_login");
          console.log("redirecting from here");
          navigate(redirectPath, { replace: true });
          return;
        }
      } catch (e) {
        console.warn("[LoginPage] Stored token invalid:", e.message);
        setErrorMsg(e.message || "Failed to login");
      }

      localStorage.removeItem("gh_token");
      setCheckingStored(false);
      validatingStoredToken.current = false;
    };

    validateStored();
  }, [login, navigate]);

  // useEffect(() => {
  //   if (token){
  //     console.log("going from here");
  //     const redirectPath = localStorage.getItem("redirect_after_login") || "/dashboard";
  //     localStorage.removeItem("redirect_after_login");
  //     navigate(redirectPath, { replace: true });
  //   }
  // }, [token, navigate]);

  const handleLogin = () => {
    localStorage.removeItem("gh_token");
    logout();
    setErrorMsg(null);
    // Clear location state to prevent error from persisting
    navigate(location.pathname, { replace: true, state: {} });

    window.location.href = githubAuthUrl;
  };

  if (checkingStored) return (
    <div className="call-back">
      <LoadingScreen message="Logging in..." />
    </div>);

  return (
    <div className={styles.container}>
      <div className={styles.loginContainer}>
        <h1 className={styles.title}>Welcome to the HackSussex Dashboard</h1>
        <p>
          To sign in, you need to be added as a contributor to the Hack Sussex Website Repo.
          You can find someone to add you in the discord or ask fellow committee. If you have any problems, please reach out on the hack sussex discord for help.
        </p>

        <div className={styles.buttonErrorContainer}>
          <button className={styles.githubBtn} onClick={handleLogin}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={styles.githubLogo}>
              <path
                d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.11.82-.26.82-.577 0-.285-.01-1.04-.015-2.04-3.338.726-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.753-1.335-1.753-1.09-.745.082-.73.082-.73 1.205.085 1.84 1.24 1.84 1.24 1.07 1.835 2.805 1.305 3.49.998.11-.775.42-1.305.762-1.605-2.665-.305-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.305-.54-1.53.105-3.185 0 0 1.005-.32 3.3 1.23.96-.267 1.98-.4 3-.405 1.02.005 2.04.138 3 .405 2.28-1.55 3.285-1.23 3.285-1.23.645 1.655.24 2.88.12 3.185.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.435.375.825 1.11.825 2.235 0 1.615-.015 2.915-.015 3.31 0 .315.21.69.825.575C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12z"
                fill="currentColor"
              />
            </svg>
            Sign in with GitHub
          </button>
        </div>

        {errorMsg && <p className="error-msg">{errorMsg}</p>}
      </div>
    </div>
  );
};

export default LoginPage;
