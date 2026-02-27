import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import { useApi } from "./useAPI";

export default function useCrud(filePath, refreshKey = 0) {
  const { token: jwtToken } = useAuth(); 
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { fetchWithAuth } = useApi();

  const fetchData = useCallback(async () => {
    console.log("useCrud: fetching", filePath);
    if (!filePath || !jwtToken) {
      setData(null);
      console.log("useCrud: no filePath or no JWT token, skipping");
      return;
    }

    setLoading(true);

    try {
      const res = await fetchWithAuth("/.netlify/functions/read-json", {
        method: "POST",
        body: JSON.stringify({ path: filePath }),
      });

      const result = await res.json();
      console.log("useCrud: fetched result", result);

      if (!res.ok) {
        if (res.status === 401) {
          logout();
        }
        throw new Error(result.error || "Failed to fetch file");
      }
      // some of our lambdas wrap the JSON under `data.data`, others just
      // return the value directly (e.g. singletons). normalize here so
      // siteData.json doesn’t disappear.
      const payload = result.data?.data ?? result.data;
      console.log("useCrud: setting data", payload);
      setData(payload);
    } catch (err) {
      console.error("useCrud: Failed to fetch", filePath, err);
    } finally {
      setLoading(false);
    }
  }, [filePath, jwtToken]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  const save = async (updated) => {
    setData(updated); 

    if (!jwtToken) {
      console.error("No JWT token for saving file!");
      return { error: "No JWT token provided" };
    }

    try {
      const res = await fetch("/.netlify/functions/write-json", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwtToken}`,
        },
        body: JSON.stringify({ path: filePath, data: updated }),
      });

      const result = await res.json();

      if (!res.ok) throw new Error(result.error || "Failed to save file");
      return result;
    } catch (err) {
      console.error("Failed to save file:", filePath, err);
      return { error: err.message };
    }
  };

  const addItem = async (item, section = null) => {
    if (!data) return;

    if (section) {
      await save({ ...data, [section]: [...(data[section] || []), item] });
    } else if (Array.isArray(data)) {
      await save([...data, item]);
    } else {
      throw new Error("addItem called on non-collection");
    }
  };

  const updateItem = async (id, updatedItem, section = null) => {
    if (!data) return;

    if (section) {
      await save({
        ...data,
        [section]: data[section].map((i) => (i.id === id ? updatedItem : i)),
      });
    } else if (Array.isArray(data)) {
      await save(data.map((i) => (i.id === id ? updatedItem : i)));
    } else {
      await save(updatedItem);
    }
  };

  const deleteItem = async (id, section = null) => {
    if (!data) return;

    if (section) {
      await save({
        ...data,
        [section]: data[section].filter((i) => i.id !== id),
      });
    } else if (Array.isArray(data)) {
      await save(data.filter((i) => i.id !== id));
    } else {
      throw new Error("deleteItem called on singleton");
    }
  };

  return {
    data,
    loading,
    refetch: fetchData,
    save,
    addItem,
    updateItem,
    deleteItem,
  };
}
