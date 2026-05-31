const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('public'));

// Путь к файлу с данными
const DATA_FILE = path.join(__dirname, 'operations.json');

// Инициализация файла с данными
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify([]));
}

// Вспомогательная функция: прочитать операции
function readOperations() {
  const data = fs.readFileSync(DATA_FILE, 'utf8');
  return JSON.parse(data);
}

// Вспомогательная функция: записать операции
function writeOperations(operations) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(operations, null, 2));
}

// API: получить все операции
app.get('/api/operations', (req, res) => {
  const operations = readOperations();
  res.json(operations.sort((a, b) => new Date(b.date) - new Date(a.date)));
});

// API: добавить операцию
app.post('/api/operations', (req, res) => {
  const { client_name, service, amount } = req.body;
  const operations = readOperations();
  
  const newOperation = {
    id: Date.now(),
    client_name,
    service,
    amount,
    date: new Date().toISOString()
  };
  
  operations.push(newOperation);
  writeOperations(operations);
  
  res.json({ id: newOperation.id });
});

// API: статистика
app.get('/api/stats', (req, res) => {
  const operations = readOperations();
  
  // Группировка по клиентам
  const clientMap = new Map();
  
  for (const op of operations) {
    if (!clientMap.has(op.client_name)) {
      clientMap.set(op.client_name, {
        client_name: op.client_name,
        total: 0,
        visits: 0,
        last_visit: op.date
      });
    }
    
    const client = clientMap.get(op.client_name);
    client.total += op.amount;
    client.visits++;
    
    if (new Date(op.date) > new Date(client.last_visit)) {
      client.last_visit = op.date;
    }
  }
  
  const rows = Array.from(clientMap.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);
  
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