import React from "react";
import styles from "./navbar.module.css";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth.jsx";

const Navbar = () => {
  const { token, user, logout, loading } = useAuth();
  const navigate = useNavigate();

  const clientId = process.env.REACT_APP_GITHUB_CLIENT_ID;
  const redirectUri = `${window.location.origin}/callback`;
  const repoFull = process.env.REACT_APP_GITHUB_REPO || "";
  const [owner, repo] = repoFull.split("/");

  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=read:user`;

  const handleLogin = () => {
    localStorage.removeItem("gh_jwt");
    logout();
    window.location.href = githubAuthUrl;
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.left}>
        <img
          src="/images/gradient.png"
          alt="HS Logo"
          className={styles.logo}
          onClick={() => navigate("/")}
        />

        <div className={styles.repoInfo}>
          <a
            href={`https://github.com/${owner}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {owner}
          </a>
          <span>/</span>
          <a
            href={`https://github.com/${owner}/${repo}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {repo}
          </a>
        </div>
      </div>

      <div className={styles.right}>
        {user && (
          <div className={styles.user}>
            <span>{user.username}</span>
            {user.avatar_url && (
              <img src={user.avatar_url} alt="avatar" className={styles.avatar} />
            )}
          </div>
        )}

        {loading ? (
          <button className={styles.logInButton}>Logging in...</button>
        ) : user ? (
          <button className={styles.logInButton} onClick={logout}>
            Logout
          </button>
        ) : (
          <button className={styles.logInButton} onClick={handleLogin}>
            Log In
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
