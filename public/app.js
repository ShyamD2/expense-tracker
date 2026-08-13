const API = "/api";
let categories = [];
let chartInstance = null;

const el = (id) => document.getElementById(id);

async function fetchJSON(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  if (res.status === 204) return null;
  return res.json();
}

function money(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ---------- Init ----------
async function init() {
  el("date").valueAsDate = new Date();
  const now = new Date();
  el("monthFilter").value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  await loadCategories();
  await refreshAll();

  el("transactionForm").addEventListener("submit", onAddTransaction);
  el("categoryForm").addEventListener("submit", onAddCategory);
  el("budgetForm").addEventListener("submit", onSetBudget);
  el("monthFilter").addEventListener("change", refreshAll);
  el("searchNote").addEventListener("input", debounce(loadTransactions, 300));
  el("filterType").addEventListener("change", loadTransactions);
  el("exportCsv").addEventListener("click", () => {
    window.location.href = `${API}/export/csv`;
  });
}

function debounce(fn, delay) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

async function refreshAll() {
  await Promise.all([loadTransactions(), loadSummary()]);
}

// ---------- Categories ----------
async function loadCategories() {
  categories = await fetchJSON(`${API}/categories`);
  const catSelect = el("categoryId");
  const budgetSelect = el("budgetCategory");
  catSelect.innerHTML = "";
  budgetSelect.innerHTML = "";
  categories.forEach((c) => {
    catSelect.appendChild(new Option(c.name, c.id));
    budgetSelect.appendChild(new Option(c.name, c.id));
  });

  const list = el("categoryList");
  list.innerHTML = "";
  categories.forEach((c) => {
    const li = document.createElement("li");
    li.innerHTML = `<span><span class="dot" style="background:${c.color}"></span>${escapeHtml(c.name)}</span>`;
    const btn = document.createElement("button");
    btn.className = "remove-btn";
    btn.textContent = "✕";
    btn.onclick = async () => {
      await fetchJSON(`${API}/categories/${c.id}`, { method: "DELETE" });
      await loadCategories();
      await refreshAll();
    };
    li.appendChild(btn);
    list.appendChild(li);
  });
}

async function onAddCategory(e) {
  e.preventDefault();
  const name = el("newCategoryName").value.trim();
  const color = el("newCategoryColor").value;
  if (!name) return;
  await fetchJSON(`${API}/categories`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, color })
  });
  el("newCategoryName").value = "";
  await loadCategories();
}

// ---------- Transactions ----------
async function onAddTransaction(e) {
  e.preventDefault();
  const payload = {
    type: el("type").value,
    amount: parseFloat(el("amount").value),
    categoryId: el("categoryId").value,
    date: el("date").value,
    note: el("note").value.trim()
  };
  await fetchJSON(`${API}/transactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  el("amount").value = "";
  el("note").value = "";
  await refreshAll();
}

async function loadTransactions() {
  const params = new URLSearchParams();
  const month = el("monthFilter").value;
  if (month) {
    params.set("from", `${month}-01`);
    params.set("to", `${month}-31`);
  }
  const type = el("filterType").value;
  if (type) params.set("type", type);
  const search = el("searchNote").value.trim();
  if (search) params.set("search", search);

  const txns = await fetchJSON(`${API}/transactions?${params.toString()}`);
  const catMap = Object.fromEntries(categories.map((c) => [c.id, c]));

  const list = el("transactionList");
  list.innerHTML = "";
  if (txns.length === 0) {
    list.innerHTML = `<li style="justify-content:center;color:var(--text-dim)">No transactions found</li>`;
    return;
  }

  txns.forEach((t) => {
    const cat = catMap[t.categoryId];
    const li = document.createElement("li");
    li.innerHTML = `
      <div class="txn-left">
        <span><span class="dot" style="background:${cat ? cat.color : "#6b7280"}"></span>${escapeHtml(cat ? cat.name : "Unknown")} · ${t.date}</span>
        ${t.note ? `<span class="txn-note">${escapeHtml(t.note)}</span>` : ""}
      </div>
      <span class="txn-amount ${t.type}">${t.type === "expense" ? "-" : "+"}${money(t.amount)}</span>
    `;
    const btn = document.createElement("button");
    btn.className = "remove-btn";
    btn.textContent = "✕";
    btn.onclick = async () => {
      await fetchJSON(`${API}/transactions/${t.id}`, { method: "DELETE" });
      await refreshAll();
    };
    li.appendChild(btn);
    list.appendChild(li);
  });
}

// ---------- Budgets ----------
async function onSetBudget(e) {
  e.preventDefault();
  const categoryId = el("budgetCategory").value;
  const limit = parseFloat(el("budgetLimit").value);
  await fetchJSON(`${API}/budgets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ categoryId, limit })
  });
  el("budgetLimit").value = "";
  await loadSummary();
}

// ---------- Summary / Chart / Budgets display ----------
async function loadSummary() {
  const month = el("monthFilter").value;
  const summary = await fetchJSON(`${API}/summary?month=${month}`);

  el("totalIncome").textContent = money(summary.totalIncome);
  el("totalExpense").textContent = money(summary.totalExpense);
  el("totalBalance").textContent = money(summary.balance);

  renderChart(summary.byCategory);
  renderBudgets(summary.budgetStatus);
}

function renderChart(byCategory) {
  const catMap = Object.fromEntries(categories.map((c) => [c.id, c]));
  const labels = Object.keys(byCategory).map((id) => (catMap[id] ? catMap[id].name : "Unknown"));
  const data = Object.values(byCategory);
  const colors = Object.keys(byCategory).map((id) => (catMap[id] ? catMap[id].color : "#6b7280"));

  const ctx = el("categoryChart").getContext("2d");
  if (chartInstance) chartInstance.destroy();

  if (data.length === 0) {
    return;
  }

  chartInstance = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{ data, backgroundColor: colors, borderWidth: 0 }]
    },
    options: {
      plugins: {
        legend: { position: "bottom", labels: { color: "#e8edf3", font: { size: 11 } } }
      }
    }
  });
}

function renderBudgets(budgetStatus) {
  const catMap = Object.fromEntries(categories.map((c) => [c.id, c]));
  const list = el("budgetList");
  list.innerHTML = "";

  if (budgetStatus.length === 0) {
    list.innerHTML = `<li style="justify-content:center;color:var(--text-dim)">No budgets set</li>`;
    return;
  }

  budgetStatus.forEach((b) => {
    const cat = catMap[b.categoryId];
    const li = document.createElement("li");
    li.innerHTML = `
      <span>${escapeHtml(cat ? cat.name : "Unknown")}</span>
      <div class="budget-bar-wrap">
        <div class="budget-bar ${b.overBudget ? "over" : ""}" style="width:${Math.min(b.percentUsed, 100)}%"></div>
      </div>
      <span style="color:${b.overBudget ? "var(--expense)" : "var(--text-dim)"}">${money(b.spent)} / ${money(b.limit)}</span>
    `;
    list.appendChild(li);
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

init();
