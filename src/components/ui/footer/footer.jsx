import { useLocation } from "react-router-dom";
import styles from "./footer.module.css";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const version = "1.0.0";
  const websiteUrl = "https://www.hacksussex.com";
  const location = useLocation();
  
  const isDashboard = location.pathname.startsWith("/dashboard");

  return (
    <footer className={`${styles.footer} ${isDashboard ? styles.dashboardFooter : ""}`}>
      <div className={styles.left}>
        © {currentYear} HackSussex — Admin Dashboard | v{version}
      </div>
      <div className={styles.right}>
        {/* <a href="/help">Help</a> */}
        <a href={websiteUrl} target="_blank" rel="noopener noreferrer">
          Visit Website
        </a>
      </div>
    </footer>
  );
};

export default Footer;