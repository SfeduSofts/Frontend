(() => {
  const API_BASE = "http://127.0.0.1:8000/api";
  const LOGIN_URL = "https://lms.sfedu.ru/auth/oidc/?source=loginpage";

  async function requestJson(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },

      
      ...options,
    });

    if (response.status === 401) {
      let loginUrl = LOGIN_URL;
      try {
        const body = await response.json();
        if (body && body.login_url) {
          loginUrl = body.login_url;
        }
      } catch (error) {
        // ignore JSON parse error
      }

      if (loginUrl) {
        window.location.href = loginUrl;
      }
      throw new Error("Unauthorized");
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || "Request failed");
    }

    if (response.status === 204) {
      return null;
    }

    return response.json();
  }

  const DataStore = {
    loadProjects() {
      return requestJson("/projects");
    },
    loadProjectDetails(projectId) {
      return requestJson(`/projects/${projectId}/details`);
    },
    loadTeamStudents(teamName) {
      return requestJson(`/teams/${encodeURIComponent(teamName)}/students`);
    },
    createProject(payload) {
      return requestJson("/projects", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    updateProject(projectId, payload) {
      return requestJson(`/projects/${projectId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    },
    deleteProject(projectId) {
      return requestJson(`/projects/${projectId}`, {
        method: "DELETE",
      });
    },
    updateProjectDetails(projectId, payload) {
      return requestJson(`/projects/${projectId}/details`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    },
    updateTeamStudents(teamName, students) {
      return requestJson(`/teams/${encodeURIComponent(teamName)}/students`, {
        method: "PUT",
        body: JSON.stringify({ students }),
      });
    },
  };

  window.DataStore = DataStore;
})();
