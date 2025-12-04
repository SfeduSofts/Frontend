let projects = [];
let projectsLoaded = false;

/**
 * Simulation of loading a list of projects from the backend.
 *
 *   async function loadProjects() {
 *     const res = await fetch('/api/projects');
 *     if (!res.ok) throw new Error('Failed to load projects');
 *     return await res.json();
 *   }
 */
function loadProjects() {
  const mockProjects = [
    {
      id: 1,
      name: "VR-лаборатория для школьников",
      type: "МП1",
      years: "2024–2025",
      description: "Обучающая среда с интерактивными экспериментами по физике.",
    },
    {
      id: 2,
      name: "Сервис мониторинга учебной нагрузки",
      type: "МП2",
      years: "2024–2025",
      description: "Веб-панель для студентов и преподавателей с аналитикой.",
    },
    {
      id: 3,
      name: "Мобильное приложение «Кампус+»",
      type: "МП1",
      years: "2025–2026",
      description: "Навигация по корпусам, расписание и уведомления.",
    },
    {
      id: 4,
      name: "Платформа для проектных команд",
      type: "МП2",
      years: "2025–2026",
      description: "Таск-менеджер, доски задач и интеграция с календарями.",
    },
    {
      id: 5,
      name: "Геймифицированный курс по алгоритмам",
      type: "МП1",
      years: "2024–2025",
      description: "Квест с уровнями сложности и системой достижений.",
    },
    {
      id: 6,
      name: "Система бронирования аудиторий",
      type: "МП2",
      years: "2024–2025",
      description: "Интерфейс для брони помещений и оборудования.",
    },
    {
      id: 7,
      name: "VR-тур по музею университета",
      type: "МП1",
      years: "2025–2026",
      description: "Интерактивные экспозиции с комментариями кураторов.",
    },
    {
      id: 8,
      name: "Аналитика посещаемости мероприятий",
      type: "МП2",
      years: "2025–2026",
      description: "Сбор данных по событиям, отчёты и дашборды.",
    },
  ];

  return Promise.resolve(mockProjects);
}

const cardsContainer = document.getElementById("cardsContainer");
const searchInput = document.getElementById("searchInput");
const filterButtons = document.querySelectorAll(".filter-button");

const modalBackdrop = document.getElementById("projectModal");
const modalTitle = document.getElementById("projectModalTitle");
const modalImage = document.getElementById("projectModalImage");
const modalDescription = document.getElementById("projectModalDescription");
const modalPdfLink = document.getElementById("projectModalPdf");
const modalStudentsList = document.getElementById("projectModalStudents");
const modalCloseButton = document.querySelector(".project-modal__close");

const state = {
  search: "",
  types: new Set(),
  years: new Set(),
};

const mockProjectDetails = {
  1: {
    imageUrl: "images/projects/vr-lab.jpg",
    fullDescription:
      "Подробное описание проекта VR-лаборатория для школьников. " +
      "Виртуальные стенды, безопасные эксперименты и сценарии уроков для учителей.",
    pdfUrl: "pdf/vr-lab.pdf",
    students: [
      {
        name: "Иван Иванов",
        role: "Тимлид, разработчик VR",
        photoUrl: "images/students/ivanov.jpg",
      },
      {
        name: "Анна Петрова",
        role: "Дизайнер интерфейса и 3D-моделей",
        photoUrl: "images/students/petrova.jpg",
      },
    ],
  },
  2: {
    imageUrl: "images/projects/load-monitoring.jpg",
    fullDescription:
      "Сервис мониторинга учебной нагрузки: сбор расписаний, визуализация " +
      "нагрузки по неделям, уведомления о перегрузках и отчёты для кураторов.",
    pdfUrl: "pdf/load-monitoring.pdf",
    students: [
      {
        name: "Олег Смирнов",
        role: "Back-end разработчик",
        photoUrl: "images/students/smirnov.jpg",
      },
      {
        name: "Мария Кузнецова",
        role: "Front-end разработчик",
        photoUrl: "images/students/kuznetsova.jpg",
      },
    ],
  },
  3: {
    imageUrl: "images/projects/campus-plus.jpg",
    fullDescription:
      "Мобильное приложение «Кампус+» объединяет расписание, навигацию по корпусам, " +
      "пуш-уведомления и личный кабинет студента.",
    pdfUrl: "pdf/campus-plus.pdf",
    students: [
      {
        name: "Дмитрий Соколов",
        role: "Android-разработчик",
        photoUrl: "images/students/sokolov.jpg",
      },
      {
        name: "Елена Иванова",
        role: "Аналитик, UX-исследователь",
        photoUrl: "images/students/ivanova-e.jpg",
      },
    ],
  },
  4: {
    imageUrl: "images/projects/team-platform.jpg",
    fullDescription:
      "Платформа для проектных команд: доски задач, трекинг статусов, интеграция с календарями и чат.",
    pdfUrl: "pdf/team-platform.pdf",
    students: [
      {
        name: "Кирилл Волков",
        role: "Full-stack разработчик",
        photoUrl: "images/students/volkov.jpg",
      },
    ],
  },
  5: {
    imageUrl: "images/projects/algorithms-game.jpg",
    fullDescription:
      "Геймифицированный курс по алгоритмам: уровни сложности, система достижений, " +
      "лидерборды и внутриигровые задания.",
    pdfUrl: "pdf/algorithms-course.pdf",
    students: [
      {
        name: "Алексей Орлов",
        role: "Разработчик игрового ядра",
        photoUrl: "images/students/orlov.jpg",
      },
    ],
  },
  6: {
    imageUrl: "images/projects/room-booking.jpg",
    fullDescription:
      "Система бронирования аудиторий: поиск свободных помещений, " +
      "бронь по времени и типу оборудования, отчёты по использованию.",
    pdfUrl: "pdf/room-booking.pdf",
    students: [
      {
        name: "Светлана Морозова",
        role: "Back-end разработчик",
        photoUrl: "images/students/morozova.jpg",
      },
    ],
  },
  7: {
    imageUrl: "images/projects/vr-museum.jpg",
    fullDescription:
      "VR-тур по музею университета: интерактивные экспозиции, голосовые комментарии, " +
      "режим экскурсии и свободного исследования.",
    pdfUrl: "pdf/vr-museum.pdf",
    students: [
      {
        name: "Павел Федоров",
        role: "VR-разработчик",
        photoUrl: "images/students/fedorov.jpg",
      },
    ],
  },
  8: {
    imageUrl: "images/projects/events-analytics.jpg",
    fullDescription:
      "Аналитика посещаемости мероприятий: сбор данных с регистраций, " +
      "дашборды по посещаемости и вовлечённости студентов.",
    pdfUrl: "pdf/events-analytics.pdf",
    students: [
      {
        name: "Ирина Алексеева",
        role: "Аналитик данных",
        photoUrl: "images/students/alekseeva.jpg",
      },
    ],
  },
};

/**
 * Simulation of uploading project details from the backend.
 *
 *   async function loadProjectDetails(id) {
 *     const res = await fetch(`/api/projects/${id}`);
 *     if (!res.ok) throw new Error('Failed to load project');
 *     return await res.json();
 *   }
 */
function loadProjectDetails(projectId) {
  const base = projects.find((p) => p.id === projectId);

  const detailed = {
    ...base,
    ...(mockProjectDetails[projectId] || {}),
  };

  return Promise.resolve(detailed);
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
    const matchYear = state.years.size === 0 || state.years.has(project.years);
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
    .map(
      (project) => `
        <article class="project-card" data-project-id="${project.id}">
            <div class="project-card-header">
                <h2 class="project-title">${project.name}</h2>
                <span class="project-type-badge">${project.type}</span>
            </div>
            <div class="project-meta">Годы реализации: ${project.years}</div>
            <p class="project-description">${project.description}</p>
        </article>
    `
    )
    .join("");

  cardsContainer.innerHTML = html;

  attachCardClickHandlers();
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
  const value = button.dataset.value;

  if (filterType === "type") {
    if (state.types.has(value)) {
      state.types.delete(value);
      button.classList.remove("active");
    } else {
      state.types.add(value);
      button.classList.add("active");
    }
  }

  if (filterType === "year") {
    if (state.years.has(value)) {
      state.years.delete(value);
      button.classList.remove("active");
    } else {
      state.years.add(value);
      button.classList.add("active");
    }
  }

  renderProjects();
}

function openProjectModal(projectId) {
  loadProjectDetails(projectId)
    .then((project) => {
      if (!project) return;

      modalTitle.textContent = project.name || "Проект";

      if (project.imageUrl) {
        modalImage.src = project.imageUrl;
        modalImage.alt = project.name || "Изображение проекта";
      } else {
        modalImage.src = "";
        modalImage.alt = "";
      }

      modalDescription.textContent =
        project.fullDescription || project.description || "";

      if (project.pdfUrl) {
        modalPdfLink.href = project.pdfUrl;
        modalPdfLink.style.display = "";
      } else {
        modalPdfLink.removeAttribute("href");
        modalPdfLink.style.display = "none";
      }

      if (Array.isArray(project.students) && project.students.length > 0) {
        const studentsHtml = project.students
          .map((student) => {
            const initial =
              (student.name && student.name.trim().charAt(0).toUpperCase()) ||
              "?";

            return `
              <li class="project-modal__student">
                <div class="project-modal__student-photo-wrapper">
                  ${
                    student.photoUrl
                      ? `<img src="${student.photoUrl}" alt="${student.name}" class="project-modal__student-photo">`
                      : `<div class="project-modal__student-placeholder">${initial}</div>`
                  }
                </div>
                <div class="project-modal__student-info">
                  <div class="project-modal__student-name">${student.name}</div>
                  <div class="project-modal__student-role">${student.role}</div>
                </div>
              </li>
            `;
          })
          .join("");

        modalStudentsList.innerHTML = studentsHtml;
      } else {
        modalStudentsList.innerHTML =
          '<li class="project-modal__student project-modal__student--empty">' +
          "Информация о команде появится позже." +
          "</li>";
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

if (modalCloseButton) {
  modalCloseButton.addEventListener("click", closeProjectModal);
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
  filterButtons.forEach((button) => {
    button.addEventListener("click", () => toggleFilter(button));
  });

  searchInput.addEventListener("input", (event) => {
    state.search = event.target.value;
    renderProjects();
  });

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
