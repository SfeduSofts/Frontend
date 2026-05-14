(() => {
  function getApiOrigin() {
    if (window.location.protocol === "file:") {
      return "http://127.0.0.1:8000";
    }

    const currentProtocol =
      window.location.protocol === "https:" ? "https:" : "http:";
    const currentHost = window.location.hostname || "127.0.0.1";

    return `${currentProtocol}//${currentHost}:8000`;
  }

  const API_ORIGIN = getApiOrigin();
  const API_BASE = `${API_ORIGIN}/api`;
  const AUTH_BASE =`${API_ORIGIN}/auth`;
  const PROJECT_FILES_BASE_URL = `${API_BASE}/projects`;
  const LOGIN_URL = `${AUTH_BASE}/login`;

  async function requestJsonFromBase(baseUrl, path, options = {}) {
    const {
      redirectOnUnauthorized = true,
      skipJsonContentType = false,
      headers: customHeaders = {},
      ...fetchOptions
    } = options;
    const headers = {
      ...(skipJsonContentType ? {} : { "Content-Type": "application/json" }),
      ...customHeaders,
    };

    const response = await fetch(`${baseUrl}${path}`, {
      credentials: "include",
      headers,
      ...fetchOptions,
    });

    console.log(`Request: ${fetchOptions.method || "GET"} ${baseUrl}${path}`);
    console.log("Response status:", response.status);

    if (!response.ok) {
      let text = "";
      let body = null;

      try {
        text = await response.text();
        body = text ? JSON.parse(text) : null;
      } catch (error) {
        body = null;
      }

      const detail = body?.detail || body?.message || text;
      const message = Array.isArray(detail)
        ? detail.map((item) => item?.msg || String(item)).join(", ")
        : String(detail || "Request failed");
      const requestError = new Error(message);
      requestError.status = response.status;
      requestError.detail = detail;
      requestError.body = body;
      requestError.loginUrl = body?.login_url || LOGIN_URL;

      if (
        response.status === 401 &&
        redirectOnUnauthorized &&
        requestError.loginUrl
      ) {
        window.location.href = requestError.loginUrl;
      }

      throw requestError;
    }

    if (response.status === 204) {
      return null;
    }

    return response.json();
  }

  function requestJson(path, options = {}) {
    return requestJsonFromBase(API_BASE, path, options);
  }

  function requestAuthJson(path, options = {}) {
    return requestJsonFromBase(AUTH_BASE, path, options);
  }

  const DataStore = {
    apiOrigin: API_ORIGIN,
    apiBase: API_BASE,
    authBase: AUTH_BASE,
    authLoginUrl: LOGIN_URL,
    projectFilesBaseUrl: PROJECT_FILES_BASE_URL,
    loadProjects(options = {}) {
      return requestJson("/projects", options);
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
    loadAdmins(options = {}) {
      return requestAuthJson("/admins", options);
    },
    createAdmin(email, options = {}) {
      return requestAuthJson("/admins", {
        ...options,
        method: "POST",
        body: JSON.stringify({ email }),
      });
    },
    deleteAdmin(email, options = {}) {
      return requestAuthJson(`/admins/${encodeURIComponent(email)}`, {
        ...options,
        method: "DELETE",
      });
    },
  };

  window.DataStore = DataStore;
})();
