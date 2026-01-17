import { useNavigate } from "react-router-dom";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="not-found">
      <span>
        <h1>404</h1>
        <p>Page Not Found...</p>
        </span>
      <div className="button-container">
        <button 
          onClick={() => navigate(-1)} 
          className="secondaryBtn"
        >
          Go Back
        </button>

        <button 
          onClick={() => navigate("/")} 
          className="primaryBtn"
        >
          Go Home
        </button>
      </div>
    </div>
  );
};

export default NotFound;
