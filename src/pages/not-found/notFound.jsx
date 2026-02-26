import { useNavigate } from "react-router-dom";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="not-found">
        <h1>404</h1>
    </div>
  );
};

export default NotFound;
