// src/components/LoadingScreen.jsx
import React from "react";
import { TailSpin } from "react-loader-spinner";
import "../../styles/loading.css";

const Loader = ({textMargin = ""}) => {
  return (
    <div className="loading-container">
      <TailSpin
        height={20}
        width={20}
        color="var(--text-colour)"
        ariaLabel="loading"
      />
    </div>
  );
};

export default Loader;
