# 💰 Expense Tracker

An advanced, full-stack expense tracker built with **Node.js**, **Express**, and vanilla JavaScript. Track income and expenses, organize spending by category, set monthly budgets, visualize spending with charts, and export your data to CSV — all with a clean dark-mode UI.

![Output](./Output.png)

## ✨ Features

- **Add / Edit / Delete Transactions** — log income and expenses with amount, category, date, and notes
- **Custom Categories** — create, color-code, and delete your own spending categories
- **Monthly Budgets** — set a spending limit per category and get a visual progress bar (turns red when over budget)
- **Live Dashboard** — total income, total expenses, and running balance at a glance
- **Interactive Chart** — doughnut chart breakdown of spending by category (Chart.js)
- **Filters & Search** — filter transactions by month, type (income/expense), or search by note
- **CSV Export** — download all transactions as a `.csv` file for spreadsheets or accounting tools
- **Persistent Storage** — data is saved to a local JSON file (`data.json`), no database setup required
- **REST API** — clean Express API you can extend or connect to a different frontend

## 🛠️ Tech Stack

| Layer      | Technology                     |
|------------|---------------------------------|
| Backend    | Node.js, Express                |
| Storage    | JSON file (`data.json`)         |
| Frontend   | HTML, CSS, Vanilla JavaScript   |
| Charts     | Chart.js                        |
| IDs        | uuid                             |

## 📂 Project Structure

```
expense-tracker/
├── server.js           # Express server + REST API
├── package.json
├── public/
│   ├── index.html       # UI markup
│   ├── style.css        # Dark-mode styling
│   └── app.js            # Frontend logic (API calls, chart, DOM rendering)
└── data.json            # Auto-created on first run (ignored by git)
```

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/ShyamD2/expense-tracker.git
cd expense-tracker
```

### 2. Install dependencies
```bash
npm install
```

### 3. Run the app
```bash
npm start
```

The app will be running at **http://localhost:3000**

## 📡 API Reference

| Method | Endpoint                  | Description                          |
|--------|----------------------------|---------------------------------------|
| GET    | `/api/categories`          | List all categories                   |
| POST   | `/api/categories`          | Create a category                     |
| DELETE | `/api/categories/:id`      | Delete a category                     |
| GET    | `/api/transactions`        | List transactions (supports filters: `type`, `categoryId`, `from`, `to`, `search`) |
| POST   | `/api/transactions`        | Add a transaction                     |
| PUT    | `/api/transactions/:id`    | Update a transaction                  |
| DELETE | `/api/transactions/:id`    | Delete a transaction                  |
| GET    | `/api/budgets`              | List all budgets                      |
| POST   | `/api/budgets`              | Set/update a budget for a category    |
| GET    | `/api/summary?month=YYYY-MM` | Income/expense totals, category breakdown, and budget status |
| GET    | `/api/export/csv`          | Download all transactions as CSV      |

## 🗺️ Roadmap / Ideas for Contribution

- [ ] User authentication (multi-user support)
- [ ] Recurring transactions
- [ ] Dark/light theme toggle
- [ ] Migrate storage to MongoDB or PostgreSQL
- [ ] Multi-currency support
- [ ] Mobile app (React Native)

## 📄 License

MIT — free to use and modify.

---

If you found this useful, consider giving the repo a ⭐!
