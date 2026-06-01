const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('public'));

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

function readJSON(filename) {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJSON(filename, data) {
  fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2));
}

// Инициализация файлов
if (!fs.existsSync(path.join(DATA_DIR, 'settings.json'))) {
  writeJSON('settings.json', { role: 'master', theme: 'dark', firstLogin: true });
}
if (!fs.existsSync(path.join(DATA_DIR, 'clients.json'))) writeJSON('clients.json', []);
if (!fs.existsSync(path.join(DATA_DIR, 'services.json'))) {
  writeJSON('services.json', [
    { id: 1, name: 'Маникюр', price: 3000 },
    { id: 2, name: 'Педикюр', price: 3500 },
    { id: 3, name: 'Стрижка', price: 2500 }
  ]);
}
if (!fs.existsSync(path.join(DATA_DIR, 'products.json'))) writeJSON('products.json', []);
if (!fs.existsSync(path.join(DATA_DIR, 'operations.json'))) writeJSON('operations.json', []);

// API: настройки
app.get('/api/settings', (req, res) => {
  res.json(readJSON('settings.json'));
});

app.post('/api/settings', (req, res) => {
  const settings = readJSON('settings.json');
  const updated = { ...settings, ...req.body };
  writeJSON('settings.json', updated);
  res.json({ success: true });
});

// API: клиенты
app.get('/api/clients', (req, res) => {
  res.json(readJSON('clients.json'));
});

app.post('/api/clients', (req, res) => {
  const clients = readJSON('clients.json');
  const { id, name, phone, type } = req.body;
  if (id) {
    const index = clients.findIndex(c => c.id === id);
    if (index !== -1) clients[index] = { ...clients[index], name, phone, type };
  } else {
    clients.push({ id: Date.now(), name, phone, type: type || 'person', createdAt: new Date().toISOString() });
  }
  writeJSON('clients.json', clients);
  res.json({ success: true });
});

app.delete('/api/clients/:id', (req, res) => {
  const clients = readJSON('clients.json');
  const filtered = clients.filter(c => c.id !== parseInt(req.params.id));
  writeJSON('clients.json', filtered);
  res.json({ success: true });
});

// API: услуги
app.get('/api/services', (req, res) => {
  res.json(readJSON('services.json'));
});

app.post('/api/services', (req, res) => {
  const services = readJSON('services.json');
  const { id, name, price } = req.body;
  if (id) {
    const index = services.findIndex(s => s.id === id);
    if (index !== -1) services[index] = { ...services[index], name, price };
  } else {
    services.push({ id: Date.now(), name, price });
  }
  writeJSON('services.json', services);
  res.json({ success: true });
});

app.delete('/api/services/:id', (req, res) => {
  const services = readJSON('services.json');
  const filtered = services.filter(s => s.id !== parseInt(req.params.id));
  writeJSON('services.json', filtered);
  res.json({ success: true });
});

// API: товары (НОВЫЙ БЛОК — ДОБАВИТЬ)
app.get('/api/products', (req, res) => {
  res.json(readJSON('products.json'));
});

app.post('/api/products', (req, res) => {
  const products = readJSON('products.json');
  const { name, price, stock } = req.body;
  products.push({ id: Date.now(), name, price, stock: stock || 0 });
  writeJSON('products.json', products);
  res.json({ success: true });
});

app.delete('/api/products/:id', (req, res) => {
  const products = readJSON('products.json');
  const filtered = products.filter(p => p.id !== parseInt(req.params.id));
  writeJSON('products.json', filtered);
  res.json({ success: true });
});

// API: операции
app.get('/api/operations', (req, res) => {
  res.json(readJSON('operations.json'));
});

app.post('/api/operations', (req, res) => {
  const operations = readJSON('operations.json');
  const { clientId, clientName, serviceId, serviceName, amount } = req.body;
  const now = new Date();
  const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const operation = {
    id: Date.now(),
    clientId: clientId || null,
    clientName,
    serviceId: serviceId || null,
    serviceName,
    amount,
    date: now.toISOString().split('T')[0],
    datetime: now.toISOString(),
    weekday: weekdayNames[now.getDay()],
    weekdayIndex: now.getDay(),
    hour: now.getHours()
  };
  operations.push(operation);
  writeJSON('operations.json', operations);
  res.json({ success: true });
});

// API: удалить операцию (уже есть, оставляем)
app.delete('/api/operations/:id', (req, res) => {
  const operations = readJSON('operations.json');
  const filtered = operations.filter(op => op.id !== parseInt(req.params.id));
  writeJSON('operations.json', filtered);
  res.json({ success: true });
});

// API: обновить операцию (уже есть, оставляем)
app.put('/api/operations/:id', (req, res) => {
  const operations = readJSON('operations.json');
  const { clientId, clientName, serviceId, serviceName, amount, date } = req.body;
  const index = operations.findIndex(op => op.id === parseInt(req.params.id));
  
  if (index === -1) {
    return res.status(404).json({ error: 'Operation not found' });
  }
  
  const now = new Date();
  const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const operationDate = date ? new Date(date) : now;
  
  operations[index] = {
    ...operations[index],
    clientId,
    clientName,
    serviceId,
    serviceName,
    amount,
    date: operationDate.toISOString().split('T')[0],
    datetime: operationDate.toISOString(),
    weekday: weekdayNames[operationDate.getDay()],
    weekdayIndex: operationDate.getDay(),
    hour: operationDate.getHours()
  };
  
  writeJSON('operations.json', operations);
  res.json({ success: true });
});

// API: статистика
app.get('/api/stats', (req, res) => {
  const operations = readJSON('operations.json');
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  const monthOps = operations.filter(op => {
    const d = new Date(op.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  
  const totalIncome = monthOps.reduce((sum, op) => sum + op.amount, 0);
  
  const clientTotals = {};
  monthOps.forEach(op => {
    if (!clientTotals[op.clientName]) clientTotals[op.clientName] = 0;
    clientTotals[op.clientName] += op.amount;
  });
  
  const topClients = Object.entries(clientTotals)
    .map(([name, total]) => ({ name, total, percent: totalIncome ? (total / totalIncome * 100) : 0 }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);
  
  const lastVisits = {};
  operations.forEach(op => {
    if (!lastVisits[op.clientName] || new Date(op.date) > new Date(lastVisits[op.clientName])) {
      lastVisits[op.clientName] = op.date;
    }
  });
  const reminders = [];
  for (const [name, lastDate] of Object.entries(lastVisits)) {
    const days = Math.floor((now - new Date(lastDate)) / (1000 * 60 * 60 * 24));
    if (days > 30) reminders.push({ name, days });
  }
  
  let aiAdvice = 'Добавьте больше операций для анализа';
  if (operations.length >= 5) {
    const hourCount = Array(24).fill(0);
    operations.forEach(op => { if (op.hour !== undefined) hourCount[op.hour]++; });
    const minHour = hourCount.indexOf(Math.min(...hourCount));
    const avgCheck = monthOps.length ? Math.round(monthOps.reduce((s, o) => s + o.amount, 0) / monthOps.length) : 2000;
    const potential = avgCheck * 2 * 4;
    aiAdvice = `${minHour}:00-${minHour + 2}:00 — обычно тихо. Скидка 15% новым → +${potential.toLocaleString()} ₽/мес`;
  }
  
  res.json({ totalIncome, topClients, reminders, aiAdvice, operationsCount: operations.length });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Profitly запущен на http://localhost:${PORT}`));