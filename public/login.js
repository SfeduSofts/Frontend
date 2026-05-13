const loginButton = document.getElementById("loginButton");

function getSafeNextPath() {
  const params = new URLSearchParams(window.location.search);
  const next = String(params.get("next") || "admin.html").trim();

  if (!next || next.startsWith("http://") || next.startsWith("https://")) {
    return "admin.html";
  }

  if (next.startsWith("//")) {
    return "admin.html";
  }

  return next;
}

if (loginButton) {
  loginButton.href = DataStore.authLoginUrl;

  loginButton.addEventListener("click", (event) => {
    event.preventDefault();
    sessionStorage.setItem("sfedu_auth_next", getSafeNextPath());
    window.location.href = DataStore.authLoginUrl;
  });
}
