const adminForm = document.getElementById("adminForm");
const adminEmailInput = document.getElementById("adminEmail");
const adminSubmitButton = document.getElementById("adminSubmitButton");
const adminStatus = document.getElementById("adminStatus");
const adminsList = document.getElementById("adminsList");

let admins = [];

function setStatus(message, isError = false) {
  if (!adminStatus) return;

  adminStatus.textContent = message || "";
  adminStatus.classList.toggle("is-error", Boolean(isError));
}

function isAccessError(error) {
  return error?.status === 401 || error?.status === 403;
}

function renderAdmins() {
  if (!adminsList) return;

  if (admins.length === 0) {
    adminsList.innerHTML = '<li class="auth-empty">Админы пока не добавлены.</li>';
    return;
  }

  adminsList.innerHTML = admins
    .map((admin) => {
      const email = String(admin?.email || "").trim();
      const encodedEmail = encodeURIComponent(email);

      return `
        <li class="auth-list-item">
          <span class="auth-list-email">${email}</span>
          <button
            class="auth-danger-button"
            type="button"
            data-email="${encodedEmail}"
          >
            Удалить
          </button>
        </li>
      `;
    })
    .join("");
}

function lockAdminForm() {
  if (adminEmailInput) {
    adminEmailInput.disabled = true;
  }

  if (adminSubmitButton) {
    adminSubmitButton.disabled = true;
  }
}

async function loadAdmins() {
  setStatus("Загрузка списка...");

  try {
    admins = await DataStore.loadAdmins({ redirectOnUnauthorized: false });
    renderAdmins();
    setStatus("");
  } catch (error) {
    console.error("Ошибка загрузки админов:", error);

    if (isAccessError(error)) {
      admins = [];
      if (adminsList) {
        adminsList.innerHTML = "";
      }
      lockAdminForm();
      setStatus(
        "Недостаточно прав. Войдите под учетной записью главного админа.",
        true,
      );
      return;
    }

    setStatus("Не удалось загрузить список админов.", true);
  }
}

async function handleAdminSubmit(event) {
  event.preventDefault();

  const email = String(adminEmailInput?.value || "")
    .trim()
    .toLowerCase();

  if (!email) {
    setStatus("Введите почту.", true);
    return;
  }

  if (adminSubmitButton) {
    adminSubmitButton.disabled = true;
  }

  try {
    await DataStore.createAdmin(email, { redirectOnUnauthorized: false });
    if (adminEmailInput) {
      adminEmailInput.value = "";
    }
    setStatus("Админ добавлен.");
    await loadAdmins();
  } catch (error) {
    console.error("Ошибка добавления админа:", error);
    setStatus(error?.message || "Не удалось добавить админа.", true);
  } finally {
    if (adminSubmitButton && !adminEmailInput?.disabled) {
      adminSubmitButton.disabled = false;
    }
  }
}

async function handleAdminDelete(event) {
  const button = event.target.closest("button[data-email]");
  if (!button) return;

  const email = decodeURIComponent(button.dataset.email || "");
  if (!email) return;

  const confirmed = window.confirm(`Удалить доступ для ${email}?`);
  if (!confirmed) return;

  button.disabled = true;

  try {
    await DataStore.deleteAdmin(email, { redirectOnUnauthorized: false });
    admins = admins.filter((admin) => admin?.email !== email);
    renderAdmins();
    setStatus("Админ удален.");
  } catch (error) {
    console.error("Ошибка удаления админа:", error);
    setStatus(error?.message || "Не удалось удалить админа.", true);
    button.disabled = false;
  }
}

if (adminForm) {
  adminForm.addEventListener("submit", handleAdminSubmit);
}

if (adminsList) {
  adminsList.addEventListener("click", handleAdminDelete);
}

loadAdmins();
