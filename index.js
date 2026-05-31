const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('public'));

// База данных
const db = new sqlite3.Database('profitly.db');

// Создаём таблицы
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS operations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_name TEXT,
      service TEXT,
      amount INTEGER,
      date TEXT
    )
  `);
});

// API: получить все операции
app.get('/api/operations', (req, res) => {
  db.all('SELECT * FROM operations ORDER BY date DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// API: добавить операцию
app.post('/api/operations', (req, res) => {
  const { client_name, service, amount } = req.body;
  const date = new Date().toISOString();
  
  db.run(
    'INSERT INTO operations (client_name, service, amount, date) VALUES (?, ?, ?, ?)',
    [client_name, service, amount, date],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

// API: статистика
app.get('/api/stats', (req, res) => {
  db.all(`
    SELECT 
      client_name,
      SUM(amount) as total,
      COUNT(*) as visits,
      MAX(date) as last_visit
    FROM operations
    GROUP BY client_name
    ORDER BY total DESC
    LIMIT 10
  `, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const totalIncome = rows.reduce((sum, r) => sum + r.total, 0);
    
    res.json({
      top_clients: rows,
      total_income: totalIncome
    });
  });
});

// Запуск сервера
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ Сервер Profitly запущен на http://localhost:${PORT}`);
});