import { useEffect, useState, useCallback } from "react";
import { readJsonFile, writeJsonFile } from "../util/githubWrite";
import useToken from "./useToken";

/**
 * Generic CRUD hook for GitHub-backed JSON files
 *
 * @param {string} filePath - repo-relative file path
 * @param {number} refreshKey - changing this forces refetch
 */
export default function useCrud(filePath, refreshKey = 0) {
  const token = useToken();
  const repo = process.env.REACT_APP_GITHUB_REPO;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  /* ---------------- FETCH ---------------- */

  const fetchData = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    try {
      const json = await readJsonFile(token, repo, filePath);
      setData(json);
    } catch (err) {
      console.error("Failed to fetch:", filePath, err);
    } finally {
      setLoading(false);
    }
  }, [token, repo, filePath]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  /* ---------------- SAVE ---------------- */

  const save = async (updated) => {
    setData(updated); // optimistic UI

    await writeJsonFile(
      token,
      repo,
      filePath,
      updated,
    );
  };

  /* ---------------- CRUD ---------------- */

  const addItem = async (item, section = null) => {
    if (section) {
      await save({
        ...data,
        [section]: [...(data[section] || []), item]
      });
    } else if (Array.isArray(data)) {
      await save([...data, item]);
    } else {
      throw new Error("addItem called on non-collection");
    }
  };

  const updateItem = async (id, updatedItem, section = null) => {
    if (section) {
      await save({
        ...data,
        [section]: data[section].map(i =>
          i.id === id ? updatedItem : i
        )
      });
    } else if (Array.isArray(data)) {
      await save(
        data.map(i => (i.id === id ? updatedItem : i))
      );
    } else {
      // singleton
      await save(updatedItem);
    }
  };

  const deleteItem = async (id, section = null) => {
    if (section) {
      await save({
        ...data,
        [section]: data[section].filter(i => i.id !== id)
      });
    } else if (Array.isArray(data)) {
      await save(data.filter(i => i.id !== id));
    } else {
      throw new Error("deleteItem called on singleton");
    }
  };

  return {
    data,
    loading,
    refetch: fetchData,
    addItem,
    updateItem,
    deleteItem
  };
}
