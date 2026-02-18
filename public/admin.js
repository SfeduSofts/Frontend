let projects = [];
let projectsLoaded = false;

const DEFAULT_PROJECT_IMAGE_URL = "images/projects/default-project.jpg";
const PROJECT_TYPE_MP1 = "\u041C\u041F1";
const PROJECT_TYPE_MP2 = "\u041C\u041F2";

const cardsContainer = document.getElementById("cardsContainer");
const searchInput = document.getElementById("searchInput");
const filterButtons = document.querySelectorAll(".filter-button");
const resetFiltersButton = document.getElementById("resetFiltersButton");

const modalBackdrop = document.getElementById("projectModal");
const modalImage = document.getElementById("projectModalImage");
const modalDescription = document.getElementById("projectModalDescription");
const modalPdfLink = document.getElementById("projectModalPdf");
const modalStudentsList = document.getElementById("projectModalStudents");

const adminNameInput = document.getElementById("adminProjectName");
const adminTypeInput = document.getElementById("adminProjectType");
const adminYearInput = document.getElementById("adminProjectYear");
const adminMentorInput = document.getElementById("adminProjectMentor");
const adminShortDescriptionInput = document.getElementById(
  "adminProjectShortDescription"
);
const adminProtectedInput = document.getElementById("adminProjectProtected");
const adminPhotoFileInput = document.getElementById("adminProjectPhotoFile");
const adminPdfFileInput = document.getElementById("adminProjectPdfFile");
const adminPhotoStatus = document.getElementById("adminProjectPhotoStatus");
const adminPdfStatus = document.getElementById("adminProjectPdfStatus");
const adminRemovePhotoInput = document.getElementById("adminRemoveProjectPhoto");
const adminRemovePdfInput = document.getElementById("adminRemoveProjectPdf");
const adminTeamNamesInput = document.getElementById("adminProjectTeamNames");
const adminSaveButton = document.getElementById("adminSaveButton");
const adminCancelButton = document.getElementById("adminCancelButton");
const adminDeleteButton = document.getElementById("adminDeleteButton");

const state = {
  search: "",
  types: new Set(),
  years: new Set(),
};

let currentProjectId = null;
let currentTeamNames = [];
let draftTeamStudents = {};
let activeModalRequestId = 0;
let currentProjectPhotoUrl = "";
let currentProjectPdfUrl = "";
let selectedPhotoPreviewUrl = "";
let selectedPdfPreviewUrl = "";

const deepClone = (value) => JSON.parse(JSON.stringify(value));

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

function normalizeProjectType(type) {
  const raw = String(type || "").trim().toUpperCase();
  if (raw === "MP2" || raw.endsWith("2")) {
    return PROJECT_TYPE_MP2;
  }
  return PROJECT_TYPE_MP1;
}

function isProjectTypeMp2(type) {
  return normalizeProjectType(type) === PROJECT_TYPE_MP2;
}

function getProjectPhotoUrl(payload) {
  return (
    payload?.imageUrl || payload?.photo_src || payload?.photoSrc || ""
  );
}

function getProjectPdfUrl(payload) {
  return payload?.pdfUrl || payload?.pdf_src || payload?.pdfSrc || "";
}

function getProjectProtected(payload) {
  return Boolean(payload?.protected);
}

function getProjectTeamNames(payload) {
  if (!Array.isArray(payload?.teamNames)) return [];

  return payload.teamNames
    .map((team) => (typeof team === "string" ? team : team?.name))
    .filter(Boolean);
}

function revokePreviewUrl(url) {
  if (url) {
    URL.revokeObjectURL(url);
  }
}

function resetDocumentDraft() {
  revokePreviewUrl(selectedPhotoPreviewUrl);
  revokePreviewUrl(selectedPdfPreviewUrl);
  selectedPhotoPreviewUrl = "";
  selectedPdfPreviewUrl = "";

  currentProjectPhotoUrl = "";
  currentProjectPdfUrl = "";

  if (adminPhotoFileInput) {
    adminPhotoFileInput.value = "";
  }
  if (adminPdfFileInput) {
    adminPdfFileInput.value = "";
  }
  if (adminRemovePhotoInput) {
    adminRemovePhotoInput.checked = false;
  }
  if (adminRemovePdfInput) {
    adminRemovePdfInput.checked = false;
  }
}

function updatePhotoStatus() {
  if (!adminPhotoStatus) return;

  const selectedPhoto = adminPhotoFileInput?.files?.[0];
  if (selectedPhoto) {
    adminPhotoStatus.textContent = `Р’С‹Р±СЂР°РЅ С„Р°Р№Р»: ${selectedPhoto.name}`;
    return;
  }

  if (adminRemovePhotoInput?.checked) {
    adminPhotoStatus.textContent = "Р¤РѕС‚Рѕ Р±СѓРґРµС‚ СѓРґР°Р»РµРЅРѕ РїСЂРё СЃРѕС…СЂР°РЅРµРЅРёРё";
    return;
  }

  if (currentProjectPhotoUrl) {
    adminPhotoStatus.textContent = "Р—Р°РіСЂСѓР¶РµРЅРѕ С‚РµРєСѓС‰РµРµ С„РѕС‚Рѕ РїСЂРѕРµРєС‚Р°";
    return;
  }

  adminPhotoStatus.textContent = "Р¤РѕС‚Рѕ РЅРµ Р·Р°РіСЂСѓР¶РµРЅРѕ";
}

function updatePdfStatus() {
  if (!adminPdfStatus) return;

  const selectedPdf = adminPdfFileInput?.files?.[0];
  if (selectedPdf) {
    adminPdfStatus.textContent = `Р’С‹Р±СЂР°РЅ С„Р°Р№Р»: ${selectedPdf.name}`;
    return;
  }

  if (adminRemovePdfInput?.checked) {
    adminPdfStatus.textContent = "PDF Р±СѓРґРµС‚ СѓРґР°Р»РµРЅ РїСЂРё СЃРѕС…СЂР°РЅРµРЅРёРё";
    return;
  }

  if (currentProjectPdfUrl) {
    adminPdfStatus.textContent = "Р—Р°РіСЂСѓР¶РµРЅ С‚РµРєСѓС‰РёР№ PDF РїСЂРѕРµРєС‚Р°";
    return;
  }

  adminPdfStatus.textContent = "PDF РЅРµ Р·Р°РіСЂСѓР¶РµРЅ";
}

function loadProjects() {
  return DataStore.loadProjects();
}

function loadTeamStudents(teamName) {
  return DataStore.loadTeamStudents(teamName)
    .then((students) => deepClone(students || []))
    .catch(() => []);
}

function getDisplayYears(project) {
  if (project.year == null || project.year === "") return "";

  const startYear = Number(project.year);

  if (!Number.isFinite(startYear)) return "";

  if (isProjectTypeMp2(project.type)) {
    const endYear = startYear + 1;
    return `${startYear}вЂ“${endYear}`;
  }

  return String(startYear);
}

function parseYearRangeLabel(label) {
  if (label == null) return null;

  const raw = String(label).trim();
  if (!raw) return null;

  const parts = raw
    .split(/[-вЂ“]/)
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
      '<h2 class="project-title">Р—Р°РіСЂСѓР·РєР° РїСЂРѕРµРєС‚РѕРІ...</h2>' +
      "</div>" +
      '<p class="project-description">РџРѕР¶Р°Р»СѓР№СЃС‚Р°, РїРѕРґРѕР¶РґРёС‚Рµ.</p>' +
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

  const addCardHtml =
    '<button class="project-card admin-add-card" id="adminAddProjectButton" type="button" aria-label="Р”РѕР±Р°РІРёС‚СЊ РїСЂРѕРµРєС‚">' +
    '<span class="admin-add-card__icon" aria-hidden="true">+</span>' +
    "</button>";

  if (filtered.length === 0) {
    cardsContainer.innerHTML =
      addCardHtml +
      '<article class="project-card">' +
      '<div class="project-card-header">' +
      '<h2 class="project-title">РќРµС‚ РїСЂРѕРµРєС‚РѕРІ</h2>' +
      "</div>" +
      '<p class="project-description">РџРѕРїСЂРѕР±СѓР№С‚Рµ РёР·РјРµРЅРёС‚СЊ РїР°СЂР°РјРµС‚СЂС‹ РїРѕРёСЃРєР° РёР»Рё С„РёР»СЊС‚СЂС‹.</p>' +
      "</article>";
    bindAddProjectButton();
    return;
  }

  const html =
    addCardHtml +
    filtered
      .map((project) => {
      const mentorHtml = project.mentor
        ? '<div class="project-meta project-mentor">РќР°СЃС‚Р°РІРЅРёРє: ' +
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
              Р“РѕРґС‹ СЂРµР°Р»РёР·Р°С†РёРё: ${getDisplayYears(project)}
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
  bindAddProjectButton();
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
    const raw = button.dataset.value; // РЅР°РїСЂРёРјРµСЂ "2024вЂ“2025"

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

function renderTeamStudentsPlaceholder(message) {
  if (!modalStudentsList) return;

  modalStudentsList.innerHTML =
    '<li class="project-modal__student project-modal__student--empty">' +
    message +
    "</li>";
}

function renderTeamStudentsEditor() {
  if (!modalStudentsList) return;

  if (currentTeamNames.length === 0) {
    renderTeamStudentsPlaceholder("РРЅС„РѕСЂРјР°С†РёСЏ Рѕ РєРѕРјР°РЅРґР°С… РїРѕСЏРІРёС‚СЃСЏ РїРѕР·Р¶Рµ.");
    return;
  }

  const items = [];

  currentTeamNames.forEach((teamName) => {
    const teamKey = encodeURIComponent(teamName);
    const students = draftTeamStudents[teamName] || [];

    items.push(`
      <li class="project-modal__team-group-title">
        <div class="admin-team-actions">
          <span>РљРѕРјР°РЅРґР°: ${escapeHtml(teamName)}</span>
          <button class="admin-small-button" data-action="add-student" data-team="${teamKey}">
            + РЎС‚СѓРґРµРЅС‚
          </button>
        </div>
      </li>
    `);

    if (students.length === 0) {
      items.push(
        '<li class="project-modal__student project-modal__student--empty">РќРµС‚ РґР°РЅРЅС‹С… РїРѕ СЃС‚СѓРґРµРЅС‚Р°Рј.</li>'
      );
      return;
    }

    students.forEach((student, index) => {
      items.push(`
        <li class="project-modal__student admin-student-row" data-team="${teamKey}" data-index="${index}">
          <input
            class="admin-input admin-student-input"
            data-field="name"
            type="text"
            placeholder="РРјСЏ"
            value="${escapeHtml(student.name)}"
          />
          <input
            class="admin-input admin-student-input"
            data-field="role"
            type="text"
            placeholder="Р РѕР»СЊ"
            value="${escapeHtml(student.role)}"
          />
          <input
            class="admin-input admin-student-input"
            data-field="photoUrl"
            type="text"
            placeholder="Р¤РѕС‚Рѕ URL"
            value="${escapeHtml(student.photoUrl)}"
          />
          <button
            class="admin-small-button"
            data-action="remove-student"
            data-team="${teamKey}"
            data-index="${index}"
          >
            РЈРґР°Р»РёС‚СЊ
          </button>
        </li>
      `);
    });
  });

  modalStudentsList.innerHTML = items.join("");
}

function getDefaultTypeFromFilters() {
  if (state.types.size === 1) {
    return normalizeProjectType(Array.from(state.types)[0]);
  }
  return PROJECT_TYPE_MP1;
}

function getDefaultYearFromFilters() {
  if (state.years.size === 1) {
    const label = Array.from(state.years)[0];
    const range = parseYearRangeLabel(label);
    return range ? range.start : "";
  }
  return "";
}

async function createProject() {
  const defaultType = getDefaultTypeFromFilters();
  const defaultYear = getDefaultYearFromFilters();

  const newProject = await DataStore.createProject({
    name: "РќРѕРІС‹Р№ РїСЂРѕРµРєС‚",
    type: defaultType,
    year: defaultYear || 2016,
    description: "Р’РІРµРґРёС‚Рµ РєСЂР°С‚РєРѕРµ РѕРїРёСЃР°РЅРёРµ РїСЂРѕРµРєС‚Р°",
    protected: false,
    mentor: "",
    slug: "slug",
  });

  projects.push(newProject);

  return newProject.id;
}

async function handleAddProjectClick() {
  resetFiltersForNewProject();
  try {
    const newProjectId = await createProject();
    renderProjects();
    openProjectModal(newProjectId);
  } catch (error) {
    console.error("РћС€РёР±РєР° СЃРѕР·РґР°РЅРёСЏ РїСЂРѕРµРєС‚Р°:", error);
    alert("РќРµ СѓРґР°Р»РѕСЃСЊ СЃРѕР·РґР°С‚СЊ РїСЂРѕРµРєС‚. РџРѕРїСЂРѕР±СѓР№С‚Рµ РµС‰С‘ СЂР°Р·.");
  }
}

function bindAddProjectButton() {
  const button = document.getElementById("adminAddProjectButton");
  if (!button) return;
  button.onclick = handleAddProjectClick;
}

function resetFiltersForNewProject() {
  state.search = "";
  state.types.clear();
  state.years.clear();
  searchInput.value = "";

  filterButtons.forEach((button) => {
    button.classList.remove("active");
  });
}

function normalizeTeamNames(raw) {
  const list = String(raw || "")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);

  return Array.from(new Set(list));
}

function syncTeamNamesFromInput() {
  currentTeamNames = normalizeTeamNames(adminTeamNamesInput.value);
}

function loadTeamsData(teamNames, requestId) {
  if (teamNames.length === 0) {
    renderTeamStudentsPlaceholder("РРЅС„РѕСЂРјР°С†РёСЏ Рѕ РєРѕРјР°РЅРґР°С… РїРѕСЏРІРёС‚СЃСЏ РїРѕР·Р¶Рµ.");
    return;
  }

  renderTeamStudentsPlaceholder("Р—Р°РіСЂСѓР·РєР° СЃРїРёСЃРєР° СЃС‚СѓРґРµРЅС‚РѕРІ...");

  Promise.all(
    teamNames.map((teamName) => {
      if (draftTeamStudents[teamName]) {
        return Promise.resolve({
          teamName,
          students: draftTeamStudents[teamName],
        });
      }

      return loadTeamStudents(teamName).then((students) => ({
        teamName,
        students,
      }));
    })
  ).then((groups) => {
    if (requestId !== activeModalRequestId) return;

    draftTeamStudents = {};
    groups.forEach(({ teamName, students }) => {
      draftTeamStudents[teamName] = deepClone(students);
    });

    renderTeamStudentsEditor();
  });
}

function updateImagePreview() {
  const imageUrl =
    selectedPhotoPreviewUrl ||
    (adminRemovePhotoInput?.checked ? "" : currentProjectPhotoUrl);
  modalImage.src = imageUrl || DEFAULT_PROJECT_IMAGE_URL;
  modalImage.alt = adminNameInput.value.trim() || "Изображение проекта";
  updatePhotoStatus();
}

function updatePdfPreview() {
  const pdfUrl =
    selectedPdfPreviewUrl || (adminRemovePdfInput?.checked ? "" : currentProjectPdfUrl);

  if (pdfUrl) {
    modalPdfLink.href = pdfUrl;
    modalPdfLink.style.display = "";
  } else {
    modalPdfLink.removeAttribute("href");
    modalPdfLink.style.display = "none";
  }

  updatePdfStatus();
}

function handlePhotoFileChange() {
  revokePreviewUrl(selectedPhotoPreviewUrl);
  selectedPhotoPreviewUrl = "";

  const selectedPhoto = adminPhotoFileInput?.files?.[0];
  if (selectedPhoto) {
    selectedPhotoPreviewUrl = URL.createObjectURL(selectedPhoto);
    if (adminRemovePhotoInput) {
      adminRemovePhotoInput.checked = false;
    }
  }

  updateImagePreview();
}

function handlePdfFileChange() {
  revokePreviewUrl(selectedPdfPreviewUrl);
  selectedPdfPreviewUrl = "";

  const selectedPdf = adminPdfFileInput?.files?.[0];
  if (selectedPdf) {
    selectedPdfPreviewUrl = URL.createObjectURL(selectedPdf);
    if (adminRemovePdfInput) {
      adminRemovePdfInput.checked = false;
    }
  }

  updatePdfPreview();
}

function handleRemovePhotoToggle() {
  if (adminRemovePhotoInput?.checked && adminPhotoFileInput) {
    adminPhotoFileInput.value = "";
    revokePreviewUrl(selectedPhotoPreviewUrl);
    selectedPhotoPreviewUrl = "";
  }

  updateImagePreview();
}

function handleRemovePdfToggle() {
  if (adminRemovePdfInput?.checked && adminPdfFileInput) {
    adminPdfFileInput.value = "";
    revokePreviewUrl(selectedPdfPreviewUrl);
    selectedPdfPreviewUrl = "";
  }

  updatePdfPreview();
}

function openProjectModal(projectId) {
  const requestId = (activeModalRequestId += 1);

  const base = projects.find((item) => item.id === projectId);
  if (!base) return;

  currentProjectId = projectId;

  resetDocumentDraft();

  adminNameInput.value = base.name || "";
  adminTypeInput.value = normalizeProjectType(base.type);
  adminYearInput.value = base.year ?? "";
  adminMentorInput.value = base.mentor || "";
  adminShortDescriptionInput.value = base.description || "";
  if (adminProtectedInput) {
    adminProtectedInput.checked = getProjectProtected(base);
  }

  modalDescription.value = base.description || "";
  adminTeamNamesInput.value = "";

  currentProjectPhotoUrl = getProjectPhotoUrl(base);
  currentProjectPdfUrl = getProjectPdfUrl(base);

  updateImagePreview();
  updatePdfPreview();

  draftTeamStudents = {};
  syncTeamNamesFromInput();
  renderTeamStudentsPlaceholder("Загрузка списка студентов...");

  modalBackdrop.classList.add("is-open");
  modalBackdrop.setAttribute("aria-hidden", "false");

  DataStore.loadProjectDetails(projectId)
    .then((details) => {
      if (requestId !== activeModalRequestId) return;

      modalDescription.value =
        details.fullDescription || details.full_description || base.description || "";

      currentProjectPhotoUrl = getProjectPhotoUrl(details);
      currentProjectPdfUrl = getProjectPdfUrl(details);

      if (adminProtectedInput && typeof details?.protected === "boolean") {
        adminProtectedInput.checked = details.protected;
      }

      const detailTeamNames = getProjectTeamNames(details);
      adminTeamNamesInput.value = detailTeamNames.join(", ");

      updateImagePreview();
      updatePdfPreview();

      draftTeamStudents = {};
      syncTeamNamesFromInput();
      loadTeamsData(currentTeamNames, requestId);
    })
    .catch((error) => {
      console.error("Ошибка загрузки деталей проекта:", error);
      renderTeamStudentsPlaceholder("Не удалось загрузить данные.");
    });
}

function closeProjectModal() {
  modalBackdrop.classList.remove("is-open");
  modalBackdrop.setAttribute("aria-hidden", "true");
  currentProjectId = null;
  currentTeamNames = [];
  draftTeamStudents = {};
  resetDocumentDraft();
}

async function saveCurrentProject() {
  if (currentProjectId == null) return;

  const projectIndex = projects.findIndex(
    (item) => item.id === currentProjectId
  );
  if (projectIndex === -1) return;

  syncTeamNamesFromInput();

  const yearValue = Number(adminYearInput.value);
  const normalizedYear = Number.isFinite(yearValue) ? yearValue : null;

  const updatedProject = {
    ...projects[projectIndex],
    name: adminNameInput.value.trim() || "Без названия",
    type: normalizeProjectType(adminTypeInput.value),
    protected: Boolean(adminProtectedInput?.checked),
    year: normalizedYear,
    description: adminShortDescriptionInput.value.trim(),
    mentor: adminMentorInput.value.trim(),
    full_description: modalDescription.value.trim(),
  };

  const photoFile = adminPhotoFileInput?.files?.[0] || null;
  const pdfFile = adminPdfFileInput?.files?.[0] || null;
  const removePhoto = Boolean(adminRemovePhotoInput?.checked);
  const removePdf = Boolean(adminRemovePdfInput?.checked);
  const shouldUpdateDocuments = Boolean(
    photoFile || pdfFile || removePhoto || removePdf
  );

  try {
    const savedProject = await DataStore.updateProject(
      currentProjectId,
      updatedProject
    );
    projects[projectIndex] = savedProject || updatedProject;

    if (shouldUpdateDocuments) {
      await DataStore.updateProjectDocuments(currentProjectId, {
        photoFile,
        pdfFile,
        removePhoto,
        removePdf,
      });
    }

    await Promise.all(
      currentTeamNames.map((teamName) => {
        const students = draftTeamStudents[teamName] || [];
        return DataStore.updateTeamStudents(teamName, students);
      })
    );

    closeProjectModal();
    renderProjects();
  } catch (error) {
    console.error("Ошибка сохранения проекта:", error);
    alert("Не удалось сохранить проект. Попробуйте ещё раз.");
  }
}

async function deleteCurrentProject() {
  if (currentProjectId == null) return;

  const projectToDelete = projects.find((item) => item.id === currentProjectId);
  const projectName = projectToDelete?.name?.trim() || "СЌС‚РѕС‚ РїСЂРѕРµРєС‚";

  const isConfirmed = window.confirm(
    `РЈРґР°Р»РёС‚СЊ РїСЂРѕРµРєС‚ "${projectName}"? Р­С‚Рѕ РґРµР№СЃС‚РІРёРµ РЅРµР»СЊР·СЏ РѕС‚РјРµРЅРёС‚СЊ.`
  );

  if (!isConfirmed) return;

  const projectId = currentProjectId;

  try {
    await DataStore.deleteProject(projectId);
    projects = projects.filter((item) => item.id !== projectId);
    closeProjectModal();
    renderProjects();
  } catch (error) {
    console.error("РћС€РёР±РєР° СѓРґР°Р»РµРЅРёСЏ РїСЂРѕРµРєС‚Р°:", error);
    alert("РќРµ СѓРґР°Р»РѕСЃСЊ СѓРґР°Р»РёС‚СЊ РїСЂРѕРµРєС‚. РџРѕРїСЂРѕР±СѓР№С‚Рµ РµС‰С‘ СЂР°Р·.");
  }
}

function handleStudentListClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const action = button.dataset.action;
  const teamName = decodeURIComponent(button.dataset.team || "");

  if (!teamName) return;

  if (action === "add-student") {
    if (!draftTeamStudents[teamName]) {
      draftTeamStudents[teamName] = [];
    }
    draftTeamStudents[teamName].push({
      name: "",
      role: "",
      photoUrl: "",
    });
    renderTeamStudentsEditor();
  }

  if (action === "remove-student") {
    const index = Number(button.dataset.index);
    if (!Number.isFinite(index)) return;
    if (!draftTeamStudents[teamName]) return;
    draftTeamStudents[teamName].splice(index, 1);
    renderTeamStudentsEditor();
  }
}

function handleStudentInput(event) {
  const field = event.target.dataset.field;
  if (!field) return;

  const row = event.target.closest(".admin-student-row");
  if (!row) return;

  const teamName = decodeURIComponent(row.dataset.team || "");
  const index = Number(row.dataset.index);
  if (!teamName || !Number.isFinite(index)) return;

  if (!draftTeamStudents[teamName] || !draftTeamStudents[teamName][index]) {
    return;
  }

  draftTeamStudents[teamName][index][field] = event.target.value;
}

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

  if (adminSaveButton) {
    adminSaveButton.addEventListener("click", saveCurrentProject);
  }

  if (adminCancelButton) {
    adminCancelButton.addEventListener("click", closeProjectModal);
  }

  if (adminDeleteButton) {
    adminDeleteButton.addEventListener("click", deleteCurrentProject);
  }


  if (modalStudentsList) {
    modalStudentsList.addEventListener("click", handleStudentListClick);
    modalStudentsList.addEventListener("input", handleStudentInput);
  }

  if (adminTeamNamesInput) {
  adminTeamNamesInput.addEventListener("change", () => {
    const nextTeamNames = normalizeTeamNames(adminTeamNamesInput.value);
    const sameNames =
      nextTeamNames.length === currentTeamNames.length &&
      nextTeamNames.every((name, index) => name === currentTeamNames[index]);

    if (sameNames) return;

    currentTeamNames = nextTeamNames;
    const requestId = (activeModalRequestId += 1);
    loadTeamsData(currentTeamNames, requestId);
  });
  }

  if (adminPhotoFileInput) {
    adminPhotoFileInput.addEventListener("change", handlePhotoFileChange);
  }

  if (adminPdfFileInput) {
    adminPdfFileInput.addEventListener("change", handlePdfFileChange);
  }

  if (adminRemovePhotoInput) {
    adminRemovePhotoInput.addEventListener("change", handleRemovePhotoToggle);
  }

  if (adminRemovePdfInput) {
    adminRemovePdfInput.addEventListener("change", handleRemovePdfToggle);
  }

  if (adminNameInput) {
    adminNameInput.addEventListener("input", updateImagePreview);
  }

  loadProjects()
    .then((loadedProjects) => {
      projects = loadedProjects;
      projectsLoaded = true;
      renderProjects();
    })
    .catch((error) => {
      console.error("РћС€РёР±РєР° Р·Р°РіСЂСѓР·РєРё СЃРїРёСЃРєР° РїСЂРѕРµРєС‚РѕРІ:", error);
      projects = [];
      projectsLoaded = true;
      const addCardHtml =
        '<button class="project-card admin-add-card" id="adminAddProjectButton" type="button" aria-label="Р”РѕР±Р°РІРёС‚СЊ РїСЂРѕРµРєС‚">' +
        '<span class="admin-add-card__icon" aria-hidden="true">+</span>' +
        "</button>";
      cardsContainer.innerHTML =
        addCardHtml +
        '<article class="project-card">' +
        '<div class="project-card-header">' +
        '<h2 class="project-title">РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ РїСЂРѕРµРєС‚С‹</h2>' +
        "</div>" +
        '<p class="project-description">РџСЂРѕРІРµСЂСЊС‚Рµ РґРѕСЃС‚СѓРїРЅРѕСЃС‚СЊ API Рё РѕР±РЅРѕРІРёС‚Рµ СЃС‚СЂР°РЅРёС†Сѓ.</p>' +
        "</article>";
      bindAddProjectButton();
    });
}

init();


