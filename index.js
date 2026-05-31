const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('public'));

// База данных (better-sqlite3 синхронная)
const db = new Database('profitly.db');

// Создаём таблицу
db.exec(`
  CREATE TABLE IF NOT EXISTS operations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_name TEXT,
    service TEXT,
    amount INTEGER,
    date TEXT
  )
`);

// API: получить все операции
app.get('/api/operations', (req, res) => {
  const rows = db.prepare('SELECT * FROM operations ORDER BY date DESC').all();
  res.json(rows);
});

// API: добавить операцию
app.post('/api/operations', (req, res) => {
  const { client_name, service, amount } = req.body;
  const date = new Date().toISOString();
  
  const stmt = db.prepare('INSERT INTO operations (client_name, service, amount, date) VALUES (?, ?, ?, ?)');
  const info = stmt.run(client_name, service, amount, date);
  
  res.json({ id: info.lastInsertRowid });
});

// API: статистика
app.get('/api/stats', (req, res) => {
  const rows = db.prepare(`
    SELECT 
      client_name,
      SUM(amount) as total,
      COUNT(*) as visits,
      MAX(date) as last_visit
    FROM operations
    GROUP BY client_name
    ORDER BY total DESC
    LIMIT 10
  `).all();
  
  const totalIncome = rows.reduce((sum, r) => sum + r.total, 0);
  
  res.json({
    top_clients: rows,
    total_income: totalIncome
  });
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Profitly запущен на порту ${PORT}`);
});