import { useState } from "react";

import EntityManager from "../../components/entity-manager/entityManager.jsx";
import committee from "../../config/committee.config";
import events from "../../config/events.config";
import sponsors from "../../config/sponsors.config";
import siteData from "../../config/siteData.config";

import styles from "./dashboard.module.css"

export default function Dashboard() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className={styles.dashboard}>
      
      <div className={styles.headerContainer}>
        <h1>HackSussex Dashboard</h1>

        <button
          onClick={() => setRefreshKey(k => k + 1)}>
          Refresh all data
        </button>
      </div>

      <EntityManager config={committee} refreshKey={refreshKey} />

      <EntityManager config={events} refreshKey={refreshKey} />

      <EntityManager config={sponsors} refreshKey={refreshKey} />

      <EntityManager config={siteData} refreshKey={refreshKey} />
    </div>
  );
}
