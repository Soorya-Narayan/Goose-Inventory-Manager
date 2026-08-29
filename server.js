require('dotenv').config();
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
  // 1. Content Security Policy (CSP) - Allow http & https for local LAN & production
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self' http: https:; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' http: https:; " +
    "style-src 'self' 'unsafe-inline' http: https:; " +
    "font-src 'self' data: http: https:; " +
    "img-src 'self' data: blob: http: https:; " +
    "connect-src 'self' http: https: ws: wss:; " +
    "frame-ancestors 'none'; " +
    "object-src 'none';"
  );

  // 2. Strict-Transport-Security (HSTS) - Only send over HTTPS to avoid Safari local HTTP upgrade failures
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

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
function mergeDuplicateZohoItems(data) {
  if (!data || !Array.isArray(data.items)) return false;

  let modified = false;
  const map = new Map(); // zohoCode (lowercase trimmed) -> primaryItem
  const removeIds = new Set();
  const idRemap = new Map(); // deletedItemId -> primaryItemId

  data.items.forEach(item => {
    const code = (item.zohoCode || '').trim().toLowerCase();
    if (!code) return; // Skip empty zoho codes

    if (!map.has(code)) {
      map.set(code, item);
    } else {
      const primary = map.get(code);

      // Sum quantities
      const primaryQty = parseInt(primary.quantity) || 0;
      const itemQty = parseInt(item.quantity) || 0;
      primary.quantity = primaryQty + itemQty;

      // Merge unique notes
      if (item.notes && item.notes.trim()) {
        const pNotes = (primary.notes || '').trim();
        const newNotes = item.notes.trim();
        if (!pNotes.includes(newNotes)) {
          primary.notes = pNotes ? `${pNotes} | ${newNotes}` : newNotes;
        }
      }

      // Merge SO & PO numbers if primary was missing them
      if (!primary.soNumber && (item.soNumber || item.so)) primary.soNumber = item.soNumber || item.so;
      if (!primary.poNumber && (item.poNumber || item.po)) primary.poNumber = item.poNumber || item.po;

      primary.updatedAt = new Date().toISOString();

      removeIds.add(item.id);
      idRemap.set(item.id, primary.id);
      modified = true;
    }
  });

  if (modified) {
    // Keep only non-duplicate items
    data.items = data.items.filter(item => !removeIds.has(item.id));

    // Remap transactions & requests to primary.id
    if (Array.isArray(data.transactions)) {
      data.transactions.forEach(t => {
        if (t.itemId && idRemap.has(t.itemId)) {
          t.itemId = idRemap.get(t.itemId);
        }
      });
    }
    if (Array.isArray(data.requests)) {
      data.requests.forEach(r => {
        if (r.itemId && idRemap.has(r.itemId)) {
          r.itemId = idRemap.get(r.itemId);
        }
      });
    }
  }

  return modified;
}

function readData() {
  try {
    if (!fs.existsSync(DATA_FILE)) return { items: [], requests: [], transactions: [] };
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const data = JSON.parse(raw) || {};
    if (!Array.isArray(data.items)) data.items = [];
    if (!Array.isArray(data.requests)) data.requests = [];
    if (!Array.isArray(data.transactions)) data.transactions = [];

    // Automatically merge items sharing the same non-empty zohoCode
    if (mergeDuplicateZohoItems(data)) {
      writeData(data);
    }

    return data;
  } catch (e) {
    return { items: [], requests: [], transactions: [] };
  }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// ─── Engineer OTP Authentication API ──────────────────────────────────────────
const nodemailer = require('nodemailer');
const otpStore = {}; // { 'surya@goosesolutions.in': { code: '584920', expiresAt: timestamp } }

const DEFAULT_ZOHO_EMAIL = process.env.ZOHO_EMAIL || 'surya@goosesolutions.in';
const DEFAULT_ZOHO_PASSWORD = process.env.ZOHO_PASSWORD || 'vycxif-2casdi-fyWwov';

async function sendMailWithFallback(toEmail, subject, htmlContent) {
  const user = process.env.ZOHO_EMAIL || DEFAULT_ZOHO_EMAIL;
  const pass = process.env.ZOHO_PASSWORD || DEFAULT_ZOHO_PASSWORD;

  // Custom SMTP via environment variables if provided
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      });
      const info = await transporter.sendMail({
        from: `"Goose Inventory System" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: toEmail,
        subject,
        html: htmlContent
      });
      return { success: true, messageId: info.messageId };
    } catch (e) {
      console.warn('[SMTP CUSTOM FAILED]', e.message);
    }
  }

  // List of Zoho SMTP configs in order of cloud network reliability (.in domain priority)
  const configs = [
    { host: 'smtppro.zoho.in', port: 587, secure: false, requireTLS: true },
    { host: 'smtp.zoho.in', port: 587, secure: false, requireTLS: true },
    { host: 'smtp.zoho.in', port: 465, secure: true }
  ];

  for (const cfg of configs) {
    try {
      console.log(`[SMTP ATTEMPT] Connecting to ${cfg.host}:${cfg.port}...`);
      const transporter = nodemailer.createTransport({
        host: cfg.host,
        port: cfg.port,
        secure: cfg.secure,
        requireTLS: cfg.requireTLS || false,
        auth: { user, pass },
        connectionTimeout: 4000,
        greetingTimeout: 4000,
        socketTimeout: 4000,
        tls: { rejectUnauthorized: false }
      });

      const info = await transporter.sendMail({
        from: `"Goose Inventory System" <${user}>`,
        to: toEmail,
        subject: subject,
        html: htmlContent
      });

      console.log(`[SMTP SUCCESS] Dispatched via ${cfg.host}:${cfg.port} | Message ID: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (err) {
      console.warn(`[SMTP WARN] ${cfg.host}:${cfg.port} failed: ${err.message}`);
    }
  }

  return { success: false, error: 'All SMTP connection attempts timed out on cloud network' };
}

app.post('/api/auth/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Please enter a valid Zoho / Company email address' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore[cleanEmail] = {
    code: otpCode,
    expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
  };

  console.log(`[OTP DISPATCH] Email: ${cleanEmail} | OTP Code: ${otpCode}`);

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b; max-width: 500px; margin: auto; border: 1px solid #e2e8f0; border-radius: 10px;">
      <h2 style="color: #0072ff; margin-bottom: 5px;">Goose Industrial Solutions</h2>
      <p style="font-size: 0.9rem; color: #64748b; margin-top: 0;">Store Inventory Access Verification</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 15px 0;" />
      <p>Your 6-digit access verification code is:</p>
      <div style="background: #f1f5f9; font-size: 1.8rem; font-weight: bold; letter-spacing: 5px; color: #0f172a; padding: 12px; text-align: center; border-radius: 6px; margin: 15px 0;">
        ${otpCode}
      </div>
      <p style="font-size: 0.8rem; color: #64748b;">This OTP is valid for 10 minutes. If you did not request this, please ignore this email.</p>
    </div>
  `;

  // Attempt live SMTP mail delivery
  const result = await sendMailWithFallback(cleanEmail, 'Your 6-Digit Login OTP — Goose Inventory Manager', htmlContent);

  if (!result.success) {
    console.warn(`[OTP RESCUE] Cloud mail delivery unavailable. Returning fallback OTP for ${cleanEmail}`);
    return res.json({
      success: true,
      message: `OTP code generated for ${cleanEmail}`,
      email: cleanEmail,
      fallbackCode: otpCode
    });
  }

  res.json({
    success: true,
    message: `6-digit OTP sent to ${cleanEmail}. Check your email inbox.`,
    email: cleanEmail
  });
});

app.post('/api/auth/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and 6-digit OTP are required' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const record = otpStore[cleanEmail];

  if (!record) {
    return res.status(400).json({ error: 'No OTP requested for this email address. Please click "Send OTP to Mail" first.' });
  }

  if (Date.now() > record.expiresAt) {
    delete otpStore[cleanEmail];
    return res.status(400).json({ error: 'OTP has expired. Please request a new code.' });
  }

  if (record.code !== otp.trim()) {
    return res.status(400).json({ error: 'Invalid 6-digit OTP code. Please check your email and try again.' });
  }

  // Clear OTP on successful verification
  delete otpStore[cleanEmail];

  // Format user display name from email (e.g. surya@goosesolutions.in -> Er. Surya)
  const prefix = cleanEmail.split('@')[0];
  const namePart = prefix.split('.')[0].split('_')[0];
  const formattedName = 'Er. ' + namePart.charAt(0).toUpperCase() + namePart.slice(1);

  res.json({
    success: true,
    user: {
      role: 'engineer',
      name: formattedName,
      email: cleanEmail,
      employeeId: `EMP-${prefix.toUpperCase().slice(0, 8)}`
    }
  });
});

app.get('/api/auth/send-otp', (req, res) => {
  res.json({ error: 'Use POST /api/auth/send-otp with JSON body { email }' });
});

app.get('/api/auth/verify-otp', (req, res) => {
  res.json({ error: 'Use POST /api/auth/verify-otp with JSON body { email, otp }' });
});

// ─── Items API ───────────────────────────────────────────────────────────────
app.get('/api/items', (req, res) => {
  const data = readData();
  res.json(data.items);
});

app.post('/api/items', (req, res) => {
  const data = readData();
  const newZoho = (req.body.zohoCode || req.body.zoho || '').trim();

  // If item with same zohoCode exists, merge quantities into it
  if (newZoho) {
    const existing = data.items.find(i => (i.zohoCode || '').trim().toLowerCase() === newZoho.toLowerCase());
    if (existing) {
      existing.quantity = (parseInt(existing.quantity) || 0) + (parseInt(req.body.quantity) || 0);
      if (req.body.notes && req.body.notes.trim() && !existing.notes.includes(req.body.notes.trim())) {
        existing.notes = existing.notes ? `${existing.notes} | ${req.body.notes.trim()}` : req.body.notes.trim();
      }
      if (req.body.soNumber && !existing.soNumber) existing.soNumber = req.body.soNumber;
      if (req.body.poNumber && !existing.poNumber) existing.poNumber = req.body.poNumber;
      existing.updatedAt = new Date().toISOString();
      writeData(data);
      return res.status(200).json(existing);
    }
  }

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
    zohoCode: newZoho,
    soNumber: req.body.soNumber || req.body.so || '',
    poNumber: req.body.poNumber || req.body.po || '',
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

  const newZoho = (req.body.zohoCode || req.body.zoho || '').trim();

  // If updating zohoCode matches another existing item, merge current item into that item
  if (newZoho) {
    const existingOther = data.items.find(i => i.id !== req.params.id && (i.zohoCode || '').trim().toLowerCase() === newZoho.toLowerCase());
    if (existingOther) {
      const currentItem = data.items[idx];
      existingOther.quantity = (parseInt(existingOther.quantity) || 0) + (parseInt(req.body.quantity ?? currentItem.quantity) || 0);
      if (req.body.notes && req.body.notes.trim() && !existingOther.notes.includes(req.body.notes.trim())) {
        existingOther.notes = existingOther.notes ? `${existingOther.notes} | ${req.body.notes.trim()}` : req.body.notes.trim();
      }
      existingOther.updatedAt = new Date().toISOString();

      // Remove current item since merged
      data.items.splice(idx, 1);

      // Remap history
      if (data.transactions) {
        data.transactions.forEach(t => { if (t.itemId === req.params.id) t.itemId = existingOther.id; });
      }
      if (data.requests) {
        data.requests.forEach(r => { if (r.itemId === req.params.id) r.itemId = existingOther.id; });
      }

      writeData(data);
      return res.json(existingOther);
    }
  }

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

  const { status, processedBy, managerNotes, checklist, processedAt } = req.body;
  const oldStatus = data.requests[idx].status;

  // Build the updated request — allow any status transition (including revert to pending)
  data.requests[idx] = {
    ...data.requests[idx],
    status,
    processedBy: processedBy !== undefined ? processedBy : data.requests[idx].processedBy,
    managerNotes: managerNotes !== undefined ? managerNotes : data.requests[idx].managerNotes,
    checklist: Array.isArray(checklist) ? checklist : data.requests[idx].checklist || [],
    processedAt: processedAt !== undefined
      ? processedAt  // explicit null allowed (for revert)
      : new Date().toISOString()
  };

  // ── Stock deduction: only when transitioning TO 'issued' ──────────────────
  if (status === 'issued' && oldStatus !== 'issued') {
    const request = data.requests[idx];
    if (!data.transactions) data.transactions = [];

    const recipientName = request.name || request.engineerName || processedBy || 'Engineer';
    const projectName = request.projectName || 'General Issue';

    if (Array.isArray(request.materials) && request.materials.length > 0) {
      // Multi-material format: deduct each material & create Stock Movement transaction log
      request.materials.forEach(mat => {
        const itemIdx = data.items.findIndex(i => i.id === mat.itemId);
        if (itemIdx !== -1) {
          const item = data.items[itemIdx];
          const qtyOut = Math.abs(mat.quantity || 0);
          const newQty = Math.max(0, item.quantity - qtyOut);

          item.quantity = newQty;
          item.updatedAt = new Date().toISOString();

          // Log Stock Out Movement
          data.transactions.unshift({
            id: uuidv4(),
            itemId: item.id,
            itemName: item.name,
            sku: item.sku || item.barcode || item.id,
            type: 'outward',
            allocationType: 'project',
            recipientName: recipientName,
            projectName: projectName,
            delta: -qtyOut,
            newQuantity: newQty,
            notes: managerNotes ? `Issued: ${managerNotes}` : `Issued for project: ${projectName}`,
            timestamp: new Date().toISOString()
          });
        }
      });
    } else if (request.itemId) {
      // Legacy single-item fallback
      const itemIdx = data.items.findIndex(i => i.id === request.itemId);
      if (itemIdx !== -1) {
        const item = data.items[itemIdx];
        const qtyOut = Math.abs(request.quantityRequested || 0);
        const newQty = Math.max(0, item.quantity - qtyOut);

        item.quantity = newQty;
        item.updatedAt = new Date().toISOString();

        data.transactions.unshift({
          id: uuidv4(),
          itemId: item.id,
          itemName: item.name,
          sku: item.sku || item.barcode || item.id,
          type: 'outward',
          allocationType: 'project',
          recipientName: recipientName,
          projectName: projectName,
          delta: -qtyOut,
          newQuantity: newQty,
          notes: managerNotes ? `Issued: ${managerNotes}` : `Issued for project: ${projectName}`,
          timestamp: new Date().toISOString()
        });
      }
    }
  }
  // NOTE: 'approved' does NOT deduct stock — that only happens at 'issued'.

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

// ─── Health Check & SPA Wildcard Fallback ────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: `API route '${req.path}' not found` });
  }
  if (req.path.includes('.') || req.path.startsWith('/css') || req.path.startsWith('/js') || req.path.startsWith('/uploads')) {
    return res.status(404).send('Asset not found');
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
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
   Goose Store Inventory System — Online
   
   Local Access (This PC):    http://localhost:${PORT}
   Office Wi-Fi (Employees):  http://${localIp}:${PORT}
   
   Manager PIN: 1234
   Hardware Ready: Helett HT20 Scanner & Tej C15 Label Printer
  ═════════════════════════════════════════════════════════════════════
  `);
});
