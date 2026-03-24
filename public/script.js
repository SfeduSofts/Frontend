let projects = [];
let projectsLoaded = false;

const DEFAULT_PROJECT_IMAGE_URL = "images/projects/default-project.jpg";
const PROJECT_FILES_BASE_URL = DataStore.projectFilesBaseUrl;
function loadProjects() {
  return DataStore.loadProjects();
}

const cardsContainer = document.getElementById("cardsContainer");
const searchInput = document.getElementById("searchInput");
const filterButtons = document.querySelectorAll(".filter-button");
const resetFiltersButton = document.getElementById("resetFiltersButton");
const page = document.querySelector(".page");
const sidebar = document.getElementById("catalogSidebar");
const sidebarBackdrop = document.getElementById("sidebarBackdrop");
const sidebarSwipeHint = document.getElementById("sidebarSwipeHint");
const mobileSidebarMediaQuery = window.matchMedia("(max-width: 720px)");

const modalBackdrop = document.getElementById("projectModal");
const modalTitle = document.getElementById("projectModalTitle");
const modalImage = document.getElementById("projectModalImage");
const modalDescription = document.getElementById("projectModalDescription");
const modalPdfLink = document.getElementById("projectModalPdf");
const modalStudentsList = document.getElementById("projectModalStudents");
const modalTeamName = document.getElementById("projectModalTeamName");
const modalCloseButton = document.getElementById("projectModalClose");
const projectsHelpOverlay = document.getElementById("projectsHelpOverlay");
const authorsOverlay = document.getElementById("authorsOverlay");
const authorsOpenButton = document.getElementById("authorsOpenButton");
const authorsCloseButton = document.getElementById("authorsCloseButton");

const state = {
  search: "",
  types: new Set(),
  years: new Set(),
};

let activeModalRequestId = 0;
let isMobileSidebarOpen = false;
let swipeGestureState = null;
let swipeHintTimeoutId = 0;
let hasCompletedSidebarSwipeHint = false;

const SIDEBAR_SWIPE_HINT_STORAGE_KEY = "catalogSidebarSwipeHintCompleted";
const SIDEBAR_OPEN_EDGE_THRESHOLD = 36;
const SIDEBAR_OPEN_SWIPE_DISTANCE = 68;
const SIDEBAR_CLOSE_SWIPE_DISTANCE = 52;
const SIDEBAR_MAX_SWIPE_VERTICAL_DRIFT = 72;
const SIDEBAR_SWIPE_HINT_DELAY_MS = 700;

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

function readBooleanStorage(key) {
  try {
    return window.localStorage.getItem(key) === "1";
  } catch (_) {
    return false;
  }
}

function writeBooleanStorage(key, value) {
  try {
    if (value) {
      window.localStorage.setItem(key, "1");
    } else {
      window.localStorage.removeItem(key);
    }
  } catch (_) {
    // ignore storage access issues
  }
}

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
  return (
    payload?.fullDescription ||
    payload?.full_description ||
    payload?.description ||
    ""
  );
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

function shouldShowProjectsHelp() {
  return (
    projectsLoaded &&
    state.search.trim().length === 0 &&
    state.types.size === 0 &&
    state.years.size === 0
  );
}

function updateProjectsHelpVisibility() {
  if (!projectsHelpOverlay) return;

  const shouldShow = shouldShowProjectsHelp();
  projectsHelpOverlay.classList.toggle("is-visible", shouldShow);
  projectsHelpOverlay.setAttribute("aria-hidden", String(!shouldShow));
}

function syncMobileSidebarState() {
  const isMobile = mobileSidebarMediaQuery.matches;
  const shouldOpen = isMobile && isMobileSidebarOpen;

  if (page) {
    page.classList.toggle("is-sidebar-open", shouldOpen);
  }

  if (sidebar) {
    sidebar.setAttribute("aria-hidden", String(isMobile && !shouldOpen));
  }

  if (sidebarBackdrop) {
    sidebarBackdrop.setAttribute("aria-hidden", String(!shouldOpen));
  }
}

function setMobileSidebarOpen(nextOpen) {
  const shouldOpen = mobileSidebarMediaQuery.matches && Boolean(nextOpen);

  isMobileSidebarOpen = shouldOpen;
  syncMobileSidebarState();

  if (shouldOpen) {
    completeSidebarSwipeHint();
  } else if (mobileSidebarMediaQuery.matches) {
    scheduleSidebarSwipeHint();
  }
}

function hideSidebarSwipeHint() {
  window.clearTimeout(swipeHintTimeoutId);

  if (!sidebarSwipeHint) return;

  sidebarSwipeHint.classList.remove("is-visible", "is-animating");
  sidebarSwipeHint.setAttribute("aria-hidden", "true");
}

function completeSidebarSwipeHint() {
  hasCompletedSidebarSwipeHint = true;
  writeBooleanStorage(SIDEBAR_SWIPE_HINT_STORAGE_KEY, true);
  hideSidebarSwipeHint();
}

function scheduleSidebarSwipeHint() {
  window.clearTimeout(swipeHintTimeoutId);

  if (
    !sidebarSwipeHint ||
    !mobileSidebarMediaQuery.matches ||
    isMobileSidebarOpen ||
    hasCompletedSidebarSwipeHint ||
    isOverlayInteractionActive()
  ) {
    hideSidebarSwipeHint();
    return;
  }

  swipeHintTimeoutId = window.setTimeout(() => {
    if (
      !sidebarSwipeHint ||
      !mobileSidebarMediaQuery.matches ||
      isMobileSidebarOpen ||
      hasCompletedSidebarSwipeHint ||
      isOverlayInteractionActive()
    ) {
      return;
    }

    sidebarSwipeHint.classList.remove("is-animating");
    sidebarSwipeHint.classList.add("is-visible");
    sidebarSwipeHint.setAttribute("aria-hidden", "false");

    window.requestAnimationFrame(() => {
      sidebarSwipeHint.classList.add("is-animating");
    });
  }, SIDEBAR_SWIPE_HINT_DELAY_MS);
}

function isOverlayInteractionActive() {
  return (
    modalBackdrop?.classList.contains("is-open") ||
    authorsOverlay?.classList.contains("is-open")
  );
}

function startSidebarSwipeGesture(event) {
  if (
    !mobileSidebarMediaQuery.matches ||
    isOverlayInteractionActive() ||
    !event.touches ||
    event.touches.length !== 1
  ) {
    swipeGestureState = null;
    return;
  }

  const touch = event.touches[0];
  const startedInsideSidebar = Boolean(sidebar?.contains(event.target));

  if (!isMobileSidebarOpen) {
    if (touch.clientX > SIDEBAR_OPEN_EDGE_THRESHOLD) {
      swipeGestureState = null;
      return;
    }

    swipeGestureState = {
      mode: "open",
      startX: touch.clientX,
      startY: touch.clientY,
    };
    return;
  }

  if (!startedInsideSidebar) {
    swipeGestureState = null;
    return;
  }

  swipeGestureState = {
    mode: "close",
    startX: touch.clientX,
    startY: touch.clientY,
  };
}

function finishSidebarSwipeGesture(event) {
  if (!swipeGestureState || !event.changedTouches || event.changedTouches.length === 0) {
    swipeGestureState = null;
    return;
  }

  const touch = event.changedTouches[0];
  const deltaX = touch.clientX - swipeGestureState.startX;
  const deltaY = touch.clientY - swipeGestureState.startY;
  const isMostlyHorizontal = Math.abs(deltaX) > Math.abs(deltaY);
  const isVerticalDriftAllowed =
    Math.abs(deltaY) <= SIDEBAR_MAX_SWIPE_VERTICAL_DRIFT;

  if (!isMostlyHorizontal || !isVerticalDriftAllowed) {
    swipeGestureState = null;
    return;
  }

  if (
    swipeGestureState.mode === "open" &&
    deltaX >= SIDEBAR_OPEN_SWIPE_DISTANCE
  ) {
    setMobileSidebarOpen(true);
  }

  if (
    swipeGestureState.mode === "close" &&
    deltaX <= -SIDEBAR_CLOSE_SWIPE_DISTANCE
  ) {
    setMobileSidebarOpen(false);
  }

  swipeGestureState = null;
}

function renderProjects() {
  updateProjectsHelpVisibility();

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
              project.description,
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
                        student.name || "Без имени",
                      )}</div>
                      <div class="project-modal__student-role">${escapeHtml(
                        student.role || "",
                      )}</div>
                    </div>
                  </li>
                `,
              )
              .join("")}
          </ul>`
        : '<div class="project-modal__team-empty">Нет данных по студентам.</div>';

    items.push(`
      <li class="project-modal__team-group">
        <div class="project-modal__team-group-title">Состав команды ${escapeHtml(
          teamName,
        )}:</div>
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
  hideSidebarSwipeHint();

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
            })),
          ),
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
  scheduleSidebarSwipeHint();
}

function openAuthorsOverlay() {
  if (!authorsOverlay) return;
  hideSidebarSwipeHint();
  authorsOverlay.classList.add("is-open");
  authorsOverlay.setAttribute("aria-hidden", "false");
}

function closeAuthorsOverlay() {
  if (!authorsOverlay) return;
  authorsOverlay.classList.remove("is-open");
  authorsOverlay.setAttribute("aria-hidden", "true");
  scheduleSidebarSwipeHint();
}

if (modalBackdrop) {
  modalBackdrop.addEventListener("click", (event) => {
    if (event.target === modalBackdrop) {
      closeProjectModal();
    }
  });
}

if (modalCloseButton) {
  modalCloseButton.addEventListener("click", closeProjectModal);
}

if (sidebarSwipeHint) {
  sidebarSwipeHint.addEventListener("animationend", (event) => {
    if (!event.target.classList.contains("sidebar-swipe-hint__finger")) return;
    hideSidebarSwipeHint();
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setMobileSidebarOpen(false);
    closeAuthorsOverlay();
    closeProjectModal();
  }
});

function init() {
  const contacts = document.getElementById("contacts");
  const sidebarInner = document.querySelector(".sidebar-inner");
  const main = document.querySelector(".main");
  const cardsSection = document.querySelector(".cards-section");
  if (contacts && sidebarInner) {
    sidebarInner.appendChild(contacts);
  }

  if (authorsOverlay && main && authorsOverlay.parentElement !== main) {
    if (cardsSection) {
      main.insertBefore(authorsOverlay, cardsSection);
    } else {
      main.appendChild(authorsOverlay);
    }
  }

  const authorsPanel = authorsOverlay?.querySelector(".authors-overlay__panel");
  if (authorsPanel) {
    authorsPanel.removeAttribute("role");
    authorsPanel.removeAttribute("aria-modal");
  }

  if (authorsCloseButton) {
    authorsCloseButton.textContent = "Закрыть";
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

  if (sidebarBackdrop) {
    sidebarBackdrop.addEventListener("click", () => {
      setMobileSidebarOpen(false);
    });
  }

  document.addEventListener("touchstart", startSidebarSwipeGesture, {
    passive: true,
  });
  document.addEventListener("touchend", finishSidebarSwipeGesture, {
    passive: true,
  });
  document.addEventListener("touchcancel", () => {
    swipeGestureState = null;
  });

  const handleMobileSidebarViewportChange = (event) => {
    if (!event.matches) {
      isMobileSidebarOpen = false;
      swipeGestureState = null;
      hideSidebarSwipeHint();
    }

    syncMobileSidebarState();

    if (event.matches) {
      scheduleSidebarSwipeHint();
    }
  };

  if (typeof mobileSidebarMediaQuery.addEventListener === "function") {
    mobileSidebarMediaQuery.addEventListener(
      "change",
      handleMobileSidebarViewportChange,
    );
  } else if (typeof mobileSidebarMediaQuery.addListener === "function") {
    mobileSidebarMediaQuery.addListener(handleMobileSidebarViewportChange);
  }

  hasCompletedSidebarSwipeHint = readBooleanStorage(
    SIDEBAR_SWIPE_HINT_STORAGE_KEY,
  );
  syncMobileSidebarState();
  scheduleSidebarSwipeHint();

  if (authorsOpenButton) {
    authorsOpenButton.addEventListener("click", openAuthorsOverlay);
  }

  if (authorsCloseButton) {
    authorsCloseButton.addEventListener("click", closeAuthorsOverlay);
  }

  if (authorsOverlay) {
    authorsOverlay.addEventListener("click", (event) => {
      if (
        event.target === authorsOverlay ||
        event.target.classList.contains("authors-overlay__blocker")
      ) {
        closeAuthorsOverlay();
      }
    });
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
