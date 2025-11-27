const projects = [
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

const cardsContainer = document.getElementById("cardsContainer");
const searchInput = document.getElementById("searchInput");
const filterButtons = document.querySelectorAll(".filter-button");

const state = {
  search: "",
  types: new Set(),
  years: new Set(),
};

function renderProjects() {
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
      '<div class="project-card"><div class="project-card-header"><div class="project-title">Нет проектов</div></div><p class="project-description">Попробуйте изменить параметры поиска или фильтры.</p></div>';
    return;
  }

  const html = filtered
    .map(
      (project) => `
        <article class="project-card">
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

filterButtons.forEach((button) => {
  button.addEventListener("click", () => toggleFilter(button));
});

searchInput.addEventListener("input", (event) => {
  state.search = event.target.value;
  renderProjects();
});

renderProjects();
