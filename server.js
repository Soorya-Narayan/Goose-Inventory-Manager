const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'inventory.json');
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');

// Ensure data & uploads folders exist
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

app.use(cors());

// ─── Security Headers Middleware (MDN HTTP Observatory A+ Compliance) ───────
app.use((req, res, next) => {
  // 1. Content Security Policy (CSP)
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com data:; " +
    "img-src 'self' data: blob: https:; " +
    "connect-src 'self' https://zohoapis.in https://zohoapis.com https://zohoapis.eu; " +
    "frame-ancestors 'none'; " +
    "object-src 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self';"
  );

  // 2. Strict-Transport-Security (HSTS)
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

  // 3. Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // 4. X-Content-Type-Options
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // 5. X-Frame-Options
  res.setHeader('X-Frame-Options', 'DENY');

  // 6. X-XSS-Protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // 7. Permissions Policy
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=(), payment=()');

  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ─── Data Helpers ───────────────────────────────────────────────────────────
function readData() {
  try {
    if (!fs.existsSync(DATA_FILE)) return { items: [], requests: [], transactions: [] };
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const data = JSON.parse(raw) || {};
    if (!Array.isArray(data.items)) data.items = [];
    if (!Array.isArray(data.requests)) data.requests = [];
    if (!Array.isArray(data.transactions)) data.transactions = [];
    return data;
  } catch (e) {
    return { items: [], requests: [], transactions: [] };
  }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// ─── Items API ───────────────────────────────────────────────────────────────
app.get('/api/items', (req, res) => {
  const data = readData();
  res.json(data.items);
});

app.post('/api/items', (req, res) => {
  const data = readData();
  const item = {
    id: req.body.id || req.body.barcode || uuidv4(),
    name: req.body.name || 'Unnamed Material',
    sku: req.body.sku || req.body.barcode || `MEC-${Date.now().toString().slice(-4)}`,
    zone: req.body.zone || 'mechanical',
    category: req.body.category || 'General',
    quantity: parseInt(req.body.quantity) || 0,
    unit: req.body.unit || 'pcs',
    minStock: parseInt(req.body.minStock) || 0,
    location: req.body.location || 'A1',
    barcode: req.body.barcode || req.body.sku || '',
    rate: parseFloat(req.body.rate) || 0,
    purchaseRate: parseFloat(req.body.purchaseRate) || 0,
    hsn: req.body.hsn || '',
    notes: req.body.notes || '',
    imageUrl: req.body.imageUrl || '',
    addedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  data.items.push(item);
  writeData(data);
  res.status(201).json(item);
});

app.put('/api/items/:id', (req, res) => {
  const data = readData();
  const idx = data.items.findIndex(i => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Item not found' });
  
  data.items[idx] = {
    ...data.items[idx],
    ...req.body,
    updatedAt: new Date().toISOString()
  };
  writeData(data);
  res.json(data.items[idx]);
});

app.delete('/api/items/:id', (req, res) => {
  const data = readData();
  const idx = data.items.findIndex(i => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Item not found' });
  data.items.splice(idx, 1);
  writeData(data);
  res.json({ success: true });
});

app.post('/api/items/:id/adjust-stock', (req, res) => {
  const data = readData();
  const item = data.items.find(i => i.id === req.params.id || i.sku === req.params.id || i.barcode === req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  const { delta, type, notes, recipientName, projectName, allocationType } = req.body;
  const qtyChange = parseInt(delta) || 0;
  const currentQty = parseInt(item.quantity) || 0;
  const newQty = Math.max(0, currentQty + qtyChange);

  item.quantity = newQty;
  item.updatedAt = new Date().toISOString();

  if (!data.transactions) data.transactions = [];
  data.transactions.unshift({
    id: uuidv4(),
    itemId: item.id,
    itemName: item.name,
    sku: item.sku,
    type: type || (qtyChange >= 0 ? 'inward' : 'outward'),
    allocationType: allocationType || (qtyChange >= 0 ? 'inward' : 'project'),
    recipientName: recipientName || '',
    projectName: projectName || '',
    delta: qtyChange,
    newQuantity: newQty,
    notes: notes || '',
    timestamp: new Date().toISOString()
  });

  writeData(data);
  res.json({ success: true, item, newQuantity: newQty });
});

// ─── Transactions API ────────────────────────────────────────────────────────
app.get('/api/transactions', (req, res) => {
  const data = readData();
  const txns = data.transactions || [];
  res.json(txns.slice(0, 200)); // return last 200
});

// ─── Requests API ────────────────────────────────────────────────────────────
app.get('/api/requests', (req, res) => {
  const data = readData();
  res.json(data.requests.sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt)));
});

app.post('/api/requests', (req, res) => {
  const data = readData();
  const request = {
    id: uuidv4(),
    ...req.body,
    status: 'pending',
    requestedAt: new Date().toISOString(),
    processedAt: null,
    processedBy: null,
    managerNotes: ''
  };
  data.requests.push(request);
  writeData(data);
  res.status(201).json(request);
});

app.put('/api/requests/:id', (req, res) => {
  const data = readData();
  const idx = data.requests.findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Request not found' });

  const { status, processedBy, managerNotes } = req.body;
  const oldStatus = data.requests[idx].status;

  data.requests[idx] = {
    ...data.requests[idx],
    status,
    processedBy: processedBy || null,
    managerNotes: managerNotes || '',
    processedAt: new Date().toISOString()
  };

  // Deduct stock if approved and wasn't already approved
  if (status === 'approved' && oldStatus !== 'approved') {
    const itemIdx = data.items.findIndex(i => i.id === data.requests[idx].itemId);
    if (itemIdx !== -1) {
      data.items[itemIdx].quantity = Math.max(0, data.items[itemIdx].quantity - data.requests[idx].quantityRequested);
      data.items[itemIdx].updatedAt = new Date().toISOString();
    }
  }

  writeData(data);
  res.json(data.requests[idx]);
});

// ─── Image Upload API ────────────────────────────────────────────────────────
app.post('/api/upload', (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: 'No image data provided' });

    const matches = image.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: 'Invalid base64 image format' });
    }

    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const dataBuffer = Buffer.from(matches[2], 'base64');
    const safeFilename = `item_${Date.now()}_${uuidv4().slice(0, 8)}.${ext}`;
    const filePath = path.join(UPLOADS_DIR, safeFilename);

    fs.writeFileSync(filePath, dataBuffer);
    res.json({ imageUrl: `/uploads/${safeFilename}` });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// ─── Zoho Books Integration APIs ─────────────────────────────────────────────
function autoDetectZone(name = '', category = '') {
  const combined = (name + ' ' + category).toLowerCase();
  if (combined.match(/panel|wire|cable|relay|sensor|terminal|breaker|vfd|switch|fuse|transformer|electric/)) return 'electrical';
  if (combined.match(/valve|gasket|fitting|clamp|pipe|flange|bolt|nut|pump|bearing|motor|pneumatic|mechanical/)) return 'mechanical';
  return 'consumables';
}

app.post('/api/zoho/import-csv', (req, res) => {
  try {
    const { csvContent, rawItems } = req.body;
    let itemsToProcess = [];

    if (Array.isArray(rawItems) && rawItems.length > 0) {
      itemsToProcess = rawItems;
    } else if (csvContent) {
      // Parse CSV
      const lines = csvContent.split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length <= 1) return res.status(400).json({ error: 'CSV file is empty or missing data rows' });

      const parseCSVRow = (text) => {
        const row = [];
        let curr = '', inQ = false;
        for (let i = 0; i < text.length; i++) {
          const ch = text[i];
          if (ch === '"') inQ = !inQ;
          else if (ch === ',' && !inQ) { row.push(curr); curr = ''; }
          else curr += ch;
        }
        row.push(curr);
        return row;
      };

      const headers = parseCSVRow(lines[0]).map(h => h.trim().replace(/^"/, '').replace(/"$/, ''));
      for (let i = 1; i < lines.length; i++) {
        const row = parseCSVRow(lines[i]);
        if (row.length === 0) continue;
        const obj = {};
        headers.forEach((h, idx) => {
          obj[h] = row[idx] ? row[idx].trim().replace(/^"/, '').replace(/"$/, '') : '';
        });
        itemsToProcess.push(obj);
      }
    } else {
      return res.status(400).json({ error: 'No CSV content or items provided' });
    }

    const data = readData();
    let importedCount = 0;

    itemsToProcess.forEach(raw => {
      const itemId = raw['Item ID'] || raw['ID'] || raw['sku'] || raw['barcode'] || uuidv4();
      const itemName = raw['Item Name'] || raw['Name'] || raw['name'] || 'Zoho Item';
      const skuVal = raw['SKU'] || raw['barcode'] || itemId;
      const rateVal = parseFloat((raw['Rate'] || raw['rate'] || '0').replace(/[^0-9\.]/g, '')) || 0;
      const purchaseVal = parseFloat((raw['Purchase Rate'] || raw['purchaseRate'] || '0').replace(/[^0-9\.]/g, '')) || 0;
      const stockVal = parseInt(raw['Stock On Hand'] || raw['quantity'] || '0') || 0;
      const hsnVal = raw['HSN/SAC'] || raw['hsn'] || '';
      const unitVal = raw['Usage Unit'] || raw['Unit Name'] || raw['unit'] || 'pcs';
      const catVal = raw['Product Type'] || raw['Category'] || raw['category'] || 'Zoho Import';
      const locationVal = raw['Location Name'] || raw['Stock Location'] || raw['location'] || 'A1';

      const existingIdx = data.items.findIndex(i => i.id === itemId || i.sku === skuVal || (i.barcode && i.barcode === skuVal));
      
      const mappedItem = {
        id: itemId,
        name: itemName,
        sku: skuVal,
        barcode: skuVal,
        zone: autoDetectZone(itemName, catVal),
        category: catVal,
        quantity: stockVal,
        unit: unitVal,
        minStock: parseInt(raw['Reorder Point'] || '1') || 1,
        location: locationVal,
        rate: rateVal,
        purchaseRate: purchaseVal,
        hsn: hsnVal,
        notes: raw['Description'] || raw['Purchase Description'] || '',
        imageUrl: '',
        addedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (existingIdx >= 0) {
        data.items[existingIdx] = { ...data.items[existingIdx], ...mappedItem };
      } else {
        data.items.push(mappedItem);
      }
      importedCount++;
    });

    writeData(data);
    res.json({ success: true, count: importedCount, message: `Successfully imported ${importedCount} item(s) from Zoho Books!` });
  } catch (err) {
    console.error('Zoho Import Error:', err);
    res.status(500).json({ error: 'Failed to process Zoho Books import', details: err.message });
  }
});

// Zoho Books Live REST API Proxy Sync Endpoint
app.post('/api/zoho/sync-api', async (req, res) => {
  try {
    const { organizationId, authToken, domain = 'in' } = req.body;
    if (!organizationId || !authToken) {
      return res.status(400).json({ error: 'Organization ID and OAuth Bearer Token are required' });
    }

    const cleanToken = authToken.replace(/^Zoho-oauthtoken\s+/i, '').trim();
    let allZohoItems = [];
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= 20) {
      const apiUrl = `https://www.zohoapis.${domain}/books/v3/items?organization_id=${organizationId}&page=${page}&per_page=200`;
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Zoho-oauthtoken ${cleanToken}`,
          'Content-Type': 'application/json'
        }
      });

      const zohoData = await response.json();
      if (zohoData.code !== 0) {
        if (page === 1) return res.status(400).json({ error: zohoData.message || 'Zoho API call failed' });
        break;
      }

      const itemsOnPage = zohoData.items || [];
      allZohoItems.push(...itemsOnPage);

      if (zohoData.page_context && zohoData.page_context.has_more_page) {
        page++;
      } else {
        hasMore = false;
      }
    }

    const data = readData();
    let importedCount = 0;

    allZohoItems.forEach(item => {
      const itemId = item.item_id || item.sku || uuidv4();
      const mapped = {
        id: itemId,
        name: item.name || 'Zoho Item',
        sku: item.sku || item.item_id || itemId,
        barcode: item.sku || item.item_id || itemId,
        zone: autoDetectZone(item.name, item.category_name),
        category: item.category_name || item.product_type || 'Zoho Catalog',
        quantity: item.actual_available_stock ?? item.stock_on_hand ?? 0,
        unit: item.unit || 'pcs',
        minStock: parseInt(item.reorder_level) || 1,
        location: item.location_name || 'A1',
        rate: item.rate || 0,
        purchaseRate: item.purchase_rate || 0,
        hsn: item.hsn_or_sac || '',
        notes: item.description || item.purchase_description || '',
        imageUrl: item.image_document_id ? `https://www.zohoapis.${domain}/books/v3/items/${item.item_id}/image?organization_id=${organizationId}` : '',
        addedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const existingIdx = data.items.findIndex(i => i.id === itemId || i.sku === mapped.sku);
      if (existingIdx >= 0) {
        data.items[existingIdx] = { ...data.items[existingIdx], ...mapped };
      } else {
        data.items.push(mapped);
      }
      importedCount++;
    });

    writeData(data);
    res.json({ success: true, count: importedCount, message: `Synced ${importedCount} items directly from Zoho Books API!` });
  } catch (err) {
    console.error('Zoho API Sync Error:', err);
    res.status(500).json({ error: 'Zoho API connection failed', details: err.message });
  }
});

// ─── Delete Transaction ───────────────────────────────────────────────────────
app.delete('/api/transactions/:id', (req, res) => {
  const data = readData();
  if (!data.transactions) return res.json({ success: true });
  const before = data.transactions.length;
  data.transactions = data.transactions.filter(t => t.id !== req.params.id);
  writeData(data);
  res.json({ success: true, removed: before - data.transactions.length });
});

app.delete('/api/transactions', (req, res) => {
  const data = readData();
  data.transactions = [];
  writeData(data);
  res.json({ success: true, message: 'All transactions cleared' });
});



// ─── Server Start ────────────────────────────────────────────────────────────
const os = require('os');
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

app.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalIpAddress();
  console.log(`
  ═════════════════════════════════════════════════════════════════════
   🏭 Goose Store Inventory System — Online
   
   💻 Local Access (This PC):    http://localhost:${PORT}
   📱 Office Wi-Fi (Employees):  http://${localIp}:${PORT}
   
   Manager PIN: 1234
   Hardware Ready: Helett HT20 Scanner & Tej C15 Label Printer
  ═════════════════════════════════════════════════════════════════════
  `);
});
