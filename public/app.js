let honorsData = [];
let deleteTarget = null;

// ================================
// NAVIGATION
// ================================

function showSection(sectionId) {
  document.querySelectorAll(".section").forEach(section => {
    section.classList.remove("active");
  });

  const section = document.getElementById(sectionId);

  if (section) {
    section.classList.add("active");
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

  if (sectionId === "games") loadGames();
  if (sectionId === "standings") loadStandings();
  if (sectionId === "honors") loadHonors();
  if (sectionId === "news") loadNews();
  if (sectionId === "admin") checkAdmin();
}

// ================================
// API HELPER
// ================================

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  let data = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(data.error || "خطایی رخ داد.");
  }

  return data;
}

// ================================
// GAMES
// ================================

async function loadGames() {
  const container = document.getElementById("gamesList");

  if (!container) return;

  container.innerHTML =
    '<div class="loading">در حال دریافت بازی‌ها...</div>';

  try {
    const games = await api("/api/games");

    if (!games.length) {
      container.innerHTML =
        '<div class="loading">هنوز بازی‌ای ثبت نشده است.</div>';
      return;
    }

    container.innerHTML = games.map(game => `
      <div class="card">

        <h3>
          ${escapeHTML(game.home_team)}
          🆚
          ${escapeHTML(game.away_team)}
        </h3>

        <div class="game-score">
          ${escapeHTML(game.home_score)}
          -
          ${escapeHTML(game.away_score)}
        </div>

        <p>
          📅 ${escapeHTML(game.date || "بدون تاریخ")}
        </p>

        <div class="game-status">
          ${escapeHTML(game.status)}
        </div>

      </div>
    `).join("");

  } catch (error) {
    container.innerHTML =
      `<div class="loading">${escapeHTML(error.message)}</div>`;
  }
}

// ================================
// STANDINGS
// ================================

async function loadStandings() {
  const body = document.getElementById("standingsBody");

  if (!body) return;

  body.innerHTML = `
    <tr>
      <td colspan="9">در حال دریافت جدول...</td>
    </tr>
  `;

  try {
    const standings = await api("/api/standings");

    if (!standings.length) {
      body.innerHTML = `
        <tr>
          <td colspan="9">
            هنوز تیمی در جدول ثبت نشده است.
          </td>
        </tr>
      `;
      return;
    }

    body.innerHTML = standings.map((team, index) => `
      <tr>

        <td>${index + 1}</td>

        <td>
          <strong>
            ${escapeHTML(team.team)}
          </strong>
        </td>

        <td>${team.played}</td>
        <td>${team.wins}</td>
        <td>${team.draws}</td>
        <td>${team.losses}</td>
        <td>${team.goals_for}</td>
        <td>${team.goals_against}</td>

        <td>
          <strong>
            ${team.points}
          </strong>
        </td>

      </tr>
    `).join("");

  } catch (error) {
    body.innerHTML = `
      <tr>
        <td colspan="9">
          ${escapeHTML(error.message)}
        </td>
      </tr>
    `;
  }
}

// ================================
// HONORS
// ================================

async function loadHonors() {
  try {
    honorsData = await api("/api/honors");
    renderHonors();
  } catch (error) {
    const body = document.getElementById("honorsBody");

    if (body) {
      body.innerHTML = `
        <tr>
          <td colspan="3">
            ${escapeHTML(error.message)}
          </td>
        </tr>
      `;
    }
  }
}

function renderHonors() {
  const body = document.getElementById("honorsBody");
  const searchInput = document.getElementById("honorSearch");

  if (!body) return;

  const search = searchInput
    ? searchInput.value.trim().toLowerCase()
    : "";

  const filtered = honorsData
    .filter(item =>
      item.name.toLowerCase().includes(search)
    )
    .sort((a, b) => b.points - a.points);

  if (!filtered.length) {
    body.innerHTML = `
      <tr>
        <td colspan="3">
          موردی پیدا نشد.
        </td>
      </tr>
    `;
    return;
  }

  body.innerHTML = filtered.map((item, index) => `
    <tr>

      <td>
        ${getRankIcon(index + 1)}
        ${index + 1}
      </td>

      <td>
        <strong>
          ${escapeHTML(item.name)}
        </strong>
      </td>

      <td>
        <strong>
          ${item.points} ⭐
        </strong>
      </td>

    </tr>
  `).join("");
}

function getRankIcon(rank) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  if (rank === 4) return "🏅";

  return "";
}

// ================================
// NEWS
// ================================

async function loadNews() {
  const container = document.getElementById("newsList");

  if (!container) return;

  container.innerHTML =
    '<div class="loading">در حال دریافت اخبار...</div>';

  try {
    const news = await api("/api/news");

    if (!news.length) {
      container.innerHTML =
        '<div class="loading">هنوز خبری منتشر نشده است.</div>';
      return;
    }

    container.innerHTML = news.map(item => `
      <div class="card">

        <h3>
          📰 ${escapeHTML(item.title)}
        </h3>

        <p>
          ${escapeHTML(item.content)}
        </p>

        <small>
          ${formatDate(item.created_at)}
        </small>

      </div>
    `).join("");

  } catch (error) {
    container.innerHTML =
      `<div class="loading">${escapeHTML(error.message)}</div>`;
  }
}

// ================================
// ADMIN LOGIN
// ================================

async function checkAdmin() {
  try {
    const result = await api("/api/me");

    const loginBox = document.getElementById("adminLogin");
    const panel = document.getElementById("adminPanel");

    if (!loginBox || !panel) return;

    if (result.isAdmin) {
      loginBox.style.display = "none";
      panel.style.display = "block";

      loadAdminData();
    } else {
      loginBox.style.display = "block";
      panel.style.display = "none";
    }

  } catch (error) {
    console.error(error);
  }
}

async function loginAdmin() {
  const passwordInput =
    document.getElementById("adminPassword");

  const message =
    document.getElementById("loginMessage");

  if (!passwordInput) return;

  const password = passwordInput.value;

  if (!password) {
    if (message) {
      message.textContent = "رمز عبور را وارد کنید.";
    }
    return;
  }

  try {
    await api("/api/login", {
      method: "POST",
      body: JSON.stringify({
        password
      })
    });

    passwordInput.value = "";

    if (message) {
      message.textContent = "✅ ورود موفق بود.";
    }

    checkAdmin();

  } catch (error) {

    if (message) {
      message.textContent =
        "❌ " + error.message;
    }
  }
}

async function logoutAdmin() {
  try {
    await api("/api/logout", {
      method: "POST"
    });

    checkAdmin();

  } catch (error) {
    alert(error.message);
  }
}

// ================================
// ADMIN DATA
// ================================

async function loadAdminData() {
  await loadAdminNews();
  await loadAdminGames();
  await loadAdminStandings();
  await loadAdminHonors();
}

// ================================
// ADMIN NEWS
// ================================

async function loadAdminNews() {
  const container =
    document.getElementById("adminNewsList");

  if (!container) return;

  try {
    const news = await api("/api/news");

    if (!news.length) {
      container.innerHTML =
        '<p class="loading">خبری وجود ندارد.</p>';
      return;
    }

    container.innerHTML = news.map(item => `
      <div class="admin-item">

        <strong>
          ${escapeHTML(item.title)}
        </strong>

        <p>
          ${escapeHTML(item.content)}
        </p>

        <div class="admin-actions">

          <button
            class="edit-btn"
            onclick="editNews(${item.id})">
            ✏️ ویرایش
          </button>

          <button
            class="danger-btn"
            onclick="askDelete('news', ${item.id})">
            🗑 حذف
          </button>

        </div>

      </div>
    `).join("");

  } catch (error) {
    container.innerHTML =
      `<p>${escapeHTML(error.message)}</p>`;
  }
}

async function addNews() {
  const title =
    document.getElementById("newsTitle").value.trim();

  const content =
    document.getElementById("newsContent").value.trim();

  if (!title || !content) {
    alert("عنوان و متن خبر را وارد کنید.");
    return;
  }

  try {
    await api("/api/news", {
      method: "POST",
      body: JSON.stringify({
        title,
        content
      })
    });

    document.getElementById("newsTitle").value = "";
    document.getElementById("newsContent").value = "";

    await loadNews();
    await loadAdminNews();

    alert("✅ خبر اضافه شد.");

  } catch (error) {
    alert(error.message);
  }
}

async function editNews(id) {
  try {
    const news = await api("/api/news");
    const item = news.find(x => x.id === id);

    if (!item) return;

    const title = prompt(
      "عنوان خبر:",
      item.title
    );

    if (title === null) return;

    const content = prompt(
      "متن خبر:",
      item.content
    );

    if (content === null) return;

    await api(`/api/news/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        title,
        content
      })
    });

    await loadNews();
    await loadAdminNews();

    alert("✅ خبر ویرایش شد.");

  } catch (error) {
    alert(error.message);
  }
}

// ================================
// ADMIN GAMES
// ================================

async function loadAdminGames() {
  const container =
    document.getElementById("adminGamesList");

  if (!container) return;

  try {
    const games = await api("/api/games");

    if (!games.length) {
      container.innerHTML =
        '<p class="loading">بازی‌ای وجود ندارد.</p>';
      return;
    }

    container.innerHTML = games.map(game => `
      <div class="admin-item">

        <strong>
          ${escapeHTML(game.home_team)}
          🆚
          ${escapeHTML(game.away_team)}
        </strong>

        <p>
          نتیجه:
          ${escapeHTML(game.home_score)}
          -
          ${escapeHTML(game.away_score)}
        </p>

        <p>
          وضعیت:
          ${escapeHTML(game.status)}
        </p>

        <div class="admin-actions">

          <button
            class="edit-btn"
            onclick="editGame(${game.id})">
            ✏️ ویرایش
          </button>

          <button
            class="danger-btn"
            onclick="askDelete('games', ${game.id})">
            🗑 حذف
          </button>

        </div>

      </div>
    `).join("");

  } catch (error) {
    container.innerHTML =
      `<p>${escapeHTML(error.message)}</p>`;
  }
}

async function addGame() {
  const data = {
    home_team:
      document.getElementById("gameHome").value.trim(),

    away_team:
      document.getElementById("gameAway").value.trim(),

    home_score:
      document.getElementById("gameHomeScore").value.trim() || "-",

    away_score:
      document.getElementById("gameAwayScore").value.trim() || "-",

    date:
      document.getElementById("gameDate").value.trim(),

    status:
      document.getElementById("gameStatus").value
  };

  if (!data.home_team || !data.away_team) {
    alert("نام دو تیم را وارد کنید.");
    return;
  }

  try {
    await api("/api/games", {
      method: "POST",
      body: JSON.stringify(data)
    });

    document.getElementById("gameHome").value = "";
    document.getElementById("gameAway").value = "";
    document.getElementById("gameHomeScore").value = "";
    document.getElementById("gameAwayScore").value = "";
    document.getElementById("gameDate").value = "";

    await loadGames();
    await loadAdminGames();

    alert("✅ بازی اضافه شد.");

  } catch (error) {
    alert(error.message);
  }
}

async function editGame(id) {
  try {
    const games = await api("/api/games");
    const game = games.find(x => x.id === id);

    if (!game) return;

    const home_team = prompt(
      "تیم میزبان:",
      game.home_team
    );

    if (home_team === null) return;

    const away_team = prompt(
      "تیم مهمان:",
      game.away_team
    );

    if (away_team === null) return;

    const home_score = prompt(
      "گل میزبان:",
      game.home_score
    );

    if (home_score === null) return;

    const away_score = prompt(
      "گل مهمان:",
      game.away_score
    );

    if (away_score === null) return;

    const date = prompt(
      "تاریخ:",
      game.date || ""
    );

    if (date === null) return;

    const status = prompt(
      "وضعیت:",
      game.status
    );

    if (status === null) return;

    await api(`/api/games/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        home_team,
        away_team,
        home_score,
        away_score,
        date,
        status
      })
    });

    await loadGames();
    await loadAdminGames();

    alert("✅ بازی ویرایش شد.");

  } catch (error) {
    alert(error.message);
  }
}

// ================================
// ADMIN STANDINGS
// ================================

async function loadAdminStandings() {
  const container =
    document.getElementById("adminStandingsList");

  if (!container) return;

  try {
    const standings = await api("/api/standings");

    if (!standings.length) {
      container.innerHTML =
        '<p class="loading">تیمی وجود ندارد.</p>';
      return;
    }

    container.innerHTML = standings.map(team => `
      <div class="admin-item">

        <strong>
          ${escapeHTML(team.team)}
        </strong>

        <p>
          امتیاز: ${team.points}
        </p>

        <div class="admin-actions">

          <button
            class="edit-btn"
            onclick="editStanding(${team.id})">
            ✏️ ویرایش
          </button>

          <button
            class="danger-btn"
            onclick="askDelete('standings', ${team.id})">
            🗑 حذف
          </button>

        </div>

      </div>
    `).join("");

  } catch (error) {
    container.innerHTML =
      `<p>${escapeHTML(error.message)}</p>`;
  }
}

async function addStanding() {
  const data = {
    team:
      document.getElementById("standingTeam").value.trim(),

    played:
      Number(document.getElementById("standingPlayed").value) || 0,

    wins:
      Number(document.getElementById("standingWins").value) || 0,

    draws:
      Number(document.getElementById("standingDraws").value) || 0,

    losses:
      Number(document.getElementById("standingLosses").value) || 0,

    goals_for:
      Number(document.getElementById("standingGF").value) || 0,

    goals_against:
      Number(document.getElementById("standingGA").value) || 0,

    points:
      Number(document.getElementById("standingPoints").value) || 0
  };

  if (!data.team) {
    alert("نام تیم را وارد کنید.");
    return;
  }

  try {
    await api("/api/standings", {
      method: "POST",
      body: JSON.stringify(data)
    });

    document.getElementById("standingTeam").value = "";

    await loadStandings();
    await loadAdminStandings();

    alert("✅ تیم به جدول اضافه شد.");

  } catch (error) {
    alert(error.message);
  }
}

async function editStanding(id) {
  try {
    const standings = await api("/api/standings");
    const team = standings.find(x => x.id === id);

    if (!team) return;

    const name = prompt(
      "نام تیم:",
      team.team
    );

    if (name === null) return;

    const played = prompt(
      "تعداد بازی:",
      team.played
    );

    if (played === null) return;

    const wins = prompt(
      "برد:",
      team.wins
    );

    if (wins === null) return;

    const draws = prompt(
      "مساوی:",
      team.draws
    );

    if (draws === null) return;

    const losses = prompt(
      "باخت:",
      team.losses
    );

    if (losses === null) return;

    const goals_for = prompt(
      "گل زده:",
      team.goals_for
    );

    if (goals_for === null) return;

    const goals_against = prompt(
      "گل خورده:",
      team.goals_against
    );

    if (goals_against === null) return;

    const points = prompt(
      "امتیاز:",
      team.points
    );

    if (points === null) return;

    await api(`/api/standings/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        team: name,
        played: Number(played) || 0,
        wins: Number(wins) || 0,
        draws: Number(draws) || 0,
        losses: Number(losses) || 0,
        goals_for: Number(goals_for) || 0,
        goals_against: Number(goals_against) || 0,
        points: Number(points) || 0
      })
    });

    await loadStandings();
    await loadAdminStandings();

    alert("✅ جدول ویرایش شد.");

  } catch (error) {
    alert(error.message);
  }
}

// ================================
// ADMIN HONORS
// ================================

async function loadAdminHonors() {
  const container =
    document.getElementById("adminHonorsList");

  if (!container) return;

  try {
    const honors = await api("/api/honors");

    if (!honors.length) {
      container.innerHTML =
        '<p class="loading">مربی‌ای وجود ندارد.</p>';
      return;
    }

    container.innerHTML = honors.map(item => `
      <div class="admin-item">

        <strong>
          ${escapeHTML(item.name)}
        </strong>

        <p>
          ${item.points} امتیاز
        </p>

        <div class="admin-actions">

          <button
            class="edit-btn"
            onclick="editHonor(${item.id})">
            ✏️ ویرایش
          </button>

          <button
            class="danger-btn"
            onclick="askDelete('honors', ${item.id})">
            🗑 حذف
          </button>

        </div>

      </div>
    `).join("");

  } catch (error) {
    container.innerHTML =
      `<p>${escapeHTML(error.message)}</p>`;
  }
}

async function addHonor() {
  const name =
    document.getElementById("honorName").value.trim();

  const points =
    Number(document.getElementById("honorPoints").value) || 0;

  if (!name) {
    alert("نام مربی را وارد کنید.");
    return;
  }

  try {
    await api("/api/honors", {
      method: "POST",
      body: JSON.stringify({
        name,
        points
      })
    });

    document.getElementById("honorName").value = "";
    document.getElementById("honorPoints").value = "";

    await loadHonors();
    await loadAdminHonors();

    alert("✅ مربی اضافه شد.");

  } catch (error) {
    alert(error.message);
  }
}

async function editHonor(id) {
  try {
    const honors = await api("/api/honors");
    const item = honors.find(x => x.id === id);

    if (!item) return;

    const name = prompt(
      "نام مربی:",
      item.name
    );

    if (name === null) return;

    const points = prompt(
      "امتیاز:",
      item.points
    );

    if (points === null) return;

    await api(`/api/honors/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        name,
        points: Number(points) || 0
      })
    });

    await loadHonors();
    await loadAdminHonors();

    alert("✅ افتخارات ویرایش شد.");

  } catch (error) {
    alert(error.message);
  }
}

// ================================
// DELETE SYSTEM
// ================================

function askDelete(type, id) {
  deleteTarget = {
    type,
    id
  };

  const modal =
    document.getElementById("deleteModal");

  if (modal) {
    modal.style.display = "flex";
  }
}

function closeDeleteModal() {
  deleteTarget = null;

  const modal =
    document.getElementById("deleteModal");

  if (modal) {
    modal.style.display = "none";
  }
}

async function confirmDelete() {
  if (!deleteTarget) return;

  const { type, id } = deleteTarget;

  closeDeleteModal();

  try {
    await api(`/api/${type}/${id}`, {
      method: "DELETE"
    });

    if (type === "news") {
      await loadNews();
      await loadAdminNews();
    }

    if (type === "games") {
      await loadGames();
      await loadAdminGames();
    }

    if (type === "standings") {
      await loadStandings();
      await loadAdminStandings();
    }

    if (type === "honors") {
      await loadHonors();
      await loadAdminHonors();
    }

    alert("🗑 مورد با موفقیت حذف شد.");

  } catch (error) {
    alert(error.message);
  }
}

// ================================
// HELPERS
// ================================

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(dateString) {
  if (!dateString) return "";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return escapeHTML(dateString);
  }

  return date.toLocaleDateString("fa-IR");
}

// ================================
// INITIAL LOAD
// ================================

document.addEventListener("DOMContentLoaded", () => {
  loadGames();
  loadStandings();
  loadHonors();
  loadNews();
});
