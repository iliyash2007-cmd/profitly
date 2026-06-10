const express = require('express');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const multer = require('multer');

const app = express();
app.use(express.json());
app.use(express.static('public'));

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const upload = multer({ dest: 'uploads/' });

// ========== ФУНКЦИИ ДЛЯ РАБОТЫ С ДАННЫМИ ПОЛЬЗОВАТЕЛЕЙ ==========
function getUserDataDir(userId) {
    const userDir = path.join(DATA_DIR, `user_${userId}`);
    if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
    return userDir;
}

function readUserJSON(userId, filename) {
    const filePath = path.join(getUserDataDir(userId), filename);
    if (!fs.existsSync(filePath)) return [];
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeUserJSON(userId, filename, data) {
    const filePath = path.join(getUserDataDir(userId), filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function initUserData(userId) {
    const userDir = getUserDataDir(userId);
    
    const defaultServices = [
        { id: 1, name: 'Маникюр', price: 3000 },
        { id: 2, name: 'Педикюр', price: 3500 },
        { id: 3, name: 'Стрижка', price: 2500 }
    ];
    
    const defaultStatuses = [
        { id: 1, name: 'Новый', color: '#3b82f6' },
        { id: 2, name: 'В переговорах', color: '#f59e0b' },
        { id: 3, name: 'Постоянный', color: '#10b981' },
        { id: 4, name: 'Неактивный', color: '#6b7280' },
        { id: 5, name: 'Ушедший', color: '#ef4444' }
    ];
    
    const files = {
    'clients.json': [],
    'services.json': defaultServices,  // для мастера
    'company_services.json': [],               // для компании (ИП)
    'products.json': [],
    'operations.json': [],
    'appointments.json': [],
    'masters.json': [],  // будет содержать { id, name, services: [] }
    'statuses.json': defaultStatuses,
    'settings.json': { role: 'master', theme: 'dark', firstLogin: true, currency: 'RUB' }
};
    
    for (const [filename, defaultData] of Object.entries(files)) {
        const filePath = path.join(userDir, filename);
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
        }
    }
}

// Middleware для проверки userId
app.use((req, res, next) => {
    const userId = req.query.userId || req.body.userId;
    if (userId) {
        initUserData(userId);
        req.userId = userId;
    }
    next();
});

// ========== API: НАСТРОЙКИ ==========
app.get('/api/settings', (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    res.json(readUserJSON(userId, 'settings.json'));
});

app.post('/api/settings', (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const settings = readUserJSON(userId, 'settings.json');
    const updated = { ...settings, ...req.body };
    writeUserJSON(userId, 'settings.json', updated);
    res.json({ success: true });
});

// ========== API: КЛИЕНТЫ ==========
app.get('/api/clients', (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    res.json(readUserJSON(userId, 'clients.json'));
});

app.post('/api/clients', (req, res) => {
    const { userId, name, phone, notes, type, status } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const clients = readUserJSON(userId, 'clients.json');
    clients.push({
        id: Date.now(),
        name: name || '',
        phone: phone || '',
        notes: notes || '',
        type: type || 'person',
        status: status || 'Новый',
        createdAt: new Date().toISOString()
    });
    writeUserJSON(userId, 'clients.json', clients);
    res.json({ success: true });
});

app.put('/api/clients/:id', (req, res) => {
    const { userId, name, phone, notes, type, status } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const clients = readUserJSON(userId, 'clients.json');
    const id = parseInt(req.params.id);
    const index = clients.findIndex(c => c.id === id);
    if (index === -1) return res.status(404).json({ error: 'Client not found' });
    clients[index] = { ...clients[index], name, phone, notes, type, status };
    writeUserJSON(userId, 'clients.json', clients);
    res.json({ success: true });
});

app.delete('/api/clients/:id', (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const clients = readUserJSON(userId, 'clients.json');
    const id = parseInt(req.params.id);
    const filtered = clients.filter(c => c.id !== id);
    writeUserJSON(userId, 'clients.json', filtered);
    res.json({ success: true });
});

app.patch('/api/clients/:id/status', (req, res) => {
    const { userId, status } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const clients = readUserJSON(userId, 'clients.json');
    const index = clients.findIndex(c => c.id === parseInt(req.params.id));
    if (index === -1) return res.status(404).json({ error: 'Client not found' });
    clients[index].status = status;
    writeUserJSON(userId, 'clients.json', clients);
    res.json({ success: true });
});

// ========== API: УСЛУГИ ==========
app.get('/api/services', (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    res.json(readUserJSON(userId, 'services.json'));
});

app.post('/api/services', (req, res) => {
    const { userId, name, price } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const services = readUserJSON(userId, 'services.json');
    services.push({ id: Date.now(), name, price });
    writeUserJSON(userId, 'services.json', services);
    res.json({ success: true });
});

app.put('/api/services/:id', (req, res) => {
    const { userId, name, price } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const services = readUserJSON(userId, 'services.json');
    const index = services.findIndex(s => s.id === parseInt(req.params.id));
    if (index === -1) return res.status(404).json({ error: 'Service not found' });
    services[index] = { ...services[index], name, price };
    writeUserJSON(userId, 'services.json', services);
    res.json({ success: true });
});

app.delete('/api/services/:id', (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const services = readUserJSON(userId, 'services.json');
    const filtered = services.filter(s => s.id !== parseInt(req.params.id));
    writeUserJSON(userId, 'services.json', filtered);
    res.json({ success: true });
});

// ========== API: ТОВАРЫ ==========
app.get('/api/products', (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    res.json(readUserJSON(userId, 'products.json'));
});

app.post('/api/products', (req, res) => {
    const { userId, name, price, stock } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const products = readUserJSON(userId, 'products.json');
    products.push({ id: Date.now(), name, price, stock: stock || 0 });
    writeUserJSON(userId, 'products.json', products);
    res.json({ success: true });
});

app.put('/api/products/:id', (req, res) => {
    const { userId, name, price, stock } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const products = readUserJSON(userId, 'products.json');
    const index = products.findIndex(p => p.id === parseInt(req.params.id));
    if (index === -1) return res.status(404).json({ error: 'Product not found' });
    products[index] = { ...products[index], name, price, stock: stock !== undefined ? stock : products[index].stock };
    writeUserJSON(userId, 'products.json', products);
    res.json({ success: true });
});

app.delete('/api/products/:id', (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const products = readUserJSON(userId, 'products.json');
    const filtered = products.filter(p => p.id !== parseInt(req.params.id));
    writeUserJSON(userId, 'products.json', filtered);
    res.json({ success: true });
});

// ========== API: ОПЕРАЦИИ ==========
app.get('/api/operations', (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    res.json(readUserJSON(userId, 'operations.json'));
});

app.post('/api/operations', (req, res) => {
    const { userId, clientId, clientName, serviceId, serviceName, amount } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const operations = readUserJSON(userId, 'operations.json');
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
    writeUserJSON(userId, 'operations.json', operations);
    res.json({ success: true });
});

app.delete('/api/operations/:id', (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const operations = readUserJSON(userId, 'operations.json');
    const filtered = operations.filter(op => op.id !== parseInt(req.params.id));
    writeUserJSON(userId, 'operations.json', filtered);
    res.json({ success: true });
});

app.put('/api/operations/:id', (req, res) => {
    const { userId, amount } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const operations = readUserJSON(userId, 'operations.json');
    const index = operations.findIndex(op => op.id === parseInt(req.params.id));
    if (index === -1) return res.status(404).json({ error: 'Operation not found' });
    operations[index].amount = amount;
    writeUserJSON(userId, 'operations.json', operations);
    res.json({ success: true });
});

// ========== API: СТАТУСЫ ==========
app.get('/api/statuses', (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    res.json(readUserJSON(userId, 'statuses.json'));
});

app.post('/api/statuses', (req, res) => {
    const { userId, id, name, color } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const statuses = readUserJSON(userId, 'statuses.json');
    if (id) {
        const index = statuses.findIndex(s => s.id === id);
        if (index !== -1) statuses[index] = { id, name, color };
    } else {
        statuses.push({ id: Date.now(), name, color: color || '#10b981' });
    }
    writeUserJSON(userId, 'statuses.json', statuses);
    res.json({ success: true });
});

app.delete('/api/statuses/:id', (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const statuses = readUserJSON(userId, 'statuses.json');
    const id = parseInt(req.params.id);
    const deletedStatus = statuses.find(s => s.id === id);
    const filtered = statuses.filter(s => s.id !== id);
    writeUserJSON(userId, 'statuses.json', filtered);
    
    if (deletedStatus) {
        const clients = readUserJSON(userId, 'clients.json');
        let updated = false;
        clients.forEach(client => {
            if (client.status === deletedStatus.name) {
                client.status = 'Новый';
                updated = true;
            }
        });
        if (updated) writeUserJSON(userId, 'clients.json', clients);
    }
    res.json({ success: true });
});

// ========== API: СТАТИСТИКА ==========
app.get('/api/stats', (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const operations = readUserJSON(userId, 'operations.json');
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

// ========== API: ГРАФИКИ ==========
app.get('/api/charts', (req, res) => {
    const { userId, period = 'month', clientNames = '' } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    
    let operations = readUserJSON(userId, 'operations.json');
    
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

// ========== API: МАСТЕРА (без услуг, только имя) ==========
app.get('/api/masters', (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    res.json(readUserJSON(userId, 'masters.json'));
});

app.post('/api/masters', (req, res) => {
    const { userId, name } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    if (!name) return res.status(400).json({ error: 'name required' });
    const masters = readUserJSON(userId, 'masters.json');
    const newMaster = { 
        id: Date.now(), 
        name: name,
        services: []   // 👈 ДОБАВЛЯЕМ ПУСТОЙ МАССИВ
    };
    masters.push(newMaster);
    writeUserJSON(userId, 'masters.json', masters);
    res.json({ success: true, master: newMaster });
});

app.put('/api/masters/:id', (req, res) => {
    const { userId, name, services } = req.body;
    
    console.log('📥 PUT /api/masters/:id', { userId, name, services, params: req.params });
    
    if (!userId) {
        return res.status(400).json({ error: 'userId required' });
    }
    
    const masters = readUserJSON(userId, 'masters.json');
    const id = parseInt(req.params.id);
    const index = masters.findIndex(m => m.id === id);
    
    if (index === -1) {
        return res.status(404).json({ error: 'Master not found', id: id, masters: masters });
    }
    
    // Обновляем имя, если передано
    if (name !== undefined) {
        masters[index].name = name;
    }
    
    // Обновляем услуги, если переданы
    if (services !== undefined) {
        masters[index].services = services;
        console.log('✅ Обновлены услуги мастера', masters[index].name, ':', services);
    }
    
    // Если поля services нет, создаём пустой массив
    if (!masters[index].services) {
        masters[index].services = [];
    }
    
    writeUserJSON(userId, 'masters.json', masters);
    res.json({ success: true, master: masters[index] });
});

app.delete('/api/masters/:id', (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const masters = readUserJSON(userId, 'masters.json');
    const filtered = masters.filter(m => m.id !== parseInt(req.params.id));
    writeUserJSON(userId, 'masters.json', filtered);
    res.json({ success: true });
});

// ========== API: УСЛУГИ КОМПАНИИ ==========
app.get('/api/company_services', (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    res.json(readUserJSON(userId, 'company_services.json'));
});

app.post('/api/company_services', (req, res) => {
    const { userId, name, price } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const services = readUserJSON(userId, 'company_services.json');
    services.push({ id: Date.now(), name, price });
    writeUserJSON(userId, 'company_services.json', services);
    res.json({ success: true });
});

app.put('/api/company_services/:id', (req, res) => {
    const { userId, name, price } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const services = readUserJSON(userId, 'company_services.json');
    const index = services.findIndex(s => s.id === parseInt(req.params.id));
    if (index === -1) return res.status(404).json({ error: 'Service not found' });
    services[index] = { ...services[index], name, price };
    writeUserJSON(userId, 'company_services.json', services);
    res.json({ success: true });
});

app.delete('/api/company_services/:id', (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const services = readUserJSON(userId, 'company_services.json');
    const filtered = services.filter(s => s.id !== parseInt(req.params.id));
    writeUserJSON(userId, 'company_services.json', filtered);
    res.json({ success: true });
});

// ========== КУРСЫ ВАЛЮТ ==========
let currencyRates = { RUB: 1, USD: 0.011, EUR: 0.010, BYN: 0.035 };

async function updateCurrencyRates() {
    try {
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
        console.error('❌ Ошибка обновления курсов:', error.message);
    }
}

updateCurrencyRates();
setInterval(updateCurrencyRates, 60 * 60 * 1000);

app.get('/api/currency/rates', (req, res) => {
    res.json(currencyRates);
});

// ========== ЭКСПОРТ ==========
app.get('/api/export/:type', (req, res) => {
    try {
        const XLSX = require('xlsx');
        const { type } = req.params;
        const { userId } = req.query;
        
        console.log(`📤 Экспорт ${type} для пользователя ${userId}`);
        
        if (!userId) {
            return res.status(400).json({ error: 'userId required' });
        }
        
        let data = [];
        let sheetName = '';
        let filename = '';
        
        switch(type) {
            case 'clients':
                const clients = readUserJSON(userId, 'clients.json');
                data = clients.map(c => ({
                    'ID': c.id || '',
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
                const services = readUserJSON(userId, 'services.json');
                data = services.map(s => ({
                    'ID': s.id || '',
                    'Название услуги': s.name || '',
                    'Цена (руб)': s.price || 0
                }));
                sheetName = 'Услуги';
                filename = 'services_export.xlsx';
                break;
                
            case 'products':
                const products = readUserJSON(userId, 'products.json');
                data = products.map(p => ({
                    'ID': p.id || '',
                    'Название товара': p.name || '',
                    'Цена (руб)': p.price || 0,
                    'Остаток (шт)': p.stock || 0
                }));
                sheetName = 'Товары';
                filename = 'products_export.xlsx';
                break;
                
            case 'operations':
                const operations = readUserJSON(userId, 'operations.json');
                const sorted = [...operations].sort((a, b) => new Date(b.date) - new Date(a.date));
                data = sorted.map(op => ({
                    'ID': op.id || '',
                    'Клиент': op.clientName || '',
                    'Услуга/Товар': op.serviceName || '',
                    'Сумма (руб)': op.amount || 0,
                    'Дата': op.date ? new Date(op.date).toLocaleDateString('ru-RU') : ''
                }));
                sheetName = 'Операции';
                filename = 'operations_export.xlsx';
                break;
                
            default:
                return res.status(400).json({ error: 'Invalid export type' });
        }
        
        if (data.length === 0) {
            const emptyRow = {};
            if (type === 'clients') {
                emptyRow['ID'] = ''; emptyRow['Имя'] = ''; emptyRow['Телефон'] = '';
                emptyRow['Примечания'] = ''; emptyRow['Тип'] = ''; emptyRow['Статус'] = '';
                emptyRow['Дата создания'] = '';
            }
            data = [emptyRow];
        }
        
        const ws = XLSX.utils.json_to_sheet(data);
        
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
        
    } catch (error) {
        console.error('❌ Ошибка экспорта:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========== ИМПОРТ ==========
app.post('/api/import/clients', upload.single('file'), (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    
    try {
        const XLSX = require('xlsx');
        const workbook = XLSX.readFile(req.file.path);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);
        
        const clients = readUserJSON(userId, 'clients.json');
        let imported = 0;
        
        rows.forEach(row => {
            const name = row['Имя'] || row['name'] || row['Наименование'];
            if (!name) return;
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
        
        writeUserJSON(userId, 'clients.json', clients);
        res.json({ success: true, imported });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/import/services', upload.single('file'), (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    
    try {
        const XLSX = require('xlsx');
        const workbook = XLSX.readFile(req.file.path);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);
        
        const services = readUserJSON(userId, 'services.json');
        let imported = 0;
        
        rows.forEach(row => {
            const name = row['Название услуги'] || row['name'] || row['Наименование'];
            const price = parseFloat(row['Цена (руб)'] || row['price'] || 0);
            if (!name) return;
            services.push({ id: Date.now() + imported, name, price });
            imported++;
        });
        
        writeUserJSON(userId, 'services.json', services);
        res.json({ success: true, imported });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/import/products', upload.single('file'), (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    
    try {
        const XLSX = require('xlsx');
        const workbook = XLSX.readFile(req.file.path);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);
        
        const products = readUserJSON(userId, 'products.json');
        let imported = 0;
        
        rows.forEach(row => {
            const name = row['Название товара'] || row['name'] || row['Наименование'];
            const price = parseFloat(row['Цена (руб)'] || row['price'] || 0);
            const stock = parseInt(row['Остаток (шт)'] || row['stock'] || 0);
            if (!name) return;
            products.push({ id: Date.now() + imported, name, price, stock });
            imported++;
        });
        
        writeUserJSON(userId, 'products.json', products);
        res.json({ success: true, imported });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========== API: ЗАПИСИ ==========
app.get('/api/appointments', (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    res.json(readUserJSON(userId, 'appointments.json'));
});

app.post('/api/appointments', (req, res) => {
    const { userId, clientId, clientName, serviceId, serviceName, masterId, date, time, duration, notes } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    
    const appointments = readUserJSON(userId, 'appointments.json');
    const newAppointment = {
        id: Date.now(),
        clientId: clientId || null,
        clientName,
        serviceId: serviceId || null,
        serviceName,
        masterId: masterId || null,
        date,
        time,
        duration: duration || 60,
        endTime: calculateEndTime(time, duration || 60),
        status: 'pending',
        notes: notes || '',
        createdAt: new Date().toISOString()
    };
    
    appointments.push(newAppointment);
    writeUserJSON(userId, 'appointments.json', appointments);
    res.json({ success: true, appointment: newAppointment });
});

app.delete('/api/appointments/:id', (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    
    const appointments = readUserJSON(userId, 'appointments.json');
    const filtered = appointments.filter(a => a.id !== parseInt(req.params.id));
    writeUserJSON(userId, 'appointments.json', filtered);
    res.json({ success: true });
});

app.patch('/api/appointments/:id/status', (req, res) => {
    const { userId, status } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    
    const appointments = readUserJSON(userId, 'appointments.json');
    const index = appointments.findIndex(a => a.id === parseInt(req.params.id));
    if (index === -1) return res.status(404).json({ error: 'Appointment not found' });
    
    appointments[index].status = status;
    writeUserJSON(userId, 'appointments.json', appointments);
    res.json({ success: true });
});

function calculateEndTime(startTime, durationMinutes) {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationMinutes;
    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
}

// ========== TELEGRAM БОТ ==========
const botToken = '8893186724:AAEMzCAgE5_wnILqEpC3gFAyMS_z7WxtwSk';

// Файл для хранения связок chatId + userId
const CHAT_LINKS_FILE = path.join(__dirname, 'data', 'chat_links.json');

function loadChatLinks() {
    try {
        if (fs.existsSync(CHAT_LINKS_FILE)) {
            return JSON.parse(fs.readFileSync(CHAT_LINKS_FILE, 'utf8'));
        }
    } catch (e) {
        console.error('Ошибка загрузки chat_links:', e.message);
    }
    return {};
}

function saveChatLinks(data) {
    fs.writeFileSync(CHAT_LINKS_FILE, JSON.stringify(data, null, 2));
}

// ========== TELEGRAM БОТ ==========
app.post('/webhook', express.json(), async (req, res) => {
    const { message } = req.body;
    
    if (!message || !message.text) {
        res.sendStatus(200);
        return;
    }
    
    const chatId = message.chat.id;
    const text = message.text;
    
    if (text === '/start') {
        const webAppUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
        
        // Сохраняем chatId для последующей привязки
        const chatLinks = loadChatLinks();
        chatLinks[chatId] = { 
            chatId: chatId,
            linked: false,
            createdAt: new Date().toISOString()
        };
        saveChatLinks(chatLinks);
        
        const inlineKeyboard = { 
            inline_keyboard: [[{ 
                text: '🚀 Открыть Profitly', 
                web_app: { url: `${webAppUrl}?chatId=${chatId}` }
            }]] 
        };
        
        try {
            await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                chat_id: chatId,
                text: '👋 Добро пожаловать в Profitly!\n\nНажмите на кнопку ниже, чтобы открыть приложение. Ваш Chat ID будет автоматически привязан.',
                reply_markup: inlineKeyboard
            });
            console.log('✅ Приветствие отправлено, chatId:', chatId);
        } catch (error) {
            console.error('❌ Ошибка Telegram:', error.message);
        }
    }
    
    else if (text === '/getid') {
        try {
            await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                chat_id: chatId,
                text: `🆔 Ваш Chat ID: \`${chatId}\`\n\nНажмите на него, чтобы скопировать.\n\nИспользуйте этот ID для привязки уведомлений в приложении.`,
                parse_mode: 'Markdown'
            });
            console.log('✅ Отправлен chatId:', chatId);
        } catch (error) {
            console.error('❌ Ошибка отправки chatId:', error.message);
        }
    }
    
    res.sendStatus(200);
});

async function setWebhook() {
    const botUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
    const webhookUrl = `${botUrl}/webhook`;
    try {
        await axios.post(`https://api.telegram.org/bot${botToken}/setWebhook`, { url: webhookUrl });
        console.log('✅ Webhook установлен:', webhookUrl);
    } catch (error) {
        console.error('❌ Ошибка установки webhook:', error.message);
    }
}

setTimeout(setWebhook, 3000);

// ========== API: ПРИВЯЗКА CHAT ID ==========
app.post('/api/bind-chat', (req, res) => {
    const { userId, chatId } = req.body;
    if (!userId || !chatId) return res.status(400).json({ error: 'userId и chatId обязательны' });
    
    const settings = readUserJSON(userId, 'settings.json');
    settings.chatId = String(chatId);
    if (!settings.notifications) {
        settings.notifications = {
            enabled: true,
            times: [
                { hours: 24, enabled: true },
                { hours: 8, enabled: true },
                { hours: 1, enabled: true }
            ]
        };
    }
    writeUserJSON(userId, 'settings.json', settings);
    
    const chatLinks = loadChatLinks();
    chatLinks[chatId] = { chatId, userId, linked: true, linkedAt: new Date().toISOString() };
    saveChatLinks(chatLinks);
    
    res.json({ success: true });
});

app.get('/api/chat-status', (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const settings = readUserJSON(userId, 'settings.json');
    res.json({ chatId: settings.chatId || null, notifications: settings.notifications || { enabled: false, times: [] } });
});

app.post('/api/notification-settings', (req, res) => {
    const { userId, notifications } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const settings = readUserJSON(userId, 'settings.json');
    settings.notifications = notifications;
    writeUserJSON(userId, 'settings.json', settings);
    res.json({ success: true });
});

// ========== НАПОМИНАНИЯ ==========
const REMINDERS_FILE = path.join(__dirname, 'data', 'reminders_sent.json');

function loadRemindersSent() {
    try { if (fs.existsSync(REMINDERS_FILE)) return JSON.parse(fs.readFileSync(REMINDERS_FILE, 'utf8')); } catch(e) {}
    return {};
}

function saveRemindersSent(data) { fs.writeFileSync(REMINDERS_FILE, JSON.stringify(data, null, 2)); }

async function checkAndSendReminders() {
    const remindersSent = loadRemindersSent();
    const userDirs = fs.readdirSync(DATA_DIR).filter(f => f.startsWith('user_'));
    
    for (const userDir of userDirs) {
        const userId = userDir.replace('user_', '');
        const settings = readUserJSON(userId, 'settings.json');
        if (!settings.chatId) continue;
        
        const notif = settings.notifications;
        if (!notif || !notif.enabled) continue;
        
        const appointments = readUserJSON(userId, 'appointments.json');
        const now = new Date();
        
        for (const app of appointments) {
            if (app.status === 'cancelled') continue;
            const appTime = new Date(`${app.date}T${app.time}`);
            const hoursUntil = (appTime - now) / (1000 * 60 * 60);
            
            for (const tc of notif.times) {
                if (!tc.enabled) continue;
                if (Math.abs(hoursUntil - tc.hours) < 0.5) {
                    const key = `${userId}_${app.id}_${tc.hours}h`;
                    if (remindersSent[key]) continue;
                    
                    const msg = `🔔 <b>Напоминание!</b>\n📅 ${app.date} в ${app.time}\n👤 ${app.clientName}\n💅 ${app.serviceName}\n⏰ Через ~${tc.hours}ч`;
                    
                    try {
                        await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, { chat_id: settings.chatId, text: msg, parse_mode: 'HTML' });
                        remindersSent[key] = { sentAt: new Date().toISOString() };
                        saveRemindersSent(remindersSent);
                    } catch(e) { console.error('Ошибка отправки:', e.message); }
                }
            }
        }
    }
}

setInterval(checkAndSendReminders, 30 * 60 * 1000);
setTimeout(checkAndSendReminders, 5000);

// ========== ЗАПУСК СЕРВЕРА ==========
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Profitly запущен на порту ${PORT}`));