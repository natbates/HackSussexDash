// hooks/useRepoStats.jsx
import { useState, useEffect } from "react";
import useToken from "./useToken";
import { mockGraphQLResponse } from "../mocks/mockGraphQL";

export function useRepoStats() {
  const token = useToken();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const githubrepo = process.env.REACT_APP_GITHUB_REPO; 
  const [owner, repo] = githubrepo?.split("/") || [];

  useEffect(() => {
    if (!owner || !repo) {
      console.warn("useRepoStats: owner or repo not defined");
      return;
    }

    const fetchStats = async () => {
      setLoading(true);
      setError(null);

      try {
        let json;
        const isMock = token === "FAKE_TOKEN";

        if (isMock) {
          json = mockGraphQLResponse;
        } else {
          const query = `
            query RepoStats($owner: String!, $repo: String!) {
              viewer { login, name, avatarUrl }
              repository(owner: $owner, name: $repo) {
                stargazerCount
                forkCount
                issues(states: OPEN) { totalCount }
                pullRequests(states: OPEN) { totalCount }
                updatedAt
                diskUsage
                defaultBranchRef {
                  target {
                    ... on Commit {
                      history { totalCount }  # all commits on default branch
                    }
                  }
                }
              }
            }
          `;

          const res = await fetch("https://api.github.com/graphql", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ query, variables: { owner, repo } }),
          });

          json = await res.json();

          if (json.errors) throw new Error(json.errors[0].message);
        }

        const viewer = json.data.viewer;
        const repoData = json.data.repository;

        setStats({
          user: {
            login: viewer.login,
            name: viewer.name || viewer.login,
            avatar: viewer.avatarUrl,
          },
          repo: {
            stars: repoData.stargazerCount,
            forks: repoData.forkCount,
            openIssues: repoData.issues.totalCount,
            openPRs: repoData.pullRequests.totalCount,
            updated: repoData.updatedAt,
            commitsByUser: repoData.defaultBranchRef?.target?.history?.totalCount || 0,
            diskUsageKB: repoData.diskUsage || 0,
          },
        });
      } catch (err) {
        console.error("useRepoStats: error fetching stats:", err);
        setError(err.message);
      }

      setLoading(false);
    };

    fetchStats();
  }, [owner, repo, token]);

  return { stats, loading, error };
}
