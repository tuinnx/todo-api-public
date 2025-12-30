const API_BASE_URL = "http://localhost:3000";

// ---------- helpers ----------
async function request(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;
  const opts = {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  };

  const res = await fetch(url, opts);
  const text = await res.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text; // caso venha HTML/texto
  }

  if (!res.ok) {
    const msg = (data && data.error) ? data.error : `Erro ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function fmtDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR");
}

function setMsg(el, msg = "") {
  el.textContent = msg;
}

function setBadgeOk(el, text) {
  el.textContent = text;
  el.classList.remove("bad");
  el.classList.add("ok");
}

function setBadgeBad(el, text) {
  el.textContent = text;
  el.classList.remove("ok");
  el.classList.add("bad");
}

// ---------- DOM ----------
const healthBadge = document.querySelector("#healthBadge");

const taskForm = document.querySelector("#taskForm");
const taskIdEl = document.querySelector("#taskId");
const titleEl = document.querySelector("#title");
const descriptionEl = document.querySelector("#description");
const responsibleUserIdEl = document.querySelector("#responsibleUserId");
const statusIdEl = document.querySelector("#statusId");
const formMsg = document.querySelector("#formMsg");
const clearBtn = document.querySelector("#clearBtn");

const filterStatus = document.querySelector("#filterStatus");
const filterResponsible = document.querySelector("#filterResponsible");
const filterOrder = document.querySelector("#filterOrder");
const refreshBtn = document.querySelector("#refreshBtn");

const tasksTbody = document.querySelector("#tasksTbody");
const listMsg = document.querySelector("#listMsg");
const countEl = document.querySelector("#count");

// ---------- state ----------
let users = [];
let statuses = [];

// ---------- loaders ----------
async function loadHealth() {
  try {
    const data = await request("/health");
    if (data && data.ok) setBadgeOk(healthBadge, "online");
    else setBadgeBad(healthBadge, "instável");
  } catch {
    setBadgeBad(healthBadge, "offline");
  }
}

async function loadUsers() {
  users = await request("/users");
  // select responsável (form)
  responsibleUserIdEl.innerHTML = users
    .map((u) => `<option value="${u.id}">${u.name}</option>`)
    .join("");

  // filtro responsável
  filterResponsible.innerHTML =
    `<option value="">Todos</option>` +
    users.map((u) => `<option value="${u.id}">${u.name}</option>`).join("");
}

async function loadStatuses() {
  statuses = await request("/statuses");

  // select status (form)
  statusIdEl.innerHTML = statuses
    .map((s) => `<option value="${s.id}">${s.name}</option>`)
    .join("");

  // filtro status
  filterStatus.innerHTML =
    `<option value="">Todos</option>` +
    statuses.map((s) => `<option value="${s.id}">${s.name}</option>`).join("");
}

function buildTasksQuery() {
  const params = new URLSearchParams();
  const st = filterStatus.value;
  const ru = filterResponsible.value;
  const order = filterOrder.value;

  if (st) params.set("status_id", st);
  if (ru) params.set("responsible_user_id", ru);
  if (order) params.set("order", order);

  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

async function loadTasks() {
  setMsg(listMsg, "");
  tasksTbody.innerHTML = "";
  try {
    const qs = buildTasksQuery();
    const tasks = await request(`/tasks${qs}`);

    countEl.textContent = `${tasks.length} item(s)`;
    tasksTbody.innerHTML = tasks
      .map(
        (t) => `
        <tr>
          <td>${t.id}</td>
          <td>
            <strong>${escapeHtml(t.title)}</strong>
            <div style="color:#9aa0a6; margin-top:6px;">${escapeHtml(t.description || "")}</div>
          </td>
          <td>${escapeHtml(t.status_name || "")} (#${t.status_id})</td>
          <td>${escapeHtml(t.responsible_name || "")} (#${t.responsible_id})</td>
          <td>${fmtDate(t.created_at)}</td>
          <td>${fmtDate(t.updated_at)}</td>
          <td>
            <button class="btn" data-action="edit" data-id="${t.id}">Editar</button>
            <button class="btn" data-action="del" data-id="${t.id}">Deletar</button>
          </td>
        </tr>
      `
      )
      .join("");
  } catch (err) {
    setMsg(listMsg, err.message || "Erro ao listar");
  }
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ---------- actions ----------
function clearForm() {
  taskIdEl.value = "";
  titleEl.value = "";
  descriptionEl.value = "";
  // mantém selects no primeiro item
  if (responsibleUserIdEl.options.length) responsibleUserIdEl.selectedIndex = 0;
  if (statusIdEl.options.length) statusIdEl.selectedIndex = 0;
  setMsg(formMsg, "");
}

async function createTask(payload) {
  return request("/tasks", { method: "POST", body: JSON.stringify(payload) });
}

async function updateTask(id, payload) {
  return request(`/tasks/${id}`, { method: "PUT", body: JSON.stringify(payload) });
}

async function deleteTask(id) {
  return request(`/tasks/${id}`, { method: "DELETE" });
}

async function getTaskById(id) {
  return request(`/tasks/${id}`);
}

// ---------- events ----------
taskForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  setMsg(formMsg, "");

  const payload = {
    title: titleEl.value.trim(),
    description: descriptionEl.value.trim(),
    responsible_user_id: Number(responsibleUserIdEl.value),
    status_id: Number(statusIdEl.value),
  };

  try {
    const id = taskIdEl.value;
    if (id) {
      await updateTask(id, payload);
      setMsg(formMsg, "✅ Task atualizada!");
    } else {
      await createTask(payload);
      setMsg(formMsg, "✅ Task criada!");
    }
    await loadTasks();
    clearForm();
  } catch (err) {
    setMsg(formMsg, `❌ ${err.message}`);
  }
});

clearBtn.addEventListener("click", clearForm);
refreshBtn.addEventListener("click", loadTasks);

filterStatus.addEventListener("change", loadTasks);
filterResponsible.addEventListener("change", loadTasks);
filterOrder.addEventListener("change", loadTasks);

tasksTbody.addEventListener("click", async (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;

  const action = btn.dataset.action;
  const id = btn.dataset.id;

  if (action === "edit") {
    try {
      const t = await getTaskById(id);
      taskIdEl.value = t.id;
      titleEl.value = t.title || "";
      descriptionEl.value = t.description || "";
      responsibleUserIdEl.value = String(t.responsible_id);
      statusIdEl.value = String(t.status_id);
      setMsg(formMsg, `Editando task #${t.id}`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setMsg(listMsg, `❌ ${err.message}`);
    }
  }

  if (action === "del") {
    const ok = confirm(`Deletar a task #${id}?`);
    if (!ok) return;

    try {
      await deleteTask(id);
      setMsg(listMsg, `✅ Task #${id} removida`);
      await loadTasks();
    } catch (err) {
      setMsg(listMsg, `❌ ${err.message}`);
    }
  }
});

// ---------- init ----------
(async function init() {
  await loadHealth();
  await loadUsers();
  await loadStatuses();
  await loadTasks();
})();
