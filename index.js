const express = require('express');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

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

// API: получить всех клиентов
app.get('/api/clients', (req, res) => {
  res.json(readJSON('clients.json'));
});

// API: добавить нового клиента
app.post('/api/clients', (req, res) => {
  const clients = readJSON('clients.json');
  const { name, phone, notes, type } = req.body;
  clients.push({
    id: Date.now(),
    name,
    phone: phone || '',
    notes: notes || '',
    type: type || 'person',
    createdAt: new Date().toISOString()
  });
  writeJSON('clients.json', clients);
  res.json({ success: true });
});

// API: обновить клиента (редактирование)
app.put('/api/clients/:id', (req, res) => {
  const clients = readJSON('clients.json');
  const { name, phone, notes, type } = req.body;
  const index = clients.findIndex(c => c.id === parseInt(req.params.id));
  
  if (index === -1) {
    return res.status(404).json({ error: 'Client not found' });
  }
  
  clients[index] = {
    ...clients[index],
    name: name || clients[index].name,
    phone: phone || clients[index].phone,
    notes: notes || clients[index].notes,
    type: type || clients[index].type
  };
  
  writeJSON('clients.json', clients);
  res.json({ success: true });
});

// API: удалить клиента
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
  updateClientStatus(clientId);
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

// ========== НОВЫЕ ФУНКЦИИ ДЛЯ СТАТУСОВ КЛИЕНТОВ ==========

// Эндпоинт для смены статуса
app.patch('/api/clients/:id/status', (req, res) => {
  const clients = readJSON('clients.json');
  const { status } = req.body;
  const index = clients.findIndex(c => c.id === parseInt(req.params.id));
  
  if (index === -1) {
    return res.status(404).json({ error: 'Client not found' });
  }
  
  clients[index].status = status;
  writeJSON('clients.json', clients);
  res.json({ success: true });
});

// Функция автоматического обновления статуса
async function updateClientStatus(clientId) {
  const clients = readJSON('clients.json');
  const operations = readJSON('operations.json');
  const client = clients.find(c => c.id === clientId);
  if (!client) return;
  
  const clientOps = operations.filter(op => op.clientId === clientId);
  const now = new Date();
  const lastOpDate = clientOps.length ? new Date(Math.max(...clientOps.map(op => new Date(op.date)))) : null;
  const daysSinceLastOp = lastOpDate ? Math.floor((now - lastOpDate) / (1000 * 60 * 60 * 24)) : null;
  
  let newStatus = client.status || 'new';
  
  if (clientOps.length === 0) {
    newStatus = 'new';
  } else if (clientOps.length >= 3 && client.status !== 'regular') {
    newStatus = 'regular';
  }
  
  if (daysSinceLastOp !== null && daysSinceLastOp > 60 && newStatus !== 'departed') {
    newStatus = 'departed';
  }
  
  if (newStatus !== client.status) {
    client.status = newStatus;
    writeJSON('clients.json', clients);
  }
}

const PORT = process.env.PORT || 3000;
// API: обновить клиента (редактирование)
app.put('/api/clients/:id', (req, res) => {
  const clients = readJSON('clients.json');
  const { name, phone, notes, type } = req.body;
  const index = clients.findIndex(c => c.id === parseInt(req.params.id));
  
  if (index === -1) {
    return res.status(404).json({ error: 'Client not found' });
  }
  
  clients[index] = {
    ...clients[index],
    name: name || clients[index].name,
    phone: phone || clients[index].phone,
    notes: notes || clients[index].notes,
    type: type || clients[index].type
  };
  
  writeJSON('clients.json', clients);
  res.json({ success: true });
});
// API: обновить услугу (редактирование)
app.put('/api/services/:id', (req, res) => {
  const services = readJSON('services.json');
  const { name, price } = req.body;
  const index = services.findIndex(s => s.id === parseInt(req.params.id));
  
  if (index === -1) {
    return res.status(404).json({ error: 'Service not found' });
  }
  
  services[index] = {
    ...services[index],
    name: name || services[index].name,
    price: price || services[index].price
  };
  
  writeJSON('services.json', services);
  res.json({ success: true });
});

// API: обновить товар (редактирование)
app.put('/api/products/:id', (req, res) => {
  const products = readJSON('products.json');
  const { name, price, stock } = req.body;
  const index = products.findIndex(p => p.id === parseInt(req.params.id));
  
  if (index === -1) {
    return res.status(404).json({ error: 'Product not found' });
  }
  
  products[index] = {
    ...products[index],
    name: name || products[index].name,
    price: price || products[index].price,
    stock: stock !== undefined ? stock : products[index].stock
  };
  
  writeJSON('products.json', products);
  res.json({ success: true });
});
// Курсы валют (обновляются раз в час)
let currencyRates = {
  RUB: 1,
  USD: 0,
  EUR: 0,
  BYN: 0,
  lastUpdate: null
};

async function updateCurrencyRates() {
  try {
    // Бесплатное API от exchangerate-api.com (не требует ключа)
    const response = await axios.get('https://api.exchangerate-api.com/v4/latest/RUB');
    const rates = response.data.rates;
    currencyRates = {
      RUB: 1,
      USD: rates.USD || 0.011,
      EUR: rates.EUR || 0.010,
      BYN: rates.BYN || 0.035,
      lastUpdate: new Date().toISOString()
    };
    console.log('✅ Курсы валют обновлены:', currencyRates);
  } catch (error) {
    console.error('❌ Ошибка получения курсов валют:', error.message);
    // Если API не работает, используем примерные курсы
    currencyRates = {
      RUB: 1,
      USD: 0.011,
      EUR: 0.010,
      BYN: 0.035,
      lastUpdate: new Date().toISOString()
    };
  }
}

// Обновляем курсы при старте
updateCurrencyRates();
// Обновляем каждый час
setInterval(updateCurrencyRates, 60 * 60 * 1000);

// API: получить курсы валют
app.get('/api/currency/rates', (req, res) => {
  res.json(currencyRates);
});

// Авто-пинг (будильник) — не даём Render усыпить приложение


function pingSelf() {
    const url = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
    axios.get(url).catch(err => console.log('⚠️ Пинг не удался:', err.message));
}

// Запускаем пинг через 30 секунд после старта
setTimeout(() => {
    pingSelf();
    setInterval(pingSelf, 10 * 60 * 1000); // каждые 10 минут
    console.log('✅ Авто-пинг запущен (каждые 10 минут)');
}, 30000);

app.listen(PORT, () => console.log(`✅ Profitly запущен на http://localhost:${PORT}`));