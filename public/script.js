let projects = [];
let projectsLoaded = false;

const DEFAULT_PROJECT_IMAGE_URL = "images/projects/default-project.jpg";
const PROJECT_FILES_BASE_URL = "http://127.0.0.1:8000/api/projects";
function loadProjects() {
  return DataStore.loadProjects();
}

const cardsContainer = document.getElementById("cardsContainer");
const searchInput = document.getElementById("searchInput");
const filterButtons = document.querySelectorAll(".filter-button");
const resetFiltersButton = document.getElementById("resetFiltersButton");

const modalBackdrop = document.getElementById("projectModal");
const modalTitle = document.getElementById("projectModalTitle");
const modalImage = document.getElementById("projectModalImage");
const modalDescription = document.getElementById("projectModalDescription");
const modalPdfLink = document.getElementById("projectModalPdf");
const modalStudentsList = document.getElementById("projectModalStudents");
const modalTeamName = document.getElementById("projectModalTeamName");

const state = {
  search: "",
  types: new Set(),
  years: new Set(),
};

let activeModalRequestId = 0;

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

function loadProjectDetails(projectId) {
  return DataStore.loadProjectDetails(projectId);
}

function loadTeamStudents(teamName, projectId = null) {
  return DataStore.loadTeamStudents(teamName, projectId).catch(() => []);
}

function getProjectTeamNames(payload) {
  const source = payload?.teamNames || payload?.team_names;
  if (!Array.isArray(source)) return [];

  return source
    .map((team) => (typeof team === "string" ? team : team?.name))
    .filter(Boolean);
}

function getProjectFullDescription(payload) {
  return payload?.fullDescription || payload?.full_description || payload?.description || "";
}

function getProjectPdfUrl(payload, projectId) {
  return (
    payload?.pdfUrl ||
    payload?.pdf_src ||
    payload?.pdfSrc ||
    `${PROJECT_FILES_BASE_URL}/${projectId}/pdf`
  );
}

async function checkPdfExists(url) {
  if (!url) return false;

  try {
    const response = await fetch(url, {
      method: "HEAD",
      credentials: "include",
    });

    if (response.status === 405) {
      return true;
    }

    return response.ok;
  } catch (_) {
    return true;
  }
}

function getDisplayYears(project) {
  if (project.year == null || project.year === "") return "";

  const startYear = Number(project.year);

  if (!Number.isFinite(startYear)) return "";

  if (project.type === "МП2") {
    const endYear = startYear + 1;
    return `${startYear}–${endYear}`;
  }

  return String(startYear);
}

function parseYearRangeLabel(label) {
  if (label == null) return null;

  const raw = String(label).trim();
  if (!raw) return null;

  const parts = raw
    .split(/[-–]/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (parts.length === 1) {
    const y = Number(parts[0]);
    if (!Number.isFinite(y)) return null;
    return { start: y, end: y };
  }

  if (parts.length >= 2) {
    const start = Number(parts[0]);
    const end = Number(parts[1]);
    if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
    return { start, end };
  }

  return null;
}

function renderProjects() {
  if (!projectsLoaded) {
    cardsContainer.innerHTML =
      '<article class="project-card">' +
      '<div class="project-card-header">' +
      '<h2 class="project-title">Загрузка проектов...</h2>' +
      "</div>" +
      '<p class="project-description">Пожалуйста, подождите.</p>' +
      "</article>";
    return;
  }

  const normalizedSearch = state.search.trim().toLowerCase();

  const filtered = projects.filter((project) => {
    const matchType = state.types.size === 0 || state.types.has(project.type);

    const matchYear =
      state.years.size === 0 ||
      Array.from(state.years).some((label) => {
        const range = parseYearRangeLabel(label);
        if (!range) return false;

        const filterStartYear = range.start;
        if (project.year == null || project.year === "") return false;

        const projectStartYear = Number(project.year);

        if (!Number.isFinite(projectStartYear)) return false;

        return projectStartYear === filterStartYear;
      });

    const matchSearch =
      normalizedSearch.length === 0 ||
      project.name.toLowerCase().includes(normalizedSearch);

    return matchType && matchYear && matchSearch;
  });

  if (filtered.length === 0) {
    cardsContainer.innerHTML =
      '<article class="project-card">' +
      '<div class="project-card-header">' +
      '<h2 class="project-title">Нет проектов</h2>' +
      "</div>" +
      '<p class="project-description">Попробуйте изменить параметры поиска или фильтры.</p>' +
      "</article>";
    return;
  }

  const html = filtered
    .map((project) => {
      const mentorHtml = project.mentor
        ? '<div class="project-meta project-mentor">Наставник: ' +
          escapeHtml(project.mentor) +
          "</div>"
        : "";

      return `
        <article 
          class="project-card" 
          data-project-id="${project.id}" 
          data-project-type="${project.type}"
        >
            <div class="project-card-header">
                <h2 class="project-title">${escapeHtml(project.name)}</h2>
            </div>
            <div class="project-meta">
              Годы реализации: ${getDisplayYears(project)}
            </div>
            ${mentorHtml}
            <p class="project-description">${escapeHtml(
              project.description
            )}</p>
        </article>
    `;
    })
    .join("");

  cardsContainer.innerHTML = html;

  attachCardClickHandlers();
}

function renderTeamStudents(groups) {
  if (!modalStudentsList) return;

  const items = [];

  groups.forEach(({ teamName, students }) => {
    const studentsHtml =
      Array.isArray(students) && students.length > 0
        ? `<ul class="project-modal__team-members">
            ${students
              .map(
                (student) => `
                  <li class="project-modal__student">
                    <div class="project-modal__student-info">
                      <div class="project-modal__student-name">${escapeHtml(
                        student.name || "Без имени"
                      )}</div>
                      <div class="project-modal__student-role">${escapeHtml(
                        student.role || ""
                      )}</div>
                    </div>
                  </li>
                `
              )
              .join("")}
          </ul>`
        : '<div class="project-modal__team-empty">Нет данных по студентам.</div>';

    items.push(`
      <li class="project-modal__team-group">
        <div class="project-modal__team-group-title">Команда: ${escapeHtml(
          teamName
        )}</div>
        ${studentsHtml}
      </li>
    `);
  });

  modalStudentsList.innerHTML = items.join("");
}

function renderTeamStudentsPlaceholder(message) {
  if (!modalStudentsList) return;

  modalStudentsList.innerHTML =
    '<li class="project-modal__student project-modal__student--empty">' +
    message +
    "</li>";
}

function attachCardClickHandlers() {
  const cards = cardsContainer.querySelectorAll(".project-card");

  cards.forEach((card) => {
    const projectId = Number(card.dataset.projectId);
    if (!projectId) return;

    card.addEventListener("click", () => {
      openProjectModal(projectId);
    });
  });
}

function toggleFilter(button) {
  const filterType = button.dataset.filterType;

  if (filterType === "type") {
    const value = button.dataset.value;
    if (state.types.has(value)) {
      state.types.delete(value);
      button.classList.remove("active");
    } else {
      state.types.add(value);
      button.classList.add("active");
    }
  }

  if (filterType === "year") {
    const raw = button.dataset.value; // например "2024–2025"

    if (state.years.has(raw)) {
      state.years.delete(raw);
      button.classList.remove("active");
    } else {
      state.years.add(raw);
      button.classList.add("active");
    }
  }

  renderProjects();
}

function resetFilters() {
  state.search = "";
  state.types.clear();
  state.years.clear();

  searchInput.value = "";

  filterButtons.forEach((button) => {
    button.classList.remove("active");
  });

  renderProjects();
}

function openProjectModal(projectId) {
  const requestId = (activeModalRequestId += 1);

  loadProjectDetails(projectId)
    .then(async (project) => {
      if (!project || requestId !== activeModalRequestId) return;

      const base = projects.find((item) => item.id === projectId) || {};
      const combined = { ...base, ...project };

      modalTitle.textContent = combined.name || "Проект";

      if (modalTeamName) {
        const teamNames = getProjectTeamNames(combined);
        modalTeamName.textContent = teamNames.join(", ");
      }

      const imageUrl = `${PROJECT_FILES_BASE_URL}/${projectId}/image`;
      modalImage.onerror = () => {
        modalImage.onerror = null;
        modalImage.src = DEFAULT_PROJECT_IMAGE_URL;
      };
      modalImage.src = imageUrl || DEFAULT_PROJECT_IMAGE_URL;
      modalImage.alt = combined.name || "Изображение проекта";

      modalDescription.textContent = getProjectFullDescription(combined);

      const pdfUrl = getProjectPdfUrl(combined, projectId);
      const hasPdf = await checkPdfExists(pdfUrl);
      if (requestId !== activeModalRequestId) return;

      if (hasPdf) {
        modalPdfLink.href = pdfUrl;
        modalPdfLink.style.display = "";
      } else {
        modalPdfLink.removeAttribute("href");
        modalPdfLink.style.display = "none";
      }

      const teamNames = getProjectTeamNames(combined);

      if (teamNames.length === 0) {
        renderTeamStudentsPlaceholder("Информация о командах появится позже.");
      } else {
        renderTeamStudentsPlaceholder("Загрузка списка студентов...");

        Promise.all(
          teamNames.map((teamName) =>
            loadTeamStudents(teamName, projectId).then((students) => ({
              teamName,
              students,
            }))
          )
        ).then((groups) => {
          if (requestId !== activeModalRequestId) return;
          renderTeamStudents(groups);
        });
      }

      modalBackdrop.classList.add("is-open");
      modalBackdrop.setAttribute("aria-hidden", "false");
    })
    .catch((error) => {
      console.error("Ошибка загрузки деталей проекта:", error);
    });
}

function closeProjectModal() {
  modalBackdrop.classList.remove("is-open");
  modalBackdrop.setAttribute("aria-hidden", "true");
}

if (modalBackdrop) {
  modalBackdrop.addEventListener("click", (event) => {
    if (event.target === modalBackdrop) {
      closeProjectModal();
    }
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeProjectModal();
  }
});

function init() {
  const contacts = document.getElementById("contacts");
  const sidebarInner = document.querySelector(".sidebar-inner");
  if (contacts && sidebarInner) {
    sidebarInner.appendChild(contacts);
  }

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => toggleFilter(button));
  });

  searchInput.addEventListener("input", (event) => {
    state.search = event.target.value;
    renderProjects();
  });

  if (resetFiltersButton) {
    resetFiltersButton.addEventListener("click", resetFilters);
  }

  loadProjects()
    .then((loadedProjects) => {
      projects = loadedProjects;
      projectsLoaded = true;
      renderProjects();
    })
    .catch((error) => {
      console.error("Ошибка загрузки списка проектов:", error);
      cardsContainer.innerHTML =
        '<article class="project-card">' +
        '<div class="project-card-header">' +
        '<h2 class="project-title">Не удалось загрузить проекты</h2>' +
        "</div>" +
        '<p class="project-description">Попробуйте обновить страницу позже.</p>' +
        "</article>";
    });
}

init();

