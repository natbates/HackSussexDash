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

      <h2>Committee</h2>
      <EntityManager config={committee} refreshKey={refreshKey} />

      <h2>Events</h2>
      <EntityManager config={events} refreshKey={refreshKey} />

      <h2>Sponsors</h2>
      <EntityManager config={sponsors} refreshKey={refreshKey} />

      <h2>Site Data</h2>
      <EntityManager config={siteData} refreshKey={refreshKey} />
    </div>
  );
}
