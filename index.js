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
if (!fs.existsSync(path.join(DATA_DIR, 'statuses.json'))) {
  writeJSON('statuses.json', [
    { id: 1, name: 'Новый', color: '#3b82f6' },
    { id: 2, name: 'В переговорах', color: '#f59e0b' },
    { id: 3, name: 'Постоянный', color: '#10b981' },
    { id: 4, name: 'Неактивный', color: '#6b7280' },
    { id: 5, name: 'Ушедший', color: '#ef4444' }
  ]);
}

if (!fs.existsSync(path.join(DATA_DIR, 'statuses.json'))) {
  writeJSON('statuses.json', [
    { id: 1, name: 'Новый', color: '#3b82f6' },
    { id: 2, name: 'В переговорах', color: '#f59e0b' },
    { id: 3, name: 'Постоянный', color: '#10b981' },
    { id: 4, name: 'Неактивный', color: '#6b7280' },
    { id: 5, name: 'Ушедший', color: '#ef4444' }
  ]);
}

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
  const { name, phone, notes, type, status } = req.body;
  clients.push({
    id: Date.now(),
    name: name || '',
    phone: phone || '',
    notes: notes || '',
    type: type || 'person',
    status: status || 'Новый',
    createdAt: new Date().toISOString()
  });
  writeJSON('clients.json', clients);
  res.json({ success: true });
});

app.put('/api/clients/:id', (req, res) => {
  const clients = readJSON('clients.json');
  const { name, phone, notes, type, status } = req.body;
  const id = parseInt(req.params.id);
  const index = clients.findIndex(c => c.id === id);
  if (index === -1) return res.status(404).json({ error: 'Client not found' });
  clients[index] = {
    ...clients[index],
    name: name !== undefined ? name : clients[index].name,
    phone: phone !== undefined ? phone : clients[index].phone,
    notes: notes !== undefined ? notes : clients[index].notes,
    type: type !== undefined ? type : clients[index].type,
    status: status !== undefined ? status : clients[index].status
  };
  writeJSON('clients.json', clients);
  res.json({ success: true });
});

app.delete('/api/clients/:id', (req, res) => {
  const clients = readJSON('clients.json');
  const id = parseInt(req.params.id);
  const filtered = clients.filter(c => c.id !== id);
  writeJSON('clients.json', filtered);
  res.json({ success: true });
});

app.patch('/api/clients/:id/status', (req, res) => {
  const clients = readJSON('clients.json');
  const { status } = req.body;
  const index = clients.findIndex(c => c.id === parseInt(req.params.id));
  if (index === -1) return res.status(404).json({ error: 'Client not found' });
  clients[index].status = status;
  writeJSON('clients.json', clients);
  res.json({ success: true });
});

// API: услуги
app.get('/api/services', (req, res) => {
  res.json(readJSON('services.json'));
});

app.post('/api/services', (req, res) => {
  const services = readJSON('services.json');
  const { name, price } = req.body;
  services.push({ id: Date.now(), name, price });
  writeJSON('services.json', services);
  res.json({ success: true });
});

app.put('/api/services/:id', (req, res) => {
  const services = readJSON('services.json');
  const { name, price } = req.body;
  const index = services.findIndex(s => s.id === parseInt(req.params.id));
  if (index === -1) return res.status(404).json({ error: 'Service not found' });
  services[index] = { ...services[index], name, price };
  writeJSON('services.json', services);
  res.json({ success: true });
});

app.delete('/api/services/:id', (req, res) => {
  const services = readJSON('services.json');
  const filtered = services.filter(s => s.id !== parseInt(req.params.id));
  writeJSON('services.json', filtered);
  res.json({ success: true });
});

// API: товары
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

app.put('/api/products/:id', (req, res) => {
  const products = readJSON('products.json');
  const { name, price, stock } = req.body;
  const index = products.findIndex(p => p.id === parseInt(req.params.id));
  if (index === -1) return res.status(404).json({ error: 'Product not found' });
  products[index] = { ...products[index], name, price, stock: stock !== undefined ? stock : products[index].stock };
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

app.delete('/api/operations/:id', (req, res) => {
  const operations = readJSON('operations.json');
  const filtered = operations.filter(op => op.id !== parseInt(req.params.id));
  writeJSON('operations.json', filtered);
  res.json({ success: true });
});

app.put('/api/operations/:id', (req, res) => {
  const operations = readJSON('operations.json');
  const { amount } = req.body;
  const index = operations.findIndex(op => op.id === parseInt(req.params.id));
  if (index === -1) return res.status(404).json({ error: 'Operation not found' });
  operations[index].amount = amount;
  writeJSON('operations.json', operations);
  res.json({ success: true });
});

// API: статусы
app.get('/api/statuses', (req, res) => {
  res.json(readJSON('statuses.json'));
});

app.post('/api/statuses', (req, res) => {
  const statuses = readJSON('statuses.json');
  const { id, name, color } = req.body;
  if (id) {
    const index = statuses.findIndex(s => s.id === id);
    if (index !== -1) statuses[index] = { id, name, color };
  } else {
    statuses.push({ id: Date.now(), name, color: color || '#10b981' });
  }
  writeJSON('statuses.json', statuses);
  res.json({ success: true });
});

app.delete('/api/statuses/:id', (req, res) => {
  const statuses = readJSON('statuses.json');
  const filtered = statuses.filter(s => s.id !== parseInt(req.params.id));
  writeJSON('statuses.json', filtered);
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

// API: данные для графиков
app.get('/api/charts', (req, res) => {
  let operations = readJSON('operations.json');
  const { period = 'month', clientNames = '' } = req.query;
  
  if (clientNames) {
    const names = decodeURIComponent(clientNames).split(',');
    operations = operations.filter(op => names.includes(op.clientName));
  }
  
  const now = new Date();
  let startDate = new Date();
  switch (period) {
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'quarter':
      const quarter = Math.floor(now.getMonth() / 3);
      startDate = new Date(now.getFullYear(), quarter * 3, 1);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
  }
  
  operations = operations.filter(op => new Date(op.date) >= startDate);
  
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dailyIncome = {};
  for (let i = 1; i <= daysInMonth; i++) dailyIncome[i] = 0;
  
  const weekdayIncome = { 'Пн': 0, 'Вт': 0, 'Ср': 0, 'Чт': 0, 'Пт': 0, 'Сб': 0, 'Вс': 0 };
  
  operations.forEach(op => {
    const date = new Date(op.date);
    if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) {
      dailyIncome[date.getDate()] = (dailyIncome[date.getDate()] || 0) + op.amount;
    }
    const weekdayMap = { 1: 'Пн', 2: 'Вт', 3: 'Ср', 4: 'Чт', 5: 'Пт', 6: 'Сб', 0: 'Вс' };
    const weekday = weekdayMap[date.getDay()];
    if (weekday) weekdayIncome[weekday] = (weekdayIncome[weekday] || 0) + op.amount;
  });
  
  const dailyIncomeArray = Object.entries(dailyIncome).map(([day, total]) => ({ day: parseInt(day), total }));
  dailyIncomeArray.sort((a, b) => a.day - b.day);
  
  const clientTotals = {};
  operations.forEach(op => {
    clientTotals[op.clientName] = (clientTotals[op.clientName] || 0) + op.amount;
  });
  const topClients = Object.entries(clientTotals)
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
  
  res.json({ dailyIncome: dailyIncomeArray, weekdayIncome, topClients });
});

// Курсы валют
let currencyRates = { RUB: 1, USD: 0, EUR: 0, BYN: 0 };

async function updateCurrencyRates() {
  try {
    const response = await axios.get('https://api.exchangerate-api.com/v4/latest/RUB');
    const rates = response.data.rates;
    currencyRates = { RUB: 1, USD: rates.USD || 0.011, EUR: rates.EUR || 0.010, BYN: rates.BYN || 0.035, lastUpdate: new Date().toISOString() };
  } catch (error) {
    currencyRates = { RUB: 1, USD: 0.011, EUR: 0.010, BYN: 0.035, lastUpdate: new Date().toISOString() };
  }
}

updateCurrencyRates();
setInterval(updateCurrencyRates, 60 * 60 * 1000);

app.get('/api/currency/rates', (req, res) => {
  res.json(currencyRates);
});

// Авто-пинг
function pingSelf() {
  const url = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
  axios.get(url).catch(err => console.log('⚠️ Пинг не удался:', err.message));
}

setTimeout(() => {
  pingSelf();
  setInterval(pingSelf, 10 * 60 * 1000);
  console.log('✅ Авто-пинг запущен (каждые 10 минут)');
}, 30000);

// API: получить все статусы
app.get('/api/statuses', (req, res) => {
    const statuses = readJSON('statuses.json');
    res.json(statuses);
});

// API: добавить/обновить статус
app.post('/api/statuses', (req, res) => {
    const statuses = readJSON('statuses.json');
    const { id, name, color } = req.body;
    if (id) {
        const index = statuses.findIndex(s => s.id === id);
        if (index !== -1) statuses[index] = { ...statuses[index], name, color };
    } else {
        statuses.push({ id: Date.now(), name, color: color || '#10b981' });
    }
    writeJSON('statuses.json', statuses);
    res.json({ success: true });
});

// API: удалить статус
app.delete('/api/statuses/:id', (req, res) => {
    const statuses = readJSON('statuses.json');
    const id = parseInt(req.params.id);
    const deletedStatus = statuses.find(s => s.id === id);
    const filtered = statuses.filter(s => s.id !== id);
    writeJSON('statuses.json', filtered);
    
    // Если статус удалён, меняем у клиентов статус на "Новый"
    if (deletedStatus) {
        const clients = readJSON('clients.json');
        let updated = false;
        clients.forEach(client => {
            if (client.status === deletedStatus.name) {
                client.status = 'Новый';
                updated = true;
            }
        });
        if (updated) writeJSON('clients.json', clients);
    }
    
    res.json({ success: true });
});

const PORT = process.env.PORT || 3000;

// API: экспорт в Excel
app.get('/api/export/:type', (req, res) => {
    const XLSX = require('xlsx');
    const { type } = req.params;
    
    let data = [];
    let sheetName = '';
    let filename = '';
    
    switch(type) {
        case 'clients':
            const clients = readJSON('clients.json');
            data = clients.map(c => ({
                'ID': c.id,
                'Имя': c.name || '',
                'Телефон': c.phone || '',
                'Примечания': c.notes || '',
                'Тип': c.type === 'company' ? 'Компания' : 'Физ. лицо',
                'Статус': c.status || 'Новый',
                'Дата создания': c.createdAt ? new Date(c.createdAt).toLocaleDateString('ru-RU') : new Date().toLocaleDateString('ru-RU')
            }));
            sheetName = 'Клиенты';
            filename = 'clients_export.xlsx';
            break;
            
        case 'services':
            const services = readJSON('services.json');
            data = services.map(s => ({
                'ID': s.id,
                'Название услуги': s.name || '',
                'Цена (руб)': s.price || 0
            }));
            sheetName = 'Услуги';
            filename = 'services_export.xlsx';
            break;
            
        case 'products':
            const products = readJSON('products.json');
            data = products.map(p => ({
                'ID': p.id,
                'Название товара': p.name || '',
                'Цена (руб)': p.price || 0,
                'Остаток (шт)': p.stock || 0
            }));
            sheetName = 'Товары';
            filename = 'products_export.xlsx';
            break;
            
        case 'operations':
            const operations = readJSON('operations.json');
            const sorted = [...operations].sort((a, b) => new Date(b.date) - new Date(a.date));
            data = sorted.map(op => ({
                'ID': op.id,
                'Клиент': op.clientName || '',
                'Услуга/Товар': op.serviceName || op.productName || '',
                'Сумма (руб)': op.amount || 0,
                'Дата': op.date ? new Date(op.date).toLocaleDateString('ru-RU') : ''
            }));
            sheetName = 'Операции';
            filename = 'operations_export.xlsx';
            break;
            
        default:
            return res.status(400).json({ error: 'Invalid export type' });
    }
    
    // Создаём worksheet
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Находим индекс колонки ID (обычно первая, 'A')
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
    const idCol = 'A';
    
    // Применяем текстовый формат ко всей колонке ID
    for (let row = range.s.r + 1; row <= range.e.r; row++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: 0 });
        if (ws[cellAddress]) {
            ws[cellAddress].t = 's'; // меняем тип на string
            ws[cellAddress].z = '@'; // текстовый формат
        }
    }
    
    // Автоширина колонок
    const colWidths = [];
    if (data.length > 0) {
        Object.keys(data[0]).forEach((key, idx) => {
            let maxLen = key.length;
            data.forEach(row => {
                const val = String(row[key] || '');
                maxLen = Math.max(maxLen, val.length);
            });
            colWidths.push({ wch: Math.min(maxLen + 2, 30) });
        });
        ws['!cols'] = colWidths;
    }
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
});

const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

// API: импорт клиентов из файла
app.post('/api/import/clients', upload.single('file'), (req, res) => {
    const XLSX = require('xlsx');
    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);
    
    const clients = readJSON('clients.json');
    let imported = 0;
    let errors = [];
    
    rows.forEach(row => {
        const name = row['Имя'] || row['name'] || row['Наименование'];
        if (!name) {
            errors.push(`Пропущена строка: нет имени`);
            return;
        }
        
        clients.push({
            id: Date.now() + imported,
            name: name,
            phone: row['Телефон'] || row['phone'] || '',
            notes: row['Примечания'] || row['notes'] || '',
            type: (row['Тип'] || row['type'] || 'Физ. лицо') === 'Компания' ? 'company' : 'person',
            status: row['Статус'] || row['status'] || 'Новый',
            createdAt: new Date().toISOString()
        });
        imported++;
    });
    
    writeJSON('clients.json', clients);
    res.json({ success: true, imported, errors });
});

// API: импорт услуг
app.post('/api/import/services', upload.single('file'), (req, res) => {
    const XLSX = require('xlsx');
    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);
    
    const services = readJSON('services.json');
    let imported = 0;
    
    rows.forEach(row => {
        const name = row['Название услуги'] || row['name'] || row['Наименование'];
        const price = parseFloat(row['Цена (руб)'] || row['price'] || 0);
        if (!name) return;
        
        services.push({ id: Date.now() + imported, name, price });
        imported++;
    });
    
    writeJSON('services.json', services);
    res.json({ success: true, imported });
});

// API: импорт товаров
app.post('/api/import/products', upload.single('file'), (req, res) => {
    const XLSX = require('xlsx');
    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);
    
    const products = readJSON('products.json');
    let imported = 0;
    
    rows.forEach(row => {
        const name = row['Название товара'] || row['name'] || row['Наименование'];
        const price = parseFloat(row['Цена (руб)'] || row['price'] || 0);
        const stock = parseInt(row['Остаток (шт)'] || row['stock'] || 0);
        if (!name) return;
        
        products.push({ id: Date.now() + imported, name, price, stock });
        imported++;
    });
    
    writeJSON('products.json', products);
    res.json({ success: true, imported });
});

// ========== НАСТРОЙКА TELEGRAM БОТА ==========
const botToken = '8893186724:AAEMzCAgE5_wnILqEpC3gFAyMS_z7WxtwSk';
const botUrl = 'https://profitly-uyyb.onrender.com';

// Эндпоинт для обработки команд от Telegram
app.post('/webhook', async (req, res) => {
    const { message } = req.body;
    if (message && message.text === '/start') {
        const chatId = message.chat.id;
        const webAppUrl = 'https://t.me/ProfitlyBot/Profitly'; // Убедись, что имя бота правильное
        
        const inlineKeyboard = {
            inline_keyboard: [[
                { text: '🚀 Открыть Profitly', web_app: { url: webAppUrl } }
            ]]
        };
        
        try {
            await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                chat_id: chatId,
                text: 'Добро пожаловать в Profitly! Нажмите на кнопку ниже, чтобы открыть приложение:',
                reply_markup: inlineKeyboard
            });
            console.log(`✅ Сообщение отправлено в чат ${chatId}`);
        } catch (error) {
            console.error('❌ Ошибка отправки сообщения:', error.message);
        }
    }
    res.sendStatus(200);
});

// Установка webhook при запуске
async function setWebhook() {
    const webhookUrl = `${botUrl}/webhook`;
    try {
        const response = await axios.post(`https://api.telegram.org/bot${botToken}/setWebhook`, {
            url: webhookUrl
        });
        console.log(`✅ Webhook установлен: ${webhookUrl}`, response.data);
    } catch (error) {
        console.error('❌ Ошибка установки webhook:', error.message);
    }
}

// Запускаем установку webhook через 3 секунды после старта
setTimeout(setWebhook, 3000);

app.listen(PORT, () => console.log(`✅ Profitly запущен на http://localhost:${PORT}`));