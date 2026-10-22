import { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5000";
const API_URL = `${API_BASE}/tasks`;

function TaskManager() {
  const [token, setToken] = useState(localStorage.getItem("token") || null);
  const [user, setUser] = useState(null);
  
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
      fetchMe();
    } else {
      localStorage.removeItem("token");
      setUser(null);
      setTasks([]);
    }
  }, [token]);

  async function fetchWithAuth(url, options = {}) {
    const headers = {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    };
    const response = await fetch(url, { ...options, headers });
    if (response.status === 401) {
      handleLogout();
      throw new Error("Unauthorized: Please log in again.");
    }
    return response;
  }

  async function fetchMe() {
    try {
      const response = await fetchWithAuth(`${API_BASE}/me`);
      if (response.ok) {
        const data = await response.json();
        setUser(data);
        fetchTasks();
      } else {
        handleLogout();
      }
    } catch (err) {
      console.error("Failed to fetch user:", err);
    }
  }

  async function handleAuthSubmit(e) {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);

    try {
      const endpoint = isLoginMode ? "/login" : "/register";
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: authEmail, password: authPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      if (isLoginMode) {
        setToken(data.token);
        setAuthEmail("");
        setAuthPassword("");
      } else {
        setIsLoginMode(true);
        setAuthError("Registration successful. Please log in.");
      }
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  }

  function handleLogout() {
    setToken(null);
    setUser(null);
    setTasks([]);
  }

  async function fetchTasks() {
    try {
      setLoading(true);
      setError("");

      const response = await fetchWithAuth(API_URL);
      if (!response.ok) {
        throw new Error("Failed to load tasks");
      }

      const data = await response.json();
      setTasks(data);
    } catch (requestError) {
      setError(requestError.message || "Unable to load tasks.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!title.trim()) {
      setError("Task title is required.");
      return;
    }

    const payload = {
      title: title.trim(),
      description: description.trim(),
      completed: false,
    };

    try {
      const method = editingId ? "PUT" : "POST";
      const url = editingId ? `${API_URL}/${editingId}` : API_URL;

      const response = await fetchWithAuth(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || "Request failed");
      }

      setTitle("");
      setDescription("");
      setEditingId(null);
      setError("");
      await fetchTasks();
    } catch (requestError) {
      setError(requestError.message || "Unable to save task.");
    }
  }

  async function handleDelete(taskId) {
    const confirmed = window.confirm("Delete this task?");
    if (!confirmed) return;

    try {
      const response = await fetchWithAuth(`${API_URL}/${taskId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || "Unable to delete task");
      }

      setError("");
      await fetchTasks();
    } catch (requestError) {
      setError(requestError.message || "Unable to delete task.");
    }
  }

  function startEdit(task) {
    setEditingId(task._id || task.id);
    setTitle(task.title || "");
    setDescription(task.description || "");
  }

  function cancelEdit() {
    setEditingId(null);
    setTitle("");
    setDescription("");
  }

  if (!token) {
    return (
      <div className="card task-shell">
        <h2>{isLoginMode ? "Login" : "Register"}</h2>
        <form className="task-form" onSubmit={handleAuthSubmit}>
          <label className="form-label">Email</label>
          <input
            className="form-input"
            type="email"
            value={authEmail}
            onChange={(e) => setAuthEmail(e.target.value)}
            required
          />
          <label className="form-label">Password</label>
          <input
            className="form-input"
            type="password"
            value={authPassword}
            onChange={(e) => setAuthPassword(e.target.value)}
            required
          />
          <div className="task-actions" style={{ marginTop: "1rem" }}>
            <button type="submit" className="toggle-btn primary-btn" disabled={authLoading}>
              {authLoading ? "Loading..." : isLoginMode ? "Login" : "Register"}
            </button>
            <button
              type="button"
              className="secondary-btn"
              onClick={() => {
                setIsLoginMode(!isLoginMode);
                setAuthError("");
              }}
            >
              {isLoginMode ? "Need an account?" : "Already have an account?"}
            </button>
          </div>
        </form>
        {authError && <p className="form-error" style={{ marginTop: "1rem" }}>{authError}</p>}
      </div>
    );
  }

  return (
    <div className="card task-shell">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Task Manager</h2>
        <button onClick={handleLogout} className="secondary-btn">Logout</button>
      </div>
      <p className="task-subtitle">
        {user ? `Welcome, ${user.email}` : "Loading user..."}
      </p>

      <form className="task-form" onSubmit={handleSubmit}>
        <label className="form-label" htmlFor="task-title">
          Task Title
        </label>
        <input
          id="task-title"
          className="form-input"
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Enter task title"
        />

        <label className="form-label" htmlFor="task-description">
          Description
        </label>
        <textarea
          id="task-description"
          className="form-input form-textarea"
          rows="3"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Enter a description"
        />

        <div className="task-actions">
          <button type="submit" className="toggle-btn primary-btn">
            {editingId ? "Update Task" : "Add Task"}
          </button>
          {editingId && (
            <button type="button" className="secondary-btn" onClick={cancelEdit}>
              Cancel
            </button>
          )}
        </div>
      </form>

      {error && <p className="form-error">{error}</p>}

      {loading ? (
        <p className="empty-state copy-neutral">Loading tasks...</p>
      ) : tasks.length === 0 ? (
        <p className="empty-state copy-neutral">No tasks available.</p>
      ) : (
        <ul className="task-list">
          {tasks.map((task) => (
            <li key={task._id || task.id} className="task-item">
              <div>
                <h3>{task.title}</h3>
                <p>{task.description || "No description"}</p>
                <small>{task.completed ? "Completed" : "Pending"}</small>
              </div>

              <div className="task-buttons">
                <button type="button" className="secondary-btn" onClick={() => startEdit(task)}>
                  Edit
                </button>
                <button
                  type="button"
                  className="delete-btn"
                  onClick={() => handleDelete(task._id || task.id)}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default TaskManager;
