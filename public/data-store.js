(() => {
  const API_BASE = "http://127.0.0.1:8000/api";
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
    loadProjects() {
      return requestJson("/projects");
    },
    loadProjectDetails(projectId) {
      return requestJson(`/projects/${projectId}`);
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
    updateProjectDocuments(projectId, payload) {
      const imageData = new FormData();
      const pdfData = new FormData();
      if (payload?.photoFile) {
        imageData.append("image", payload.photoFile);
      }
      if (payload?.pdfFile) {
        pdfData.append("pdf", payload.pdfFile);
      }

      if(payload?.removePhoto)
        requestJson(`/projects/${projectId}/image`, {
            method: "DELETE",
            skipJsonContentType: true,
      });
      if(payload?.removePdf)
        requestJson(`/projects/${projectId}/pdf`, {
            method: "DELETE",
            skipJsonContentType: true,
      });

      requestJson(`/projects/${projectId}/image`, {
        method: "PUT",
        body: imageData,
        skipJsonContentType: true,
      });

      return requestJson(`/projects/${projectId}/pdf`, {
        method: "PUT",
        body: pdfData,
        skipJsonContentType: true,
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
