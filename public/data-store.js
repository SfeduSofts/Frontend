(() => {
  function getApiOrigin() {
    const currentProtocol =
      window.location.protocol === "https:" ? "https:" : "http:";
    const currentHost = window.location.hostname || "127.0.0.1";

    return `${currentProtocol}//${currentHost}:8000`;
  }

  const API_ORIGIN = getApiOrigin();
  const API_BASE = `${API_ORIGIN}/api`;
  const PROJECT_FILES_BASE_URL = `${API_BASE}/projects`;
  const LOGIN_URL = "https://lms.sfedu.ru/auth/oidc/?source=loginpage";

  async function requestJson(path, options = {}) {
    const {
      skipJsonContentType = false,
      headers: customHeaders = {},
      ...fetchOptions
    } = options;
    const headers = {
      ...(skipJsonContentType ? {} : { "Content-Type": "application/json" }),
      ...customHeaders,
    };

    const response = await fetch(`${API_BASE}${path}`, {
      credentials: "include",
      headers,
      ...fetchOptions,
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
    apiOrigin: API_ORIGIN,
    apiBase: API_BASE,
    projectFilesBaseUrl: PROJECT_FILES_BASE_URL,
    loadProjects() {
      return requestJson("/projects");
    },
    loadProjectDetails(projectId) {
      return requestJson(`/projects/${projectId}`);
    },
    importMp2Projects() {
      return requestJson("/projects/import/mp2", {
        method: "POST",
      });
    },
    importProjectsFromSheet(url) {
      return requestJson("/projects/import/sheet", {
        method: "POST",
        body: JSON.stringify({ url }),
      });
    },
    loadTeamStudents(teamName, projectId = null) {
      const query =
        projectId == null
          ? ""
          : `?project_id=${encodeURIComponent(String(projectId))}`;
      return requestJson(`/teams/${encodeURIComponent(teamName)}/students${query}`);
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
    updateProjectTeams(projectId, teamNames) {
      return requestJson(`/teams/${projectId}/teams`, {
        method: "PUT",
        body: JSON.stringify({ teamNames }),
      });
    },
    updateProjectDocuments(projectId, payload) {
      const tasks = [];

      if (payload?.removePhoto) {
        tasks.push(
          requestJson(`/projects/${projectId}/image`, {
            method: "DELETE",
            skipJsonContentType: true,
          })
        );
      }

      if (payload?.removePdf) {
        tasks.push(
          requestJson(`/projects/${projectId}/pdf`, {
            method: "DELETE",
            skipJsonContentType: true,
          })
        );
      }

      if (payload?.photoFile) {
        const imageData = new FormData();
        imageData.append("image", payload.photoFile);
        tasks.push(
          requestJson(`/projects/${projectId}/image`, {
            method: "PUT",
            body: imageData,
            skipJsonContentType: true,
          })
        );
      }

      if (payload?.pdfFile) {
        const pdfData = new FormData();
        pdfData.append("pdf", payload.pdfFile);
        tasks.push(
          requestJson(`/projects/${projectId}/pdf`, {
            method: "PUT",
            body: pdfData,
            skipJsonContentType: true,
          })
        );
      }

      if (tasks.length === 0) {
        return Promise.resolve(null);
      }

      return Promise.all(tasks);
    },
    updateTeamStudents(teamName, students, projectId = null) {
      const query =
        projectId == null
          ? ""
          : `?project_id=${encodeURIComponent(String(projectId))}`;
      return requestJson(`/teams/${encodeURIComponent(teamName)}/students${query}`, {
        method: "PUT",
        body: JSON.stringify({ students }),
      });
    },
  };

  window.DataStore = DataStore;
})();
