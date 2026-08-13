const express = require("express");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, "data.json");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ---------- Data layer (simple JSON file storage) ----------
function loadDB() {
  if (!fs.existsSync(DB_PATH)) {
    const initial = {
      transactions: [],
      categories: [
        { id: uuidv4(), name: "Food", color: "#f97316" },
        { id: uuidv4(), name: "Transport", color: "#3b82f6" },
        { id: uuidv4(), name: "Housing", color: "#8b5cf6" },
        { id: uuidv4(), name: "Entertainment", color: "#ec4899" },
        { id: uuidv4(), name: "Utilities", color: "#10b981" },
        { id: uuidv4(), name: "Other", color: "#6b7280" }
      ],
      budgets: {}
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
  return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
}

function saveDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

// ---------- Categories ----------
app.get("/api/categories", (req, res) => {
  const db = loadDB();
  res.json(db.categories);
});

app.post("/api/categories", (req, res) => {
  const { name, color } = req.body;
  if (!name) return res.status(400).json({ error: "Category name is required" });
  const db = loadDB();
  const category = { id: uuidv4(), name, color: color || "#6b7280" };
  db.categories.push(category);
  saveDB(db);
  res.status(201).json(category);
});

app.delete("/api/categories/:id", (req, res) => {
  const db = loadDB();
  db.categories = db.categories.filter((c) => c.id !== req.params.id);
  saveDB(db);
  res.status(204).end();
});

// ---------- Transactions ----------
app.get("/api/transactions", (req, res) => {
  const db = loadDB();
  let results = db.transactions;

  const { type, categoryId, from, to, search } = req.query;
  if (type) results = results.filter((t) => t.type === type);
  if (categoryId) results = results.filter((t) => t.categoryId === categoryId);
  if (from) results = results.filter((t) => t.date >= from);
  if (to) results = results.filter((t) => t.date <= to);
  if (search) {
    const q = search.toLowerCase();
    results = results.filter((t) => t.note.toLowerCase().includes(q));
  }

  results = [...results].sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json(results);
});

app.post("/api/transactions", (req, res) => {
  const { type, amount, categoryId, note, date } = req.body;
  if (!type || !amount || !categoryId || !date) {
    return res.status(400).json({ error: "type, amount, categoryId, and date are required" });
  }
  const db = loadDB();
  const transaction = {
    id: uuidv4(),
    type, // "income" | "expense"
    amount: Number(amount),
    categoryId,
    note: note || "",
    date // ISO date string YYYY-MM-DD
  };
  db.transactions.push(transaction);
  saveDB(db);
  res.status(201).json(transaction);
});

app.put("/api/transactions/:id", (req, res) => {
  const db = loadDB();
  const idx = db.transactions.findIndex((t) => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Transaction not found" });
  db.transactions[idx] = { ...db.transactions[idx], ...req.body, id: req.params.id };
  saveDB(db);
  res.json(db.transactions[idx]);
});

app.delete("/api/transactions/:id", (req, res) => {
  const db = loadDB();
  db.transactions = db.transactions.filter((t) => t.id !== req.params.id);
  saveDB(db);
  res.status(204).end();
});

// ---------- Budgets (per category, monthly limit) ----------
app.get("/api/budgets", (req, res) => {
  const db = loadDB();
  res.json(db.budgets);
});

app.post("/api/budgets", (req, res) => {
  const { categoryId, limit } = req.body;
  if (!categoryId || limit == null) {
    return res.status(400).json({ error: "categoryId and limit are required" });
  }
  const db = loadDB();
  db.budgets[categoryId] = Number(limit);
  saveDB(db);
  res.json(db.budgets);
});

// ---------- Analytics / Summary ----------
app.get("/api/summary", (req, res) => {
  const db = loadDB();
  const { month } = req.query; // format: YYYY-MM, optional

  let txns = db.transactions;
  if (month) txns = txns.filter((t) => t.date.startsWith(month));

  const totalIncome = txns
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = txns
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const byCategory = {};
  txns
    .filter((t) => t.type === "expense")
    .forEach((t) => {
      byCategory[t.categoryId] = (byCategory[t.categoryId] || 0) + t.amount;
    });

  const budgetStatus = Object.entries(db.budgets).map(([categoryId, limit]) => {
    const spent = byCategory[categoryId] || 0;
    return {
      categoryId,
      limit,
      spent,
      remaining: limit - spent,
      percentUsed: limit > 0 ? Math.round((spent / limit) * 100) : 0,
      overBudget: spent > limit
    };
  });

  res.json({
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    byCategory,
    budgetStatus
  });
});

// ---------- CSV Export ----------
app.get("/api/export/csv", (req, res) => {
  const db = loadDB();
  const catMap = Object.fromEntries(db.categories.map((c) => [c.id, c.name]));

  let csv = "Date,Type,Category,Amount,Note\n";
  db.transactions
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .forEach((t) => {
      const category = catMap[t.categoryId] || "Unknown";
      const note = (t.note || "").replace(/"/g, '""');
      csv += `${t.date},${t.type},${category},${t.amount},"${note}"\n`;
    });

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=expenses.csv");
  res.send(csv);
});

app.listen(PORT, () => {
  console.log(`Expense Tracker running at http://localhost:${PORT}`);
});
