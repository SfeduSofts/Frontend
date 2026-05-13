function getPendingAuthRedirect() {
  const next = String(sessionStorage.getItem("sfedu_auth_next") || "").trim();
  sessionStorage.removeItem("sfedu_auth_next");

  if (!next || next.startsWith("http://") || next.startsWith("https://")) {
    return "";
  }

  if (next.startsWith("//")) {
    return "";
  }

  return next;
}

const pendingAuthRedirect = getPendingAuthRedirect();
if (pendingAuthRedirect) {
  window.location.replace(pendingAuthRedirect);
}

const authorsOverlay = document.getElementById("authorsOverlay");
const authorsOpenButton = document.getElementById("authorsOpenButton");
const authorsCloseButton = document.getElementById("authorsCloseButton");

function openAuthorsOverlay() {
  if (!authorsOverlay) return;
  authorsOverlay.classList.add("is-open");
  authorsOverlay.setAttribute("aria-hidden", "false");
}

function closeAuthorsOverlay() {
  if (!authorsOverlay) return;
  authorsOverlay.classList.remove("is-open");
  authorsOverlay.setAttribute("aria-hidden", "true");
}

if (authorsCloseButton) {
  authorsCloseButton.textContent = "Закрыть";
  authorsCloseButton.addEventListener("click", closeAuthorsOverlay);
}

if (authorsOpenButton) {
  authorsOpenButton.addEventListener("click", openAuthorsOverlay);
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

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeAuthorsOverlay();
  }
});
