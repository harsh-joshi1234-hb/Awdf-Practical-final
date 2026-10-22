import { useEffect, useState } from "react";

const GITHUB_USERNAME = import.meta.env.VITE_GITHUB_USERNAME ?? "harsh-joshi1234-hb";

function RepoIcon() {
  return (
    <div className="repo-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" className="repo-icon-svg" focusable="false">
        <path
          fill="currentColor"
          d="M12 2.25C6.34 2.25 1.75 6.84 1.75 12.5c0 4.52 2.93 8.36 7 9.72.5.09.68-.22.68-.48 0-.24-.01-1.03-.01-1.87-2.5.46-3.15-.61-3.35-1.17-.11-.28-.59-1.17-1.01-1.4-.34-.18-.82-.62-.01-.63.77-.01 1.32.71 1.5 1 .88 1.49 2.29 1.07 2.85.82.08-.64.34-1.07.61-1.32-2.13-.24-4.35-1.07-4.35-4.76 0-1.05.37-1.92.98-2.6-.1-.24-.43-1.21.09-2.53 0 0 .8-.26 2.62 1a9.1 9.1 0 0 1 4.77 0c1.82-1.26 2.62-1 2.62-1 .52 1.32.19 2.29.09 2.53.61.68.98 1.55.98 2.6 0 3.7-2.23 4.52-4.36 4.76.35.31.67.9.67 1.82 0 1.31-.01 2.36-.01 2.68 0 .26.18.57.69.48 4.07-1.36 7-5.2 7-9.72 0-5.66-4.59-10.25-10.25-10.25Z"
        />
      </svg>
    </div>
  );
}

function Spinner() {
  return (
    <div className="status-panel loading-panel" role="status" aria-live="polite">
      <div className="spinner" aria-hidden="true" />
      <p>Loading repositories...</p>
    </div>
  );
}

function ErrorMessage({ message, onRetry }) {
  return (
    <div className="status-panel error-panel" role="alert">
      <h3>Unable to load repositories</h3>
      <p>{message}</p>
      <button type="button" className="retry-btn" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

function Projects() {
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchRepos() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `https://api.github.com/users/${GITHUB_USERNAME}/repos?sort=updated&per_page=12`,
          {
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const data = await response.json();

        if (!controller.signal.aborted) {
          setRepos(data);
        }
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setError(requestError instanceof Error ? requestError.message : "Something went wrong.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchRepos();

    return () => controller.abort();
  }, [refreshIndex]);

  const filteredRepos = repos.filter((repo) =>
    repo.name.toLowerCase().includes(searchTerm.trim().toLowerCase()),
  );

  return (
    <div className="card projects-card">
      <div className="projects-header">
        <div>
          <h2>Projects</h2>
          <p>Live GitHub repositories for {GITHUB_USERNAME}.</p>
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorMessage message={error} onRetry={() => setRefreshIndex((value) => value + 1)} />
      ) : (
        <>
          <div className="projects-controls">
            <label className="search-label" htmlFor="repo-search">
              Search repositories
            </label>
            <input
              id="repo-search"
              className="form-input repo-search"
              type="search"
              placeholder="Filter by repository name"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <p className="projects-summary">
              Showing {filteredRepos.length} of {repos.length} repositories.
            </p>
          </div>

          <div className="project-list repo-grid">
            {filteredRepos.length > 0 ? (
              filteredRepos.map((repo) => (
                <article key={repo.id} className="project-card repo-card">
                  <RepoIcon />
                  <h3 className="repo-title">{repo.name}</h3>
                  <p>{repo.description || "No description available."}</p>
                  <div className="repo-meta">
                    <span className="repo-stars">{repo.stargazers_count} stars</span>
                  </div>
                  <a className="repo-link" href={repo.html_url} target="_blank" rel="noreferrer">
                    View repository
                  </a>
                </article>
              ))
            ) : (
              <div className="empty-state">No repositories match "{searchTerm}".</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default Projects;
