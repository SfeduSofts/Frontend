let projects = [];
let projectsLoaded = false;

const DEFAULT_PROJECT_IMAGE_URL = "images/projects/default-project.jpg";
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

function loadTeamStudents(teamName) {
  return DataStore.loadTeamStudents(teamName).catch(() => []);
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
    items.push(
      `<li class="project-modal__team-group-title">Команда: ${escapeHtml(
        teamName
      )}</li>`
    );

    if (Array.isArray(students) && students.length > 0) {
      students.forEach((student) => {
        const initial =
          (student.name && student.name.trim().charAt(0).toUpperCase()) || "?";

        items.push(`
          <li class="project-modal__student">
            <div class="project-modal__student-photo-wrapper">
              ${
                student.photoUrl
                  ? `<img src="${escapeHtml(
                      student.photoUrl
                    )}" alt="${escapeHtml(
                      student.name
                    )}" class="project-modal__student-photo">`
                  : `<div class="project-modal__student-placeholder">${initial}</div>`
              }
            </div>
            <div class="project-modal__student-info">
              <div class="project-modal__student-name">${escapeHtml(
                student.name
              )}</div>
              <div class="project-modal__student-role">${escapeHtml(
                student.role
              )}</div>
            </div>
          </li>
        `);
      });
    } else {
      items.push(
        '<li class="project-modal__student project-modal__student--empty">Нет данных по студентам.</li>'
      );
    }
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
    .then((project) => {
      if (!project || requestId !== activeModalRequestId) return;

      const base = projects.find((item) => item.id === projectId) || {};
      const combined = { ...base, ...project };

      modalTitle.textContent = combined.name || "Проект";

      if (modalTeamName) {
        const teamNames = Array.isArray(combined.teamNames)
          ? combined.teamNames.filter(Boolean)
          : [];
        modalTeamName.textContent = teamNames.join(", ");
      }

      const imageUrl = combined.imageUrl || DEFAULT_PROJECT_IMAGE_URL;
      modalImage.src = imageUrl;
      modalImage.alt = combined.name || "Изображение проекта";

      modalDescription.textContent =
        combined.fullDescription || combined.description || "";

      if (combined.pdfUrl) {
        modalPdfLink.href = combined.pdfUrl;
        modalPdfLink.style.display = "";
      } else {
        modalPdfLink.removeAttribute("href");
        modalPdfLink.style.display = "none";
      }

      const teamNames = Array.isArray(combined.teamNames)
        ? combined.teamNames.filter(Boolean)
        : [];

      if (teamNames.length === 0) {
        renderTeamStudentsPlaceholder("Информация о командах появится позже.");
      } else {
        renderTeamStudentsPlaceholder("Загрузка списка студентов...");

        Promise.all(
          teamNames.map((teamName) =>
            loadTeamStudents(teamName).then((students) => ({
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
