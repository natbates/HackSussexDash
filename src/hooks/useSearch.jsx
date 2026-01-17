import { useState, useEffect } from "react";
import useFetchData from "./useFetchData";

/**
 * useSearch - Custom hook to fetch multiple datasets and provide search functionality
 * @returns {Object} { searchResults, setSearchTerm, loading, error }
 */
const useSearch = () => {

  const { data: eventsData, loading: eventsLoading, errorMsg: eventsError } = useFetchData("events.json");
  const { data: membersData, loading: membersLoading, errorMsg: membersError } = useFetchData("committee.json");
  const { data: sponsorsData, loading: sponsorsLoading, errorMsg: sponsorsError } = useFetchData("sponsors.json");

  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const compileData = () => {
    const results = [];
    try{
    if (eventsData) {
      Object.values(eventsData).forEach((section) => {
        section.forEach((e) => {
          results.push({
            id: e.id,
            type: "event",
            title: e.title,
            description: e.description,
            date: e.date,
          });
        });
      });
    }

    if (membersData) {
      membersData?.forEach((m) => {
        results.push({
          id: m.id,
          type: "member",
          name: m.name,
          role: m.role,
        });
      });
    }

    if (sponsorsData) {
      sponsorsData.forEach((s) => {
        results.push({
          id: s.id,
          type: "sponsor",
          name: s.name,
        });
      });
    }

    return results;
    } catch (error) {
      throw new Error(`Operation failed: ${error.message}`);
    }
  };

  useEffect(() => {
    if (!eventsLoading && !membersLoading && !sponsorsLoading) {
      setLoading(false);

      if (eventsError || membersError || sponsorsError) {
        setError(eventsError || membersError || sponsorsError);
        return;
      }

      const allData = compileData();
      if (!searchTerm) {
        setSearchResults([]);
        return;
      }

      const term = searchTerm.toLowerCase();

      const filtered = allData.filter((item) => {
        if (item.type === "event") {
          return item.title.toLowerCase().includes(term)
        }
        if (item.type === "member") {
          return item.name.toLowerCase().includes(term) || item.role.toLowerCase().includes(term);
        }
        if (item.type === "sponsor") {
          return item.name.toLowerCase().includes(term);
        }
        return false;
      });

      setSearchResults(filtered);
    }
  }, [searchTerm, eventsLoading, membersLoading, sponsorsLoading, eventsData, membersData, sponsorsData]);

  return {
    searchResults,
    setSearchTerm,
    searchTerm,
    loading,
    error,
  };
};

export default useSearch;
