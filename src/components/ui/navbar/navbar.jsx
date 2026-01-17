import React, { useEffect, useState, useContext } from "react";
import styles from "./navbar.module.css";
import useToken from "../../../hooks/useToken.jsx";
import { Loader } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth.jsx";


const Navbar = () => {
  const { token, user, logout, login, loading } = useAuth();
  const navigate = useNavigate();
  const clientId = process.env.REACT_APP_GITHUB_CLIENT_ID;
  const redirectUri = `${window.location.origin}/callback`;
  const repoFull = process.env.REACT_APP_GITHUB_REPO || ""; 
  const [owner, repo] = repoFull.split("/");
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=repo`;

  const handleLogin = () => {
    localStorage.removeItem("gh_token");
    logout();

    window.location.href = githubAuthUrl;
  };


  return (
    <nav className={styles.navbar}>
      {/* LEFT SIDE */}
      <div className={styles.left}>
        <img
          src="/images/gradient.png"
          alt="HS Logo"
          className={styles.logo}
          onClick={() => {navigate("/")}}
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
          <span>{user.login}</span>
          <img src={user.avatar_url} alt="avatar" className={styles.avatar} />
        </div>)}

        {loading ? (
          <button className={"primaryBtn"}>Logging in...</button>
        ) : user ? (
          <button className={"primaryBtn"} onClick={logout} style={{height: "100%"}}>Logout</button>
        ) : (
        <button className={styles.logInButton} onClick={handleLogin}>Log In</button>)}
      </div>
      
    </nav>
  );
};

export default Navbar;
