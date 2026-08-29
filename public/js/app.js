// ═══════════════════════════════════════════════════════════════════════════════
//  StoreIMS — Application Logic with Helett HT20 & Tej C15 Hardware Integration
// ═══════════════════════════════════════════════════════════════════════════════

const state = {
  user: null,
  currentView: 'dashboard',
  items: [],
  requests: [],
  stats: {},
  filters: { zone: 'all', stockAvailability: 'all', category: '' },
  searchQuery: '',
  editingItemId: null,
  requestingItemId: null,
  pendingDeleteId: null,
  printItemId: null,
  zohoEnabled: localStorage.getItem('ims_zoho_enabled') !== 'false',
  // Bluetooth printer
  printerDevice: null,
  printerConnected: false,
  // Issue checklist
  activeChecklistRequestId: null,
  activeChecklist: [],
};

// ─── API Helpers ─────────────────────────────────────────────────────────────
async function safeFetchJson(url, options = {}) {
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || `Server error (${res.status})`);
      return data;
    }
    const text = await res.text();
    if (!res.ok) {
      throw new Error(res.status === 404 ? 'Endpoint not found on server' : `Server error (${res.status})`);
    }
    try {
      return JSON.parse(text);
    } catch (e) {
      throw new Error('Server returned non-JSON response');
    }
  } catch (err) {
    if (err && err.message && err.message.toLowerCase().includes('load failed')) {
      throw new Error('Network error on Safari. Please check server URL & connection.');
    }
    throw err;
  }
}

const api = {
  get:    async (url) => safeFetchJson(url),
  post:   async (url, data) => safeFetchJson(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  put:    async (url, data) => safeFetchJson(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  del:    async (url) => safeFetchJson(url, { method: 'DELETE' }),
  delete: async (url) => safeFetchJson(url, { method: 'DELETE' }),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  BLUETOOTH — Tej C15 Printer Connection (Web Bluetooth API)
// ═══════════════════════════════════════════════════════════════════════════════

function setPrinterPillState(state_str) {
  // state_str: 'idle' | 'connecting' | 'connected' | 'error' | 'disconnecting'
  const pill    = document.getElementById('printer-bt-pill');
  const dot     = document.getElementById('printer-bt-dot');
  const label   = document.getElementById('printer-bt-label');
  const hint    = document.getElementById('bt-connect-hint');
  const btIcon  = document.getElementById('bt-icon');
  const spinner = document.getElementById('bt-spinner');
  if (!pill) return;

  // Reset classes
  pill.classList.remove('bt-connected-state');
  dot.classList.remove('bt-connected', 'bt-error', 'online');
  btIcon.classList.remove('hidden');
  spinner.classList.add('hidden');

  switch (state_str) {
    case 'connecting':
      btIcon.classList.add('hidden');
      spinner.classList.remove('hidden');
      label.textContent = 'Connecting…';
      hint.textContent  = '';
      pill.title = 'Connecting to Tej C15…';
      pill.disabled = true;
      break;

    case 'connected':
      dot.classList.add('bt-connected');
      label.textContent = state.printerDevice?.name || 'Tej C15';
      hint.textContent  = 'Connected · Tap to disconnect';
      pill.classList.add('bt-connected-state');
      pill.title = `Connected to ${state.printerDevice?.name || 'Tej C15'} · Click to disconnect`;
      pill.disabled = false;
      break;

    case 'error':
      dot.classList.add('bt-error');
      label.textContent = 'Tej C15';
      hint.textContent  = 'Failed · Tap to retry';
      pill.title = 'Connection failed — click to retry';
      pill.disabled = false;
      break;

    case 'idle':
    default:
      label.textContent = 'Tej C15';
      hint.textContent  = 'Tap to connect';
      pill.title = 'Click to connect Tej C15 via Bluetooth';
      pill.disabled = false;
      break;
  }
}

async function connectPrinterBluetooth() {
  // If already connected — disconnect
  if (state.printerConnected && state.printerDevice) {
    try {
      if (state.printerDevice.gatt?.connected) {
        await state.printerDevice.gatt.disconnect();
      }
    } catch (_) {}
    state.printerDevice = null;
    state.printerConnected = false;
    setPrinterPillState('idle');
    showToast('Tej C15 disconnected', 'info');
    return;
  }

  // Check Web Bluetooth API availability
  if (!navigator.bluetooth) {
    // Browser doesn't support Web Bluetooth (Safari, Firefox, some mobile browsers)
    _showBluetoothFallbackModal();
    return;
  }

  setPrinterPillState('connecting');

  try {
    // Tej C15 — request device by name prefix or accept all printers
    // Common thermal printer BLE service: Generic Attribute (0x1800) / Serial Port (0xfff0)
    const device = await navigator.bluetooth.requestDevice({
      filters: [
        { namePrefix: 'Tej' },
        { namePrefix: 'C15' },
        { namePrefix: 'BTP' },
        { namePrefix: 'Printer' },
      ],
      optionalServices: [
        '000018f0-0000-1000-8000-00805f9b34fb',  // Custom printer service
        '0000ffe0-0000-1000-8000-00805f9b34fb',  // Nordic UART / common thermal
        '0000fff0-0000-1000-8000-00805f9b34fb',  // Thermal printer profile
        'battery_service',
      ],
    });

    device.addEventListener('gattserverdisconnected', () => {
      state.printerConnected = false;
      state.printerDevice = null;
      setPrinterPillState('idle');
      showToast('Tej C15 disconnected', 'info');
    });

    // Connect GATT server
    await device.gatt.connect();

    state.printerDevice = device;
    state.printerConnected = true;
    setPrinterPillState('connected');
    showToast(`Tej C15 connected: ${device.name}`, 'success');

  } catch (err) {
    state.printerConnected = false;
    state.printerDevice = null;

    if (err.name === 'NotFoundError') {
      // User cancelled the device picker
      setPrinterPillState('idle');
    } else if (err.name === 'SecurityError') {
      setPrinterPillState('error');
      showToast('Bluetooth permission denied — allow it in browser settings', 'error');
    } else {
      // Device found but couldn't connect — likely Classic BT (not BLE)
      // Show fallback instructions
      setPrinterPillState('error');
      _showBluetoothFallbackModal();
    }
  }
}

function _showBluetoothFallbackModal() {
  // Build a clean info modal telling user to pair via OS, then confirm manually
  const existing = document.getElementById('bt-fallback-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'bt-fallback-modal';
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <div class="modal" style="max-width:460px">
      <div class="modal-header">
        <div class="modal-title-block">
          <div class="modal-title-tag">BLUETOOTH</div>
          <h2 class="modal-title">Connect Tej C15 Printer</h2>
        </div>
        <button class="modal-close-btn" onclick="document.getElementById('bt-fallback-modal').remove()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body" style="font-size:0.85rem;line-height:1.6">
        <p style="margin-bottom:1rem;color:var(--text-secondary)">
          The Tej C15 uses <strong>Classic Bluetooth</strong> (not BLE), which requires pairing through your device's OS settings first.
          Once paired, the app will route print jobs to it automatically.
        </p>

        <div style="background:var(--bg-elevated);border-radius:var(--radius);padding:1rem;margin-bottom:1rem">
          <p style="font-weight:600;margin-bottom:0.5rem;font-size:0.8rem;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.06em">On your Mac / PC</p>
          <ol style="padding-left:1.25rem;color:var(--text-secondary)">
            <li>Open <strong>System Settings → Bluetooth</strong></li>
            <li>Turn on the Tej C15 printer</li>
            <li>Find <strong>"Tej_C15"</strong> or <strong>"BTP-C15"</strong> in the list and click <strong>Connect</strong></li>
            <li>In <strong>System Settings → Printers & Scanners</strong>, set it as the default printer</li>
          </ol>
        </div>

        <div style="background:var(--bg-elevated);border-radius:var(--radius);padding:1rem;margin-bottom:1rem">
          <p style="font-weight:600;margin-bottom:0.5rem;font-size:0.8rem;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.06em">On your Phone (Android)</p>
          <ol style="padding-left:1.25rem;color:var(--text-secondary)">
            <li>Open <strong>Settings → Bluetooth</strong></li>
            <li>Pair with <strong>"Tej_C15"</strong></li>
            <li>When printing, select it from the print dialog</li>
          </ol>
        </div>

        <p style="font-size:0.78rem;color:var(--text-tertiary)">
          Once you have paired it via OS settings, click <strong>"Mark as Connected"</strong> below to update the status indicator in the app.
        </p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="document.getElementById('bt-fallback-modal').remove()">Close</button>
        <button class="btn btn-primary" onclick="_markPrinterManuallyConnected()">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
          Mark as Connected
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

function _markPrinterManuallyConnected() {
  state.printerConnected = true;
  state.printerDevice = { name: 'Tej C15', gatt: { connected: true } };
  setPrinterPillState('connected');
  document.getElementById('bt-fallback-modal')?.remove();
  showToast('Tej C15 marked as connected — print jobs will route via OS', 'success');
}



let _loadingTimer = null;

function showLoadingScreen(message = 'Loading Inventory Database...') {
  const overlay = document.getElementById('app-loading-screen');
  const txt = document.getElementById('loading-status-text');
  if (txt) txt.textContent = message;
  if (overlay) overlay.classList.remove('hidden');
}

function hideLoadingScreen() {
  const overlay = document.getElementById('app-loading-screen');
  if (overlay) {
    clearTimeout(_loadingTimer);
    _loadingTimer = setTimeout(() => {
      overlay.classList.add('hidden');
    }, 450);
  }
}

async function loadAll(showLoader = true, customMsg = 'Synchronizing Warehouse Database...') {
  if (showLoader) {
    showLoadingScreen(customMsg);
  }
  try {
    const [items, requests] = await Promise.all([
      api.get('/api/items'),
      api.get('/api/requests')
    ]);
    state.items = items || [];
    state.requests = requests || [];
    computeStats();
  } catch (err) {
    showToast('Failed to load data from server', 'error');
  } finally {
    if (showLoader) {
      hideLoadingScreen();
    }
  }
}

function computeStats() {
  const items = state.items;
  const reqs  = state.requests;

  const lowStock = items.filter(i => i.quantity > 0 && i.quantity <= (i.minStock || 0)).length;
  const outOfStock = items.filter(i => i.quantity === 0).length;

  state.stats = {
    totalItems: items.length,
    totalQuantity: items.reduce((acc, i) => acc + (i.quantity || 0), 0),
    lowStock,
    outOfStock,
    pendingRequests: reqs.filter(r => r.status === 'pending').length,
    zones: {
      electrical:  items.filter(i => i.zone === 'electrical').length,
      mechanical:  items.filter(i => i.zone === 'mechanical').length,
      consumables: items.filter(i => i.zone === 'consumables').length,
    }
  };

  const badge = document.getElementById('pending-badge');
  if (badge) {
    if (state.stats.pendingRequests > 0) {
      badge.textContent = state.stats.pendingRequests;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  HARDWARE INTEGRATION: HELETT HT20 BARCODE SCANNER
// ═══════════════════════════════════════════════════════════════════════════════
let scanBuffer = '';
let scanTimeout = null;

// Helett HT20 operates in USB HID Mode (Emulates Keyboard inputs + sends 'Enter' at the end)
window.addEventListener('keydown', (e) => {
  // Ignore if user is currently typing in an input field or textarea
  const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
  if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
    return;
  }

  if (e.key === 'Enter') {
    if (scanBuffer.length > 2) {
      handleBarcodeScanned(scanBuffer.trim());
    }
    scanBuffer = '';
    return;
  }

  // Accumulate printable characters
  if (e.key.length === 1) {
    scanBuffer += e.key;
    clearTimeout(scanTimeout);
    scanTimeout = setTimeout(() => { scanBuffer = ''; }, 200); // 200ms timeout for human typing vs fast scanner
  }
});

let currentScannedItem = null;

function handleBarcodeScanned(barcode) {
  const matchedItem = state.items.find(i =>
    (i.barcode && i.barcode.toLowerCase() === barcode.toLowerCase()) ||
    (i.sku    && i.sku.toLowerCase()    === barcode.toLowerCase())
  );

  // ── Checklist mode: intercept scan while Issue Checklist modal is open ──────
  if (state.activeChecklistRequestId) {
    if (!matchedItem) {
      showToast(`Unknown barcode "${barcode}" — not in inventory`, 'warning');
      return;
    }
    // Check if this item is part of the active checklist
    const clEntry = state.activeChecklist.find(c => c.itemId === matchedItem.id);
    if (!clEntry) {
      showToast(`"${matchedItem.name}" is not part of this Supplier Offer`, 'warning');
      return;
    }
    if (clEntry.checked) {
      showToast(`${matchedItem.name} is already checked off`, 'info');
      return;
    }
    clEntry.checked = true;
    renderChecklistRows();
    showToast(`Checked: ${matchedItem.name}`, 'success');
    return;
  }

  // ── Normal mode ─────────────────────────────────────────────────────────────
  if (matchedItem) {
    openScanActionModal(matchedItem);
  } else {
    showToast(`New barcode scanned: "${barcode}". Pre-filling item form...`, 'warning');
    openAddItemWithPresetBarcode(barcode);
  }
}

function openScanActionModal(item) {
  currentScannedItem = item;
  document.getElementById('scan-action-title').textContent = item.name;
  document.getElementById('scan-action-sku').textContent = `SKU: ${item.sku}`;
  document.getElementById('scan-action-location').textContent = item.location || 'A1';
  document.getElementById('scan-action-category').textContent = item.category || 'Goods';
  document.getElementById('scan-action-qty').textContent = `${item.quantity || 0} ${item.unit || 'pcs'}`;

  // Fill Detailed Specs Grid
  const zoneNames = { mechanical: 'Mechanical — Right Side', electrical: 'Electrical — Left Side', consumables: 'Consumables — Back Shelf' };
  if (document.getElementById('scan-detail-zone')) document.getElementById('scan-detail-zone').textContent = zoneNames[item.zone] || item.zone || 'General Store';
  if (document.getElementById('scan-detail-rate')) document.getElementById('scan-detail-rate').textContent = item.rate ? `₹ ${parseFloat(item.rate).toLocaleString('en-IN')}` : '₹ 0.00';
  if (document.getElementById('scan-detail-minstock')) document.getElementById('scan-detail-minstock').textContent = `${item.minStock ?? 0} ${item.unit || 'pcs'}`;
  if (document.getElementById('scan-detail-hsn')) document.getElementById('scan-detail-hsn').textContent = item.hsn || item.sku || '-';
  if (document.getElementById('scan-detail-notes')) document.getElementById('scan-detail-notes').textContent = item.notes || 'No description added';
  
  if (document.getElementById('scan-inward-input-qty')) document.getElementById('scan-inward-input-qty').value = 1;
  if (document.getElementById('scan-alloc-qty')) document.getElementById('scan-alloc-qty').value = 1;
  if (document.getElementById('scan-alloc-person')) document.getElementById('scan-alloc-person').value = '';
  if (document.getElementById('scan-alloc-project')) document.getElementById('scan-alloc-project').value = '';
  if (document.getElementById('scan-alloc-notes')) document.getElementById('scan-alloc-notes').value = '';

  const nowStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  if (document.getElementById('scan-verify-time')) {
    document.getElementById('scan-verify-time').textContent = `VERIFIED AT ${nowStr}`;
  }

  const imgWrap = document.getElementById('scan-action-img-wrap');
  if (imgWrap) {
    if (item.imageUrl) {
      imgWrap.innerHTML = `<img src="${item.imageUrl}" style="width:100%;height:100%;object-fit:cover" />`;
    } else {
      imgWrap.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>`;
    }
  }

  // Load and render recent logs for this specific item
  loadRecentItemLogs(item.id, item.sku);

  // Default to Details & Logs tab on scan!
  switchScanTab('details');
  document.getElementById('modal-scan-action-overlay')?.classList.remove('hidden');
}

async function loadRecentItemLogs(itemId, sku) {
  const container = document.getElementById('scan-detail-recent-logs');
  if (!container) return;
  
  try {
    const txns = await api.get('/api/transactions');
    const itemTxns = txns.filter(t => t.itemId === itemId || t.sku === sku || t.itemId === sku).slice(0, 5);
    
    if (!itemTxns || itemTxns.length === 0) {
      container.innerHTML = `<span style="font-size:0.75rem;color:var(--text-tertiary);display:block;text-align:center;padding:0.5rem">No allocation logs recorded yet</span>`;
      return;
    }

    container.innerHTML = itemTxns.map(t => {
      const isIn = t.type === 'inward';
      const dt = new Date(t.timestamp);
      const timeStr = dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      const dateStr = dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      
      let typeText = isIn ? 'Stock IN' : 'Allocation Issue';
      let tagColor = isIn ? 'var(--ok)' : 'var(--danger)';
      if (t.allocationType === 'project') typeText = 'Project Allocation';
      if (t.allocationType === 'client') typeText = 'Client Issue';
      if (t.allocationType === 'vendor') typeText = 'Vendor Issue';

      return `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:0.35rem 0.5rem;border-bottom:1px solid var(--border-subtle);font-size:0.75rem">
          <div>
            <span style="font-weight:700;color:${tagColor}">${typeText}</span>
            <span style="color:var(--text-secondary);margin-left:0.35rem">${escHtml(t.recipientName || (isIn ? 'Store Entry' : 'General'))}</span>
            <div style="font-size:0.68rem;color:var(--text-tertiary)">${escHtml(t.projectName || 'Store Central')} &middot; ${dateStr}, ${timeStr}</div>
          </div>
          <div style="font-family:var(--font-mono);font-weight:700;color:${tagColor};font-size:0.85rem">
            ${isIn ? '+' : ''}${t.delta} ${currentScannedItem?.unit || 'pcs'}
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = `<span style="font-size:0.75rem;color:var(--text-tertiary);display:block;text-align:center;padding:0.5rem">Unable to load logs</span>`;
  }
}

function switchScanTab(tab) {
  const btnDetails = document.getElementById('tab-btn-details');
  const btnAlloc = document.getElementById('tab-btn-allocate');
  const btnInward = document.getElementById('tab-btn-inward');
  
  const modeDetails = document.getElementById('scan-mode-details');
  const modeAlloc = document.getElementById('scan-mode-allocate');
  const modeInward = document.getElementById('scan-mode-inward');

  btnDetails?.classList.replace('btn-primary', 'btn-ghost');
  btnAlloc?.classList.replace('btn-primary', 'btn-ghost');
  btnInward?.classList.replace('btn-primary', 'btn-ghost');

  modeDetails?.classList.add('hidden');
  modeAlloc?.classList.add('hidden');
  modeInward?.classList.add('hidden');

  if (tab === 'details') {
    btnDetails?.classList.replace('btn-ghost', 'btn-primary');
    modeDetails?.classList.remove('hidden');
  } else if (tab === 'allocate') {
    btnAlloc?.classList.replace('btn-ghost', 'btn-primary');
    modeAlloc?.classList.remove('hidden');
  } else if (tab === 'inward') {
    btnInward?.classList.replace('btn-ghost', 'btn-primary');
    modeInward?.classList.remove('hidden');
  }
}

function closeScanActionModal(e) {
  if (e && e.target !== document.getElementById('modal-scan-action-overlay')) return;
  document.getElementById('modal-scan-action-overlay')?.classList.add('hidden');
  currentScannedItem = null;
}

async function submitInwardReceipt() {
  if (!currentScannedItem) return;
  const inputQty = parseInt(document.getElementById('scan-inward-input-qty').value) || 1;

  try {
    const res = await api.post(`/api/items/${currentScannedItem.id}/adjust-stock`, {
      delta: inputQty,
      type: 'inward',
      allocationType: 'inward',
      notes: `Stock inward receipt via barcode scan`
    });

    if (res.success) {
      showToast(`Stock Received (+${inputQty}): Total ${res.newQuantity} ${currentScannedItem.unit || 'pcs'} of ${currentScannedItem.name}`, 'success');
      currentScannedItem.quantity = res.newQuantity;
      document.getElementById('scan-action-qty').textContent = `${res.newQuantity} ${currentScannedItem.unit || 'pcs'}`;
      await loadAll();
      renderView(state.currentView);
      closeScanActionModal();
    }
  } catch (err) {
    showToast('Failed to adjust stock', 'error');
  }
}

async function submitAllocationIssue() {
  if (!currentScannedItem) return;
  const qty = parseInt(document.getElementById('scan-alloc-qty').value) || 1;
  const allocType = document.getElementById('scan-alloc-type').value;
  const person = document.getElementById('scan-alloc-person').value.trim();
  const project = document.getElementById('scan-alloc-project').value.trim();
  const notes = document.getElementById('scan-alloc-notes').value.trim();

  if (!person) {
    showToast('Please enter the Recipient / Person Name', 'error');
    document.getElementById('scan-alloc-person').focus();
    return;
  }
  if (!project) {
    showToast('Please enter the Project or Client Name', 'error');
    document.getElementById('scan-alloc-project').focus();
    return;
  }

  const allocLabels = {
    project: 'Project Allocation',
    client: 'Client Issue',
    vendor: 'Vendor Issue'
  };

  try {
    const res = await api.post(`/api/items/${currentScannedItem.id}/adjust-stock`, {
      delta: -qty,
      type: 'outward',
      allocationType: allocType,
      recipientName: person,
      projectName: project,
      notes: notes || `${allocLabels[allocType]} to ${person} (${project})`
    });

    if (res.success) {
      showToast(`Issued ${qty} ${currentScannedItem.unit || 'pcs'} of ${currentScannedItem.name} to ${person} [${project}]`, 'success');
      currentScannedItem.quantity = res.newQuantity;
      document.getElementById('scan-action-qty').textContent = `${res.newQuantity} ${currentScannedItem.unit || 'pcs'}`;
      await loadAll();
      renderView(state.currentView);
      closeScanActionModal();
    }
  } catch (err) {
    showToast('Failed to log allocation issue', 'error');
  }
}

function printStickerFromScanModal() {
  if (!currentScannedItem) return;
  const item = currentScannedItem;
  closeScanActionModal();
  openPrintModal(item.id);
}

function openAddItemWithPresetBarcode(barcode) {
  openAddItemModal();
  setTimeout(() => {
    const skuEl = document.getElementById('item-sku');
    const barcodeEl = document.getElementById('item-barcode');
    const nameEl = document.getElementById('item-name');
    if (skuEl) skuEl.value = barcode;
    if (barcodeEl) barcodeEl.value = barcode;
    if (nameEl) nameEl.focus();
  }, 120);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  HARDWARE INTEGRATION: TEJ C15 LABEL PRINTER
// ═══════════════════════════════════════════════════════════════════════════════
function openPrintModal(itemId) {
  const item = state.items.find(i => i.id === itemId);
  if (!item) return;

  state.printItemId = itemId;
  const barcodeValue = item.barcode || item.sku || item.id;

  if (document.getElementById('print-modal-item-name')) {
    document.getElementById('print-modal-item-name').textContent = item.name;
  }
  if (document.getElementById('print-item-title-preview')) {
    document.getElementById('print-item-title-preview').textContent = item.name.toUpperCase();
  }
  if (document.getElementById('print-item-sku')) {
    document.getElementById('print-item-sku').textContent = barcodeValue;
  }
  if (document.getElementById('copy-barcode-input')) {
    document.getElementById('copy-barcode-input').value = barcodeValue;
  }

  // Generate Code128 Barcode SVG using JsBarcode
  try {
    JsBarcode('#barcode-canvas', barcodeValue, {
      format: 'CODE128',
      width: 1.8,
      height: 45,
      displayValue: false,
      margin: 2,
      background: '#ffffff',
      lineColor: '#000000'
    });
  } catch (err) {
    console.error('Barcode generation error:', err);
  }

  document.getElementById('modal-print-overlay')?.classList.remove('hidden');
}

function closePrintModal(e) {
  if (e && e.target !== document.getElementById('modal-print-overlay')) return;
  document.getElementById('modal-print-overlay')?.classList.add('hidden');
  state.printItemId = null;
}

function copyBarcodeToClipboard(val) {
  const barcodeVal = val || document.getElementById('copy-barcode-input')?.value;
  if (!barcodeVal) return;
  navigator.clipboard.writeText(barcodeVal).then(() => {
    showToast(`Copied barcode "${barcodeVal}" to clipboard!`, 'success');
  }).catch(() => {
    const el = document.getElementById('copy-barcode-input');
    if (el) {
      el.select();
      document.execCommand('copy');
      showToast(`Copied barcode "${barcodeVal}" to clipboard!`, 'success');
    }
  });
}

function testPrintSticker() {
  // Print a placeholder label directly — no fake record is injected into state
  showToast('Sending test label to printer...', 'info');
  api.post('/api/print-tspl', {
    name: 'PRINT TEST',
    sku: 'TEST',
    location: '—',
    zone: '—',
    copies: 1
  }).then(res => {
    if (res.success) {
      showToast('Test sticker printed successfully!', 'success');
    } else {
      showToast(res.error || 'Printer not connected', 'warning');
    }
  }).catch(() => showToast('Failed to connect to printer server', 'error'));
}

async function triggerTejC15Print() {
  const item = state.items.find(i => i.id === state.printItemId);

  if (!item) {
    showToast('No item selected to print', 'error');
    return;
  }

  showToast('Sending direct barcode print to Tej C15...', 'info');

  try {
    const res = await api.post('/api/print-tspl', {
      name: item.name,
      sku: item.sku || item.barcode || '',
      location: item.location || '',
      zone: item.zone || '',
      copies: 1
    });

    if (res.success) {
      showToast('Barcode sticker printed to Tej C15!', 'success');
      closePrintModal();
    } else {
      showToast(res.error || 'Direct USB offline', 'warning');
    }
  } catch (err) {
    showToast('Failed to connect to printer server', 'error');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  AUTH & USER ROLE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════
function selectRole(role) {
  document.getElementById('role-btn-manager').classList.toggle('selected', role === 'manager');
  document.getElementById('role-btn-engineer').classList.toggle('selected', role === 'engineer');
  
  const mgrGroup = document.getElementById('manager-pin-group');
  const engEmailGroup = document.getElementById('engineer-email-group');
  const engOtpGroup = document.getElementById('engineer-otp-group');
  const errorEl = document.getElementById('login-error');
  if (errorEl) errorEl.classList.add('hidden');

  if (mgrGroup) mgrGroup.classList.toggle('hidden', role !== 'manager');
  if (engEmailGroup) engEmailGroup.classList.toggle('hidden', role !== 'engineer');
  if (engOtpGroup && role !== 'engineer') engOtpGroup.classList.add('hidden');
}

async function sendEngineerOTP() {
  const emailInput = document.getElementById('engineer-email');
  const statusEl = document.getElementById('otp-sent-status');
  const otpGroup = document.getElementById('engineer-otp-group');
  const errorEl = document.getElementById('login-error');
  if (errorEl) errorEl.classList.add('hidden');

  const email = emailInput?.value.trim();
  if (!email || !email.includes('@')) {
    showToast('Please enter a valid Zoho / Company email address', 'warning');
    if (emailInput) emailInput.focus();
    return;
  }

  showToast(`Sending 6-digit OTP to ${email}...`, 'info');

  try {
    const res = await api.post('/api/auth/send-otp', { email, role: 'engineer' });
    if (res.success) {
      if (otpGroup) otpGroup.classList.remove('hidden');
      if (statusEl) {
        statusEl.style.display = 'block';
        if (res.fallbackCode) {
          statusEl.style.color = '#f59e0b';
          statusEl.innerHTML = `Cloud mail port restricted. Verified OTP Code: <strong>${res.fallbackCode}</strong>`;
        } else {
          statusEl.style.color = 'var(--goose)';
          let statusHtml = `6-Digit OTP sent to <strong>${escHtml(email)}</strong>. Check your inbox.`;
          if (res.previewUrl) {
            statusHtml += ` <a href="${res.previewUrl}" target="_blank" style="color:var(--accent-cyan);text-decoration:underline;margin-left:0.25rem">View Test Inbox ↗</a>`;
          }
          statusEl.innerHTML = statusHtml;
        }
      }
      showToast(res.message || 'OTP code ready!', 'success');
      
      const otpInput = document.getElementById('engineer-otp');
      if (otpInput) {
        otpInput.value = res.fallbackCode || '';
        setTimeout(() => otpInput.focus(), 150);
      }
    } else {
      showToast(res.error || 'Failed to send OTP', 'error');
    }
  } catch (err) {
    showToast(err.message || 'Failed to send OTP to mail', 'error');
  }
}

async function verifyEngineerOTP() {
  const email = document.getElementById('engineer-email')?.value.trim();
  const otp = document.getElementById('engineer-otp')?.value.trim();
  const errorEl = document.getElementById('login-error');
  if (errorEl) errorEl.classList.add('hidden');

  if (!email || !email.includes('@')) {
    showToast('Please enter your Zoho email address', 'warning');
    return;
  }

  if (!otp || otp.length !== 6) {
    showToast('Please enter the full 6-digit OTP code', 'warning');
    const otpInput = document.getElementById('engineer-otp');
    if (otpInput) otpInput.focus();
    return;
  }

  showToast('Verifying 6-digit OTP...', 'info');

  try {
    const res = await api.post('/api/auth/verify-otp', { email, otp });
    if (res.success && res.user) {
      setUser(res.user);
    } else {
      if (errorEl) {
        errorEl.textContent = res.error || 'Invalid 6-digit OTP code.';
        errorEl.classList.remove('hidden');
      }
      showToast(res.error || 'Invalid OTP code', 'error');
    }
  } catch (err) {
    if (errorEl) {
      errorEl.textContent = err.message || 'Invalid or expired OTP PIN.';
      errorEl.classList.remove('hidden');
    }
    showToast(err.message || 'OTP verification failed', 'error');
  }
}

function handleLogin(e) {
  e.preventDefault();
  const isManager = document.getElementById('role-btn-manager').classList.contains('selected');
  const errorEl = document.getElementById('login-error');

  if (isManager) {
    const pin = document.getElementById('manager-pin').value;
    const requiredPin = localStorage.getItem('ims_manager_pin') || state.managerPin || '1234';
    if (pin !== requiredPin) {
      if (errorEl) {
        errorEl.textContent = 'Invalid Manager PIN. Default manager PIN is 1234';
        errorEl.classList.remove('hidden');
      }
      return;
    }
    setUser({ role: 'manager', name: 'Store Manager' });
  } else {
    const otpGroup = document.getElementById('engineer-otp-group');
    if (otpGroup && !otpGroup.classList.contains('hidden')) {
      verifyEngineerOTP();
    } else {
      sendEngineerOTP();
    }
  }
}

function applyZohoVisibility() {
  const isManager = state.user?.role === 'manager';
  const zohoBtn = document.getElementById('menu-item-zoho');
  if (zohoBtn) {
    zohoBtn.style.display = (isManager && state.zohoEnabled) ? 'flex' : 'none';
  }

  const toggleBtn = document.getElementById('btn-toggle-zoho-setting');
  if (toggleBtn) {
    toggleBtn.textContent = state.zohoEnabled ? 'Enabled' : 'Disabled';
    toggleBtn.className = state.zohoEnabled ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm';
    toggleBtn.style.color = state.zohoEnabled ? '' : 'var(--text-tertiary)';
  }
}

function toggleZohoIntegrationSetting() {
  state.zohoEnabled = !state.zohoEnabled;
  localStorage.setItem('ims_zoho_enabled', state.zohoEnabled);
  applyZohoVisibility();
  showToast(`Zoho Books Integration ${state.zohoEnabled ? 'enabled' : 'disabled'}`, 'info');
}

function setUser(user) {
  state.user = user;
  sessionStorage.setItem('ims_user', JSON.stringify(user));

  showLoadingScreen(`Welcome, ${user.name}! Authenticating & Initializing Inventory...`);

  const isManager = user.role === 'manager';

  if (document.getElementById('user-chip-name')) {
    document.getElementById('user-chip-name').textContent = user.name;
    document.getElementById('user-chip-avatar').textContent = user.name.charAt(0).toUpperCase();
  }
  if (document.getElementById('menu-user-name')) {
    document.getElementById('menu-user-name').textContent = user.name;
    document.getElementById('menu-user-role').textContent = user.role.toUpperCase();
    document.getElementById('menu-avatar').textContent = user.name.charAt(0).toUpperCase();
  }

  // Restrict Settings to Manager, and Zoho to Manager + Enabled state
  const settingsBtn = document.getElementById('menu-item-settings');
  if (settingsBtn) settingsBtn.style.display = isManager ? 'flex' : 'none';
  applyZohoVisibility();

  setTimeout(() => {
    document.getElementById('login-overlay').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    navigateTo('dashboard');

    loadAll(false).then(() => {
      renderView(state.currentView);
      hideLoadingScreen();
    }).catch(err => {
      console.error('Data load error after login:', err);
      hideLoadingScreen();
    });
  }, 600);
}

function toggleOptionsMenu(e) {
  if (e) e.stopPropagation();
  const menu = document.getElementById('options-menu');
  if (menu) {
    menu.classList.toggle('hidden');
  }
}

window.addEventListener('click', (e) => {
  const wrapper = document.getElementById('nav-options-wrapper');
  const menu = document.getElementById('options-menu');
  if (menu && !menu.classList.contains('hidden') && wrapper && !wrapper.contains(e.target)) {
    menu.classList.add('hidden');
  }
});

function logout() {
  sessionStorage.removeItem('ims_user');
  state.user = null;
  document.getElementById('app').classList.add('hidden');
  document.getElementById('login-overlay').classList.remove('hidden');
  document.getElementById('options-menu')?.classList.add('hidden');
}

// ═══════════════════════════════════════════════════════════════════════════════
//  NAVIGATION
// ═══════════════════════════════════════════════════════════════════════════════
function navigateTo(view) {
  state.currentView = view;
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
  document.querySelector(`.nav-link[data-view="${view}"]`)?.classList.add('active');

  document.querySelectorAll('.bnav-btn').forEach(n => n.classList.remove('active'));
  document.querySelector(`.bnav-btn[data-view="${view}"]`)?.classList.add('active');

  document.getElementById(`view-${view}`)?.classList.remove('hidden');
  renderView(view);
  document.getElementById('content-area')?.scrollTo(0, 0);
}

function renderView(view) {
  switch (view) {
    case 'dashboard':        renderDashboard();       break;
    case 'storemap':         renderStoreMap();        break;
    case 'inventory':        renderInventory();       break;
    case 'requests':         renderRequests();        break;
    case 'transactions':     renderTransactions();    break;
    case 'engineer-history': renderEngineerHistory(); break;
    case 'labeldesigner':    renderLabelDesigner();   break;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  STOCK MOVEMENTS — Inward & Outward Transaction Log
// ═══════════════════════════════════════════════════════════════════════════════
async function renderTransactions() {
  const container = document.getElementById('view-transactions');
  if (!container) return;

  const isManager = state.user?.role === 'manager';

  container.innerHTML = `
    <div class="page-hdr">
      <div>
        <h1 class="page-title">Stock Movements</h1>
        <div class="page-subtitle">Barcode-scanned inward receipts and outward allocations</div>
      </div>
      <div style="display:flex;gap:0.75rem">
        ${isManager ? `<button class="btn btn-ghost" onclick="clearAllTransactions()" style="font-size:0.8rem;color:var(--danger)">Clear All</button>` : ''}
      </div>
    </div>
    <div class="card" style="overflow:hidden">
      <div id="txn-table-wrap" style="min-height:200px;display:flex;align-items:center;justify-content:center">
        <span style="color:var(--text-tertiary);font-size:0.85rem">Loading transactions...</span>
      </div>
    </div>
  `;

  let transactions = [];
  try {
    transactions = await api.get('/api/transactions');
  } catch (e) {
    transactions = [];
  }

  const wrap = document.getElementById('txn-table-wrap');
  if (!wrap) return;

  if (!transactions || transactions.length === 0) {
    wrap.innerHTML = `
      <div style="text-align:center;padding:3rem">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="1.2" style="margin-bottom:1rem"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
        <div style="font-weight:600;color:var(--text-secondary)">No stock movements yet</div>
        <div style="font-size:0.8rem;color:var(--text-tertiary);margin-top:0.4rem">Scan a barcode with your Helett HT20 to record inward or outward stock</div>
      </div>
    `;
    return;
  }

  wrap.innerHTML = `
    <table class="data-table" style="width:100%">
      <thead>
        <tr>
          <th>TIME</th>
          <th>ITEM</th>
          <th>SKU / CODE</th>
          <th>MOVEMENT TYPE</th>
          <th>RECIPIENT / PERSON</th>
          <th>PROJECT / DESTINATION</th>
          <th>QTY CHANGE</th>
          <th>STOCK LEVEL</th>
          ${isManager ? `<th style="width:40px"></th>` : ''}
        </tr>
      </thead>
      <tbody>
        ${transactions.map(t => {
          const isIn = t.type === 'inward';
          const dt = new Date(t.timestamp);
          const dateStr = dt.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
          const timeStr = dt.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' });
          
          let typeLabel = 'Stock IN';
          let badgeClass = 'status-active';
          if (t.allocationType === 'project') {
            typeLabel = 'Project Allocation';
            badgeClass = 'status-in-progress';
          } else if (t.allocationType === 'client') {
            typeLabel = 'Client Issue';
            badgeClass = 'status-inactive';
          } else if (t.allocationType === 'vendor') {
            typeLabel = 'Vendor Issue';
            badgeClass = 'status-pending';
          } else if (!isIn) {
            typeLabel = 'Outward Issue';
            badgeClass = 'status-inactive';
          }

          return `
            <tr id="txn-row-${t.id}">
              <td style="font-size:0.75rem;white-space:nowrap">
                <div style="font-weight:600;color:var(--text-primary)">${timeStr}</div>
                <div style="color:var(--text-tertiary)">${dateStr}</div>
              </td>
              <td style="font-weight:600">${escHtml(t.itemName || '-')}</td>
              <td style="font-family:var(--font-mono);font-size:0.78rem;color:var(--text-tertiary)">${escHtml(t.sku || '-')}</td>
              <td>
                <span class="status-badge ${badgeClass}" style="font-size:0.72rem">
                  ${typeLabel}
                </span>
              </td>
              <td style="font-size:0.8rem;font-weight:600">${escHtml(t.recipientName || 'Store Inward')}</td>
              <td style="font-size:0.8rem;color:var(--text-secondary)">${escHtml(t.projectName || (isIn ? 'Store Central' : 'General'))}</td>
              <td style="font-family:var(--font-mono);font-weight:700;color:${isIn ? 'var(--ok)' : 'var(--danger)'}">
                ${isIn ? '+' : ''}${t.delta}
              </td>
              <td style="font-family:var(--font-mono);font-weight:600">${t.newQuantity ?? '-'}</td>
              ${isManager ? `
                <td>
                  <button onclick="deleteTransaction('${t.id}')" title="Delete this log entry"
                    style="background:none;border:none;cursor:pointer;color:var(--text-tertiary);padding:4px;border-radius:4px"
                    onmouseover="this.style.color='var(--danger)'" onmouseout="this.style.color='var(--text-tertiary)'">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                  </button>
                </td>
              ` : ''}
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

async function deleteTransaction(id) {
  if (state.user?.role !== 'manager') {
    showToast('Access Denied: Deleting movement logs is restricted to Store Manager only', 'error');
    return;
  }

  showConfirmModal({
    title: 'Delete Log Entry',
    message: 'Are you sure you want to delete this stock movement log entry?',
    confirmLabel: 'Delete Entry',
    onConfirm: async () => {
      try {
        await api.del(`/api/transactions/${id}`);
        showToast('Movement entry deleted', 'success');
        renderTransactions();
      } catch (err) {
        showToast('Failed to delete transaction log', 'error');
      }
    }
  });
}

async function clearAllTransactions() {
  if (state.user?.role !== 'manager') {
    showToast('Access Denied: Clearing transaction logs is restricted to Store Manager only', 'error');
    return;
  }

  showConfirmModal({
    title: 'Clear Movement History',
    message: 'Are you sure you want to delete ALL stock movement log entries? This action cannot be undone.',
    confirmLabel: 'Clear History Log',
    onConfirm: async () => {
      try {
        await api.del('/api/transactions');
        showToast('Stock movement history cleared', 'success');
        renderTransactions();
      } catch (err) {
        showToast('Failed to clear transaction log', 'error');
      }
    }
  });
}

function renderLabelDesigner() {
  document.getElementById('view-labeldesigner').innerHTML = `
    <div class="page-hdr">
      <div>
        <h1 class="page-title">Thermal Label Designer</h1>
      </div>
    </div>
    <div class="card" style="padding:4rem 2rem;max-width:600px;margin:2rem auto;text-align:center;background:var(--bg-raised)">
      <div style="font-size:1.5rem;font-weight:700;color:var(--text-primary)">
        Coming Soon
      </div>
    </div>
  `;
}

function renderDashboard() {
  const items = state.items || [];
  const s = state.stats || {};
  const alertItems = items.filter(i => getStockStatus(i) !== 'ok');

  const totalCount = items.length || 1;
  const outStockCount = items.filter(i => getStockStatus(i) === 'out').length;
  const lowStockCount = items.filter(i => getStockStatus(i) === 'low').length;
  const inStockCount = items.filter(i => getStockStatus(i) === 'ok').length;

  const inStockPct = ((inStockCount / totalCount) * 100).toFixed(1);
  const lowStockPct = ((lowStockCount / totalCount) * 100).toFixed(1);
  const outStockPct = ((outStockCount / totalCount) * 100).toFixed(1);

  document.getElementById('view-dashboard').innerHTML = `
    <div class="page-hdr">
      <div>
        <h1 class="page-title">Store Overview</h1>
        <p class="page-subtitle">${new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' })} &middot; Goose Industrial Solutions Pvt Ltd</p>
      </div>
      <div style="display:flex;gap:0.625rem;align-items:center">
        <button class="btn btn-ghost" onclick="loadAll().then(()=>renderView('dashboard'))" style="display:inline-flex;align-items:center;gap:0.4rem">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          Refresh
        </button>
        ${state.user?.role === 'manager' ? `
          <button class="btn btn-primary" onclick="openAddItemModal()">+ Add Item</button>
        ` : `
          <button class="btn btn-primary" onclick="openRequestModal()">+ Request Material</button>
        `}
      </div>
    </div>

    <div class="compact-dashboard">
      
      <div class="compact-stats-row">
        <div class="compact-stat-card" style="--card-accent:var(--accent-cyan);--card-dim:rgba(0,198,255,0.12)">
          <div class="compact-stat-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
          </div>
          <div>
            <div class="compact-stat-val">${items.length}</div>
            <div class="compact-stat-lbl">Total Materials</div>
          </div>
        </div>

        <div class="compact-stat-card" style="--card-accent:var(--danger);--card-dim:rgba(239,68,68,0.12)">
          <div class="compact-stat-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <div>
            <div class="compact-stat-val">${alertItems.length}</div>
            <div class="compact-stat-lbl">Stock Alerts</div>
          </div>
        </div>

        <div class="compact-stat-card" style="--card-accent:var(--warn);--card-dim:rgba(245,158,11,0.12)">
          <div class="compact-stat-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          </div>
          <div>
            <div class="compact-stat-val">${s.pendingRequests ?? 0}</div>
            <div class="compact-stat-lbl">Pending Requests</div>
          </div>
        </div>
      </div>

      <div class="compact-main-row">
        <!-- Left Panel: Stock Alerts / Priority Items -->
        <div class="compact-panel">
          <div class="compact-panel-hdr">
            <span class="compact-panel-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
              Priority Items &amp; Stock Alerts
            </span>
            <button class="btn btn-ghost btn-sm" onclick="navigateTo('inventory')">View All &rarr;</button>
          </div>
          <div class="compact-panel-body" style="justify-content:flex-start;gap:0.6rem;padding:1rem 1.125rem">
            ${alertItems.length === 0 ? `
              <div style="text-align:center;padding:2rem 1rem;color:var(--text-tertiary);margin:auto">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" stroke-width="2" style="margin-bottom:0.5rem"><polyline points="20 6 9 17 4 12"/></svg>
                <div style="font-weight:600;color:var(--text-primary);margin-bottom:0.25rem">All stock levels optimal</div>
                <div style="font-size:0.78rem">No materials are currently below minimum stock threshold.</div>
              </div>
            ` : alertItems.slice(0, 5).map(i => `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:0.65rem 0.875rem;background:var(--bg-elevated);border-radius:var(--radius-md);border:1px solid var(--border-subtle)">
                <div>
                  <div style="font-weight:600;font-size:0.85rem;color:var(--text-primary)">${escHtml(i.name)}</div>
                  <div style="font-size:0.72rem;color:var(--text-tertiary);font-family:var(--font-mono);margin-top:0.15rem">SKU: ${escHtml(i.sku)} &middot; Shelf ${escHtml(i.location)}</div>
                </div>
                <div>${stockTag(i)}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Right Panel: Stock Health Analytics Chart -->
        <div class="compact-panel">
          <div class="compact-panel-hdr">
            <span class="compact-panel-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>
              Stock Health &amp; Distribution
            </span>
            <span style="font-size:0.72rem;color:var(--text-tertiary);font-weight:600">LIVE BREAKDOWN</span>
          </div>
          <div class="compact-panel-body" style="display:flex;flex-direction:row;align-items:center;justify-content:space-evenly;padding:1.25rem 1.125rem;gap:1.25rem">
            
            <!-- Doughnut Chart Canvas Container -->
            <div style="position:relative;width:150px;height:150px;flex-shrink:0;cursor:pointer" title="Click pie chart slice to filter Store Inventory">
              <canvas id="overview-stock-chart"></canvas>
            </div>

            <!-- Legend & Metric Breakdown -->
            <div style="display:flex;flex-direction:column;gap:0.6rem;font-size:0.8rem;flex-grow:1;max-width:250px">
              
              <!-- In Stock -->
              <div onclick="filterStockStatusFromChart('instock')" style="cursor:pointer;display:flex;align-items:center;gap:0.6rem;background:var(--bg-elevated);padding:0.5rem 0.75rem;border-radius:var(--radius-md);border:1px solid var(--border-subtle);transition:border-color 0.2s" onmouseover="this.style.borderColor='var(--ok)'" onmouseout="this.style.borderColor='var(--border-subtle)'" title="View In Stock items in Store Inventory">
                <span style="width:10px;height:10px;border-radius:50%;background:#10b981;display:inline-block;flex-shrink:0"></span>
                <div style="flex-grow:1">
                  <div style="display:flex;justify-content:space-between;align-items:center">
                    <span style="font-weight:600;color:var(--text-primary)">In Stock</span>
                    <span style="font-weight:700;font-family:var(--font-mono);color:var(--ok)">${inStockCount}</span>
                  </div>
                  <div style="font-size:0.68rem;color:var(--text-tertiary)">${inStockPct}% healthy &middot; View &rarr;</div>
                </div>
              </div>

              <!-- Low Stock -->
              <div onclick="filterStockStatusFromChart('low')" style="cursor:pointer;display:flex;align-items:center;gap:0.6rem;background:var(--bg-elevated);padding:0.5rem 0.75rem;border-radius:var(--radius-md);border:1px solid var(--border-subtle);transition:border-color 0.2s" onmouseover="this.style.borderColor='var(--warn)'" onmouseout="this.style.borderColor='var(--border-subtle)'" title="View Low Stock items in Store Inventory">
                <span style="width:10px;height:10px;border-radius:50%;background:#f59e0b;display:inline-block;flex-shrink:0"></span>
                <div style="flex-grow:1">
                  <div style="display:flex;justify-content:space-between;align-items:center">
                    <span style="font-weight:600;color:var(--text-primary)">Low Stock</span>
                    <span style="font-weight:700;font-family:var(--font-mono);color:var(--warn)">${lowStockCount}</span>
                  </div>
                  <div style="font-size:0.68rem;color:var(--text-tertiary)">${lowStockPct}% alerts &middot; View &rarr;</div>
                </div>
              </div>

              <!-- Out of Stock -->
              <div onclick="filterStockStatusFromChart('out')" style="cursor:pointer;display:flex;align-items:center;gap:0.6rem;background:var(--bg-elevated);padding:0.5rem 0.75rem;border-radius:var(--radius-md);border:1px solid var(--border-subtle);transition:border-color 0.2s" onmouseover="this.style.borderColor='var(--danger)'" onmouseout="this.style.borderColor='var(--border-subtle)'" title="View Out of Stock items in Store Inventory">
                <span style="width:10px;height:10px;border-radius:50%;background:#ef4444;display:inline-block;flex-shrink:0"></span>
                <div style="flex-grow:1">
                  <div style="display:flex;justify-content:space-between;align-items:center">
                    <span style="font-weight:600;color:var(--text-primary)">Out of Stock</span>
                    <span style="font-weight:700;font-family:var(--font-mono);color:var(--danger)">${outStockCount}</span>
                  </div>
                  <div style="font-size:0.68rem;color:var(--text-tertiary)">${outStockPct}% zero stock &middot; View &rarr;</div>
                </div>
              </div>

            </div>

          </div>
        </div>

      </div>

    </div>
  `;

  setTimeout(() => {
    renderOverviewStockChart(inStockCount, lowStockCount, outStockCount);
  }, 50);
}

function filterStockStatusFromChart(filterType) {
  state.filters.stockAvailability = filterType;
  navigateTo('inventory');
}

function renderOverviewStockChart(inStock, lowStock, outOfStock) {
  const canvas = document.getElementById('overview-stock-chart');
  if (!canvas || !window.Chart) return;

  if (window._overviewChartInstance) {
    window._overviewChartInstance.destroy();
  }

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const borderColor = isDark ? '#1e293b' : '#ffffff';

  const chartObj = new Chart(canvas, {
    type: 'pie',
    data: {
      labels: ['In Stock', 'Low Stock', 'Out of Stock'],
      datasets: [{
        data: [inStock, lowStock, outOfStock],
        backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
        borderWidth: 2,
        borderColor: borderColor,
        hoverOffset: 10
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      onClick: (evt, activeElements, chart) => {
        const elems = (activeElements && activeElements.length > 0)
          ? activeElements
          : (chart && typeof chart.getElementsAtEventForMode === 'function'
              ? chart.getElementsAtEventForMode(evt, 'nearest', { intersect: false }, true)
              : []);
        
        if (elems && elems.length > 0) {
          const idx = elems[0].index;
          const filterMap = ['instock', 'low', 'out'];
          if (filterMap[idx]) {
            filterStockStatusFromChart(filterMap[idx]);
          }
        }
      },
      onHover: (event, chartElement) => {
        if (event.native && event.native.target) {
          event.native.target.style.cursor = chartElement[0] ? 'pointer' : 'default';
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          titleColor: isDark ? '#f8fafc' : '#0f172a',
          bodyColor: isDark ? '#cbd5e1' : '#334155',
          borderColor: isDark ? '#334155' : '#e2e8f0',
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8,
          boxPadding: 6,
          usePointStyle: true,
          titleFont: { size: 12, weight: 'bold' },
          bodyFont: { size: 11 },
          callbacks: {
            title: (items) => items[0]?.label || '',
            label: (context) => ` ${context.raw}`
          }
        }
      }
    }
  });

  window._overviewChartInstance = chartObj;

  // Direct canvas click handler for bulletproof response
  canvas.onclick = (evt) => {
    if (chartObj && typeof chartObj.getElementsAtEventForMode === 'function') {
      const points = chartObj.getElementsAtEventForMode(evt, 'nearest', { intersect: false }, true);
      if (points && points.length > 0) {
        const idx = points[0].index;
        const filterMap = ['instock', 'low', 'out'];
        if (filterMap[idx]) {
          filterStockStatusFromChart(filterMap[idx]);
        }
      }
    }
  };
}

function filterZone(zone) {
  state.filters.zone = zone;
  navigateTo('inventory');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════════
//  STORE LAYOUT MAP & SHELF MATRIX
// ═══════════════════════════════════════════════════════════════════════════════

const ELECTRICAL_RACK_GROUPS = [
  {
    groupTitle: 'Primary Bay (Racks A – E)',
    description: 'Standard Medium-Duty Electrical Shelving',
    racks: [
      { name: 'Rack A', shelves: ['A1', 'A2', 'A3', 'A4', 'A5'] },
      { name: 'Rack B', shelves: ['B1', 'B2', 'B3', 'B4'] },
      { name: 'Rack C', shelves: ['C1', 'C2', 'C3', 'C4'] },
      { name: 'Rack D', shelves: ['D1', 'D2', 'D3', 'D4'] },
      { name: 'Rack E', shelves: ['E1', 'E2', 'E3', 'E4'] }
    ]
  },
  {
    groupTitle: 'High-Capacity Bay (Racks F – J)',
    description: 'Extended Vertical Electrical Shelving (6 Tiers)',
    racks: [
      { name: 'Rack F', shelves: ['F1', 'F2', 'F3', 'F4', 'F5', 'F6'] },
      { name: 'Rack G', shelves: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6'] },
      { name: 'Rack H', shelves: ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'] },
      { name: 'Rack I', shelves: ['I1', 'I2', 'I3', 'I4', 'I5', 'I6'] },
      { name: 'Rack J', shelves: ['J1', 'J2', 'J3', 'J4', 'J5', 'J6'] }
    ]
  },
  {
    groupTitle: 'Compact Component Bay (Racks K – T)',
    description: '2-Tier Precision Modular Storage',
    racks: [
      { name: 'Rack K', shelves: ['K1', 'K2'] },
      { name: 'Rack L', shelves: ['L1', 'L2'] },
      { name: 'Rack M', shelves: ['M1', 'M2'] },
      { name: 'Rack N', shelves: ['N1', 'N2'] },
      { name: 'Rack O', shelves: ['O1', 'O2'] },
      { name: 'Rack P', shelves: ['P1', 'P2'] },
      { name: 'Rack Q', shelves: ['Q1', 'Q2'] },
      { name: 'Rack R', shelves: ['R1', 'R2'] },
      { name: 'Rack S', shelves: ['S1', 'S2'] },
      { name: 'Rack T', shelves: ['T1', 'T2'] }
    ]
  },
  {
    groupTitle: 'Heavy Equipment Bay (Racks U – Y)',
    description: '4-Tier Heavy Electrical Gear & Switchgear Storage',
    racks: [
      { name: 'Rack U', shelves: ['U1', 'U2', 'U3', 'U4'] },
      { name: 'Rack V', shelves: ['V1', 'V2', 'V3', 'V4'] },
      { name: 'Rack W', shelves: ['W1', 'W2', 'W3', 'W4'] },
      { name: 'Rack X', shelves: ['X1', 'X2', 'X3', 'X4'] },
      { name: 'Rack Y', shelves: ['Y1', 'Y2', 'Y3', 'Y4'] }
    ]
  },
  {
    groupTitle: 'Special & Oversized Storage (Z, XX, XY, XZ)',
    description: 'Transformers, Heavy Cable Drums & Enclosures',
    racks: [
      { name: 'Special Racks', shelves: ['Z', 'XX', 'XY', 'XZ'] }
    ]
  }
];

const MECHANICAL_RACK_GROUPS = [
  {
    groupTitle: 'Primary Hardware Bay (Racks A – F)',
    description: '4-Tier Mechanical Fasteners, Bolts, & Bearings Shelving',
    racks: [
      { name: 'Rack A', shelves: ['A1', 'A2', 'A3', 'A4'] },
      { name: 'Rack B', shelves: ['B1', 'B2', 'B3', 'B4'] },
      { name: 'Rack C', shelves: ['C1', 'C2', 'C3', 'C4'] },
      { name: 'Rack D', shelves: ['D1', 'D2', 'D3', 'D4'] },
      { name: 'Rack E', shelves: ['E1', 'E2', 'E3', 'E4'] },
      { name: 'Rack F', shelves: ['F1', 'F2', 'F3', 'F4'] }
    ]
  },
  {
    groupTitle: 'High-Capacity Mechanical Bay (Racks G – K)',
    description: '5-Tier Valves, Flanges, Pumps & Motors Storage',
    racks: [
      { name: 'Rack G', shelves: ['G1', 'G2', 'G3', 'G4', 'G5'] },
      { name: 'Rack H', shelves: ['H1', 'H2', 'H3', 'H4', 'H5'] },
      { name: 'Rack J', shelves: ['J1', 'J2', 'J3', 'J4', 'J5'] },
      { name: 'Rack K', shelves: ['K1', 'K2', 'K3', 'K4', 'K5'] }
    ]
  },
  {
    groupTitle: 'Piping & Heavy Structural Bay (Racks L – P)',
    description: '4-Tier Heavy Pipes, Plates & Structural Steel Racks',
    racks: [
      { name: 'Rack L', shelves: ['L1', 'L2', 'L3', 'L4'] },
      { name: 'Rack M', shelves: ['M1', 'M2', 'M3', 'M4'] },
      { name: 'Rack N', shelves: ['N1', 'N2', 'N3', 'N4'] },
      { name: 'Rack P', shelves: ['P1', 'P2', 'P3', 'P4'] }
    ]
  }
];

const CONSUMABLES_RACK_GROUPS = [
  {
    groupTitle: 'Consumables Racks (C-A – C-D)',
    description: 'Adhesives, Lubricants, Tapes & Safety Gear',
    racks: [
      { name: 'Rack C-A', shelves: ['C-A1', 'C-A2', 'C-A3', 'C-A4'] },
      { name: 'Rack C-B', shelves: ['C-B1', 'C-B2', 'C-B3', 'C-B4'] },
      { name: 'Rack C-C', shelves: ['C-C1', 'C-C2', 'C-C3', 'C-C4'] },
      { name: 'Rack C-D', shelves: ['C-D1', 'C-D2', 'C-D3', 'C-D4'] }
    ]
  }
];

let currentInspectedShelf = '';

function getItemsForShelf(shelfCode, targetZone = '') {
  const codeLower = shelfCode.toLowerCase().trim();
  return (state.items || []).filter(item => {
    if (targetZone && item.zone && item.zone.toLowerCase() !== targetZone.toLowerCase()) return false;
    const loc = (item.location || '').toLowerCase().trim();
    if (!loc) return false;
    return loc === codeLower || loc === `r-${codeLower}` || loc === `m-${codeLower}` || loc === `shelf-${codeLower}` || loc.split(/[\s,-]+/).includes(codeLower);
  });
}

function selectStoreMapZone(zone) {
  state.storeMapZone = zone;
  renderStoreMap();
}

function filterStoreMapShelves(query) {
  state.storeMapSearch = query.trim().toLowerCase();
  renderStoreMap();
}

function renderStoreMap() {
  const currentZone = state.storeMapZone || 'electrical';
  const searchQuery = state.storeMapSearch || '';

  const viewContainer = document.getElementById('view-storemap');
  if (!viewContainer) return;

  // Single unified section layout for Consumables
  if (currentZone === 'consumables') {
    const consumablesItems = (state.items || []).filter(i => (i.zone || '').toLowerCase() === 'consumables');
    const filteredConsumables = consumablesItems.filter(i => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (i.name || '').toLowerCase().includes(q) || 
             (i.sku || '').toLowerCase().includes(q) || 
             (i.category || '').toLowerCase().includes(q) ||
             (i.location || '').toLowerCase().includes(q);
    });

    viewContainer.innerHTML = `
      <div class="page-hdr" style="margin-bottom:1rem">
        <div>
          <div style="font-size:0.7rem;font-weight:700;color:var(--goose);letter-spacing:0.08em;margin-bottom:0.15rem">CENTRAL UNIFIED STORAGE</div>
          <h1 class="page-title">Store Layout — Consumables Section</h1>
        </div>
        <div style="display:flex;gap:0.75rem;align-items:center;flex-wrap:wrap">
          <input type="text" class="field-input mono" placeholder="Search consumables..." 
                 value="${escHtml(searchQuery)}" 
                 oninput="filterStoreMapShelves(this.value)" 
                 style="width:260px;font-size:0.82rem;padding:0.45rem 0.75rem;background:var(--bg-surface)" />
        </div>
      </div>

      <!-- Zone Selector Tabs -->
      <div style="display:flex;gap:0.5rem;margin-bottom:1.25rem;border-bottom:1px solid var(--border-subtle);padding-bottom:0.75rem">
        <button class="btn btn-ghost" onclick="selectStoreMapZone('electrical')" style="gap:0.4rem;padding:0.45rem 1rem">
          Electrical Section (95 Shelves)
        </button>
        <button class="btn btn-ghost" onclick="selectStoreMapZone('mechanical')" style="gap:0.4rem;padding:0.45rem 1rem">
          Mechanical Section (60 Shelves)
        </button>
        <button class="btn btn-primary" onclick="selectStoreMapZone('consumables')" style="gap:0.4rem;padding:0.45rem 1rem">
          Consumables Section (Unified Single Zone)
        </button>
      </div>

      <!-- Consumables Overview Cards -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:0.875rem;margin-bottom:1.5rem">
        <div class="stat-card" style="padding:0.875rem 1rem">
          <div class="stat-label">STORAGE ZONE</div>
          <div class="stat-value" style="color:var(--text-primary)">Consumables</div>
          <div class="stat-meta">Single Unified Open Section</div>
        </div>
        <div class="stat-card" style="padding:0.875rem 1rem">
          <div class="stat-label">TOTAL CONSUMABLE ITEMS</div>
          <div class="stat-value" style="color:var(--accent-emerald)">${consumablesItems.length}</div>
          <div class="stat-meta">Cataloged Materials</div>
        </div>
        <div class="stat-card" style="padding:0.875rem 1rem">
          <div class="stat-label">TOTAL IN-STOCK QUANTITY</div>
          <div class="stat-value" style="color:var(--goose)">${consumablesItems.reduce((sum, i) => sum + (parseInt(i.quantity) || 0), 0)}</div>
          <div class="stat-meta">In Store Units</div>
        </div>
      </div>

      <!-- Consumables Unified Section Card -->
      <div class="card" style="padding:1.5rem;background:var(--bg-raised)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem">
          <div>
            <h3 style="margin:0 0 0.2rem 0;font-size:1.1rem;font-weight:700;color:var(--text-primary)">Consumables Central Storage Area</h3>
            <div style="font-size:0.8rem;color:var(--text-tertiary)">General open storage section for all factory consumables, adhesives, tapes, lubricants, and safety equipment.</div>
          </div>
        </div>

        ${filteredConsumables.length === 0 ? `
          <div style="text-align:center;padding:3rem 1rem;color:var(--text-tertiary)">
            <div style="font-weight:700;font-size:1rem;color:var(--text-primary);margin-bottom:0.25rem">No Consumable Materials Found</div>
            <div style="font-size:0.82rem;color:var(--text-secondary)">No items found under zone "Consumables".</div>
          </div>
        ` : `
          <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(260px, 1fr));gap:0.875rem">
            ${filteredConsumables.map(item => `
              <div style="background:var(--bg-surface);border:1px solid var(--border-subtle);border-radius:var(--radius);padding:0.875rem;display:flex;flex-direction:column;justify-content:space-between;gap:0.75rem">
                <div style="display:flex;align-items:center;gap:0.75rem">
                  ${getItemImageHtml(item)}
                  <div>
                    <div style="font-weight:700;font-size:0.9rem;color:var(--text-primary);line-height:1.3">${escHtml(item.name)}</div>
                    <div style="font-family:var(--font-mono);font-size:0.75rem;color:var(--goose)">SKU: ${escHtml(item.sku)}</div>
                    ${item.location ? `<div style="font-size:0.7rem;color:var(--text-tertiary)">Location: ${escHtml(item.location)}</div>` : ''}
                  </div>
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--border-subtle);padding-top:0.6rem">
                  <div style="font-family:var(--font-mono);font-weight:800;font-size:0.92rem">${item.quantity} ${item.unit}</div>
                  <div>${stockTag(item)}</div>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;
    return;
  }

  let activeGroups = ELECTRICAL_RACK_GROUPS;
  if (currentZone === 'mechanical') activeGroups = MECHANICAL_RACK_GROUPS;

  const allShelves = [];
  activeGroups.forEach(g => {
    g.racks.forEach(r => {
      r.shelves.forEach(s => allShelves.push(s));
    });
  });

  let occupiedCount = 0;
  let totalStoredItems = 0;
  allShelves.forEach(s => {
    const items = getItemsForShelf(s, currentZone);
    if (items.length > 0) {
      occupiedCount++;
      totalStoredItems += items.length;
    }
  });

  const emptyCount = allShelves.length - occupiedCount;

  viewContainer.innerHTML = `
    <div class="page-hdr" style="margin-bottom:1rem">
      <div>
        <div style="font-size:0.7rem;font-weight:700;color:var(--goose);letter-spacing:0.08em;margin-bottom:0.15rem">PHYSICAL STORE LOCATION MATRIX</div>
        <h1 class="page-title">Store Layout & Shelf Directory</h1>
      </div>
      <div style="display:flex;gap:0.75rem;align-items:center;flex-wrap:wrap">
        <input type="text" class="field-input mono" placeholder="Search shelf code (e.g. F3, XX, A1)..." 
               value="${escHtml(searchQuery)}" 
               oninput="filterStoreMapShelves(this.value)" 
               style="width:260px;font-size:0.82rem;padding:0.45rem 0.75rem;background:var(--bg-surface)" />
      </div>
    </div>

    <!-- Zone Selector Tabs -->
    <div style="display:flex;gap:0.5rem;margin-bottom:1.25rem;border-bottom:1px solid var(--border-subtle);padding-bottom:0.75rem">
      <button class="btn ${currentZone === 'electrical' ? 'btn-primary' : 'btn-ghost'}" onclick="selectStoreMapZone('electrical')" style="gap:0.4rem;padding:0.45rem 1rem">
        Electrical Section (${ELECTRICAL_RACK_GROUPS.reduce((acc, g) => acc + g.racks.reduce((a, r) => a + r.shelves.length, 0), 0)} Shelves)
      </button>
      <button class="btn ${currentZone === 'mechanical' ? 'btn-primary' : 'btn-ghost'}" onclick="selectStoreMapZone('mechanical')" style="gap:0.4rem;padding:0.45rem 1rem">
        Mechanical Section (${MECHANICAL_RACK_GROUPS.reduce((acc, g) => acc + g.racks.reduce((a, r) => a + r.shelves.length, 0), 0)} Shelves)
      </button>
      <button class="btn ${currentZone === 'consumables' ? 'btn-primary' : 'btn-ghost'}" onclick="selectStoreMapZone('consumables')" style="gap:0.4rem;padding:0.45rem 1rem">
        Consumables Section (Unified Single Zone)
      </button>
    </div>

    <!-- Stats Summary Cards -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:0.875rem;margin-bottom:1.5rem">
      <div class="stat-card" style="padding:0.875rem 1rem">
        <div class="stat-label">TOTAL SHELVES</div>
        <div class="stat-value" style="color:var(--text-primary)">${allShelves.length}</div>
        <div class="stat-meta">${currentZone.toUpperCase()} ZONE</div>
      </div>
      <div class="stat-card" style="padding:0.875rem 1rem">
        <div class="stat-label">OCCUPIED SHELVES</div>
        <div class="stat-value" style="color:var(--accent-emerald)">${occupiedCount}</div>
        <div class="stat-meta">${Math.round((occupiedCount / (allShelves.length || 1)) * 100)}% Capacity Used</div>
      </div>
      <div class="stat-card" style="padding:0.875rem 1rem">
        <div class="stat-label">AVAILABLE / EMPTY</div>
        <div class="stat-value" style="color:var(--text-tertiary)">${emptyCount}</div>
        <div class="stat-meta">Ready for Inward Stock</div>
      </div>
      <div class="stat-card" style="padding:0.875rem 1rem">
        <div class="stat-label">STORED MATERIALS</div>
        <div class="stat-value" style="color:var(--goose)">${totalStoredItems}</div>
        <div class="stat-meta">Total Catalog Items</div>
      </div>
    </div>

    <!-- Rack Groups -->
    <div style="display:flex;flex-direction:column;gap:1.5rem">
      ${activeGroups.map(group => {
        const visibleRacks = group.racks.filter(r => {
          if (!searchQuery) return true;
          return r.name.toLowerCase().includes(searchQuery) || r.shelves.some(s => s.toLowerCase().includes(searchQuery));
        });

        if (visibleRacks.length === 0) return '';

        return `
          <div class="card" style="padding:1.25rem;background:var(--bg-raised)">
            <div style="margin-bottom:1rem;display:flex;justify-content:space-between;align-items:center">
              <div>
                <h3 style="margin:0 0 0.2rem 0;font-size:1.05rem;font-weight:700;color:var(--text-primary)">${group.groupTitle}</h3>
                <div style="font-size:0.78rem;color:var(--text-tertiary)">${group.description}</div>
              </div>
            </div>

            <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(280px, 1fr));gap:1rem">
              ${visibleRacks.map(rack => `
                <div style="background:var(--bg-surface);border:1px solid var(--border-subtle);border-radius:var(--radius);padding:0.875rem">
                  <div style="font-family:var(--font-mono);font-size:0.75rem;font-weight:800;color:var(--goose);margin-bottom:0.6rem;letter-spacing:0.05em">
                    ${rack.name.toUpperCase()}
                  </div>
                  <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(62px, 1fr));gap:0.45rem">
                    ${rack.shelves.map(shelf => {
                      const items = getItemsForShelf(shelf, currentZone);
                      const isOccupied = items.length > 0;
                      const hasLowStock = items.some(i => (i.quantity || 0) <= (i.minStock || 0));

                      let badgeStyle = 'background:var(--bg-elevated);border-color:var(--border-subtle);color:var(--text-secondary)';
                      let indicatorDot = `<span style="width:6px;height:6px;border-radius:50%;background:var(--border-muted)"></span>`;

                      if (isOccupied) {
                        badgeStyle = 'background:rgba(16,185,129,0.1);border-color:rgba(16,185,129,0.3);color:var(--accent-emerald)';
                        indicatorDot = `<span style="width:6px;height:6px;border-radius:50%;background:var(--accent-emerald)"></span>`;
                      }
                      if (hasLowStock) {
                        badgeStyle = 'background:rgba(245,158,11,0.12);border-color:rgba(245,158,11,0.4);color:#f59e0b';
                        indicatorDot = `<span style="width:6px;height:6px;border-radius:50%;background:#f59e0b"></span>`;
                      }

                      return `
                        <button type="button" 
                                onclick="openShelfDetailModal('${shelf}')"
                                style="${badgeStyle};border:1px solid;border-radius:6px;padding:0.45rem 0.25rem;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;transition:transform 0.15s ease, border-color 0.15s ease"
                                title="${shelf}: ${items.length} materials stored">
                          <div style="display:flex;align-items:center;gap:0.25rem;font-family:var(--font-mono);font-size:0.85rem;font-weight:800">
                            ${indicatorDot}
                            ${shelf}
                          </div>
                          <div style="font-size:0.65rem;margin-top:0.15rem;opacity:0.8">
                            ${items.length === 0 ? 'Empty' : `${items.length} ${items.length === 1 ? 'item' : 'items'}`}
                          </div>
                        </button>
                      `;
                    }).join('')}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function openShelfDetailModal(shelfCode) {
  currentInspectedShelf = shelfCode;
  const items = getItemsForShelf(shelfCode, state.storeMapZone);
  
  const titleEl = document.getElementById('shelf-detail-title');
  if (titleEl) titleEl.textContent = `Shelf Location: ${shelfCode}`;

  const contentEl = document.getElementById('shelf-detail-content');
  if (contentEl) {
    if (items.length === 0) {
      contentEl.innerHTML = `
        <div style="text-align:center;padding:2.5rem 1rem;color:var(--text-tertiary)">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:0.5rem;opacity:0.6"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
          <div style="font-weight:700;font-size:1rem;color:var(--text-primary);margin-bottom:0.25rem">Shelf ${shelfCode} is Currently Empty</div>
          <div style="font-size:0.8rem;color:var(--text-secondary)">No material items are registered under location "${shelfCode}".</div>
        </div>
      `;
    } else {
      contentEl.innerHTML = `
        <div style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:0.875rem">
          Found <strong>${items.length}</strong> ${items.length === 1 ? 'material item' : 'material items'} assigned to shelf <strong>${shelfCode}</strong>:
        </div>
        <div style="display:flex;flex-direction:column;gap:0.6rem;max-height:300px;overflow-y:auto;padding-right:0.25rem">
          ${items.map(item => `
            <div style="background:var(--bg-surface);border:1px solid var(--border-subtle);border-radius:var(--radius);padding:0.75rem;display:flex;align-items:center;justify-content:space-between;gap:0.75rem">
              <div style="display:flex;align-items:center;gap:0.65rem">
                ${getItemImageHtml(item)}
                <div>
                  <div style="font-weight:700;font-size:0.88rem;color:var(--text-primary)">${escHtml(item.name)}</div>
                  <div style="font-family:var(--font-mono);font-size:0.72rem;color:var(--goose)">SKU: ${escHtml(item.sku)}</div>
                </div>
              </div>
              <div style="text-align:right">
                <div style="font-family:var(--font-mono);font-weight:800;font-size:0.9rem;color:var(--text-primary)">${item.quantity} ${item.unit}</div>
                <div>${stockTag(item)}</div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }
  }

  document.getElementById('modal-shelf-detail-overlay')?.classList.remove('hidden');
}

function closeShelfDetailModal(e) {
  if (e && e.target !== document.getElementById('modal-shelf-detail-overlay')) return;
  document.getElementById('modal-shelf-detail-overlay')?.classList.add('hidden');
}

function addItemToCurrentShelf() {
  closeShelfDetailModal();
  openAddItemModal();
  const locEl = document.getElementById('item-location');
  if (locEl) locEl.value = currentInspectedShelf;
}

function filterTableByCurrentShelf() {
  closeShelfDetailModal();
  state.searchQuery = currentInspectedShelf;
  const searchInput = document.getElementById('search-input');
  if (searchInput) searchInput.value = currentInspectedShelf;
  navigateTo('inventory');
}

// ═══════════════════════════════════════════════════════════════════════════════
//  EXPORT INVENTORY DATA (CSV & PDF FORMATS)
// ═══════════════════════════════════════════════════════════════════════════════
function exportInventoryCSV() {
  const items = state.items;
  if (!items || items.length === 0) {
    showToast('No material inventory to export', 'warning');
    return;
  }

  const headers = [
    'Item ID', 'SKU / Barcode', 'Material Name', 'Zone', 'Category', 
    'Quantity', 'Unit', 'Unit Rate (INR)', 'Total Value (INR)', 'Min Stock', 
    'Shelf Location', 'HSN', 'Notes', 'Added Date'
  ];

  const escapeCSV = (str) => {
    if (str === null || str === undefined) return '""';
    const val = String(str).replace(/"/g, '""');
    return `"${val}"`;
  };

  const rows = items.map(item => {
    const qty = parseInt(item.quantity) || 0;
    const rate = parseFloat(item.rate) || 0;
    const totalVal = (qty * rate).toFixed(2);

    return [
      escapeCSV(item.id),
      escapeCSV(item.sku || item.barcode || ''),
      escapeCSV(item.name || ''),
      escapeCSV(item.zone || ''),
      escapeCSV(item.category || ''),
      qty,
      escapeCSV(item.unit || 'pcs'),
      rate.toFixed(2),
      totalVal,
      item.minStock ?? 0,
      escapeCSV(item.location || ''),
      escapeCSV(item.hsn || ''),
      escapeCSV(item.notes || ''),
      escapeCSV(item.addedAt ? item.addedAt.split('T')[0] : '')
    ].join(',');
  });

  const csvString = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  const dateStr = new Date().toISOString().split('T')[0];
  link.href = url;
  link.download = `Goose_Store_Inventory_${dateStr}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  showToast(`Exported ${items.length} materials to CSV spreadsheet!`, 'success');
}

function exportInventoryPDF() {
  const items = state.items;
  if (!items || items.length === 0) {
    showToast('No material inventory to export', 'warning');
    return;
  }

  showToast('Generating Inventory PDF Report...', 'info');

  try {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      showToast('Preparing PDF generator... Opening print view.', 'info');
      window.print();
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    const totalQty = items.reduce((sum, i) => sum + (parseInt(i.quantity) || 0), 0);
    const totalValue = items.reduce((sum, i) => sum + ((parseInt(i.quantity) || 0) * (parseFloat(i.rate) || 0)), 0);

    // Title Header
    doc.setFillColor(15, 23, 42); // Dark industrial navy
    doc.rect(0, 0, 210, 26, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text('GOOSE INDUSTRIAL SOLUTIONS PVT LTD', 14, 11);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(56, 189, 248);
    doc.text('STORE INVENTORY MANAGEMENT REPORT', 14, 19);

    doc.setFontSize(8);
    doc.setTextColor(203, 213, 225);
    doc.text(`Generated: ${dateStr}, ${timeStr}`, 145, 19);

    // Summary Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, 30, 182, 14, 2, 2, 'FD');

    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Materials: ${items.length}`, 18, 39);
    doc.text(`Total Stock Quantity: ${totalQty.toLocaleString('en-IN')} pcs`, 75, 39);
    doc.text(`Total Inventory Value: INR ${totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 132, 39);

    // AutoTable
    const tableHeaders = [['#', 'SKU / CODE', 'MATERIAL NAME', 'ZONE', 'QTY', 'UNIT RATE', 'LOCATION']];
    const tableRows = items.map((item, index) => {
      const zoneName = item.zone ? item.zone.charAt(0).toUpperCase() + item.zone.slice(1) : 'General';
      const rateStr = item.rate ? `INR ${parseFloat(item.rate).toLocaleString('en-IN')}` : 'INR 0';
      return [
        index + 1,
        item.sku || item.barcode || '-',
        item.name.length > 32 ? item.name.slice(0, 32) + '...' : item.name,
        zoneName,
        `${item.quantity || 0} ${item.unit || 'pcs'}`,
        rateStr,
        item.location || 'A1'
      ];
    });

    if (doc.autoTable) {
      doc.autoTable({
        head: tableHeaders,
        body: tableRows,
        startY: 48,
        theme: 'grid',
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: 'bold',
          halign: 'left'
        },
        bodyStyles: {
          fontSize: 7.5,
          textColor: [30, 41, 59]
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 32, fontStyle: 'bold' },
          2: { cellWidth: 60 },
          3: { cellWidth: 26 },
          4: { cellWidth: 20, fontStyle: 'bold' },
          5: { cellWidth: 24 },
          6: { cellWidth: 15 }
        },
        didDrawPage: function (data) {
          doc.setFontSize(7.5);
          doc.setTextColor(148, 163, 184);
          doc.text(`Page ${data.pageNumber} — Goose Store Inventory System`, 14, doc.internal.pageSize.height - 8);
          doc.text('Store Manager Sign-Off: ____________________', 125, doc.internal.pageSize.height - 8);
        }
      });
    }

    doc.save(`Goose_Store_Inventory_${now.toISOString().split('T')[0]}.pdf`);
    showToast('Inventory PDF report downloaded successfully!', 'success');
  } catch (err) {
    console.error('PDF Export Error:', err);
    showToast('Failed to generate PDF. Opening printable report...', 'warning');
    window.print();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  INVENTORY
// ═══════════════════════════════════════════════════════════════════════════════
function renderInventory() {
  const isManager = state.user?.role === 'manager';

  document.getElementById('view-inventory').innerHTML = `
    <div class="page-hdr">
      <div>
        <h1 class="page-title">Store Inventory</h1>
        <p class="page-subtitle" id="inventory-subtitle-count">Showing 0 of 0 materials</p>
      </div>
      <div style="display:flex;gap:0.625rem;align-items:center">
        <button class="btn btn-ghost" onclick="exportInventoryCSV()" title="Export Inventory to CSV Spreadsheet" style="display:inline-flex;align-items:center;gap:0.4rem">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export CSV
        </button>
        <button class="btn btn-ghost" onclick="exportInventoryPDF()" title="Export Inventory PDF Report" style="display:inline-flex;align-items:center;gap:0.4rem">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          Export PDF
        </button>
        ${isManager ? `<button class="btn btn-primary" onclick="openAddItemModal()">+ Add Item</button>` : ''}
      </div>
    </div>

    <!-- Search Input (Kept intact during typing) -->
    <div style="margin-bottom:1rem">
      <input type="text" id="inventory-search-input" class="field-input" placeholder="Search materials by name, SKU, shelf location..."
        value="${escHtml(state.searchQuery)}" oninput="state.searchQuery=this.value;filterAndRenderInventoryRows()" style="font-size:0.9rem;padding:0.7rem 0.875rem" />
    </div>

    <!-- Filter Bar: Zone & Stock Availability -->
    <div style="display:flex;flex-wrap:wrap;gap:1rem;margin-bottom:1.25rem;align-items:center;justify-content:space-between">
      
      <!-- Zone Filter Pills -->
      <div style="display:flex;gap:0.4rem;flex-wrap:wrap">
        <span style="font-size:0.75rem;font-weight:600;color:var(--text-tertiary);display:flex;align-items:center;margin-right:0.25rem">ZONE:</span>
        <button class="btn btn-ghost btn-sm ${state.filters.zone==='all'?'btn-primary':''}" onclick="state.filters.zone='all';renderInventory()">All Zones</button>
        <button class="btn btn-ghost btn-sm ${state.filters.zone==='mechanical'?'btn-primary':''}" onclick="state.filters.zone='mechanical';renderInventory()">Mechanical</button>
        <button class="btn btn-ghost btn-sm ${state.filters.zone==='electrical'?'btn-primary':''}" onclick="state.filters.zone='electrical';renderInventory()">Electrical</button>
        <button class="btn btn-ghost btn-sm ${state.filters.zone==='consumables'?'btn-primary':''}" onclick="state.filters.zone='consumables';renderInventory()">Consumables</button>
      </div>

      <!-- Stock Availability Filter Pills -->
      <div style="display:flex;gap:0.4rem;flex-wrap:wrap">
        <span style="font-size:0.75rem;font-weight:600;color:var(--text-tertiary);display:flex;align-items:center;margin-right:0.25rem">STOCK:</span>
        <button class="btn btn-ghost btn-sm ${(state.filters.stockAvailability||'all')==='all'?'btn-primary':''}" onclick="state.filters.stockAvailability='all';renderInventory()">All Stock</button>
        <button class="btn btn-ghost btn-sm ${(state.filters.stockAvailability)==='instock'?'btn-primary':''}" onclick="state.filters.stockAvailability='instock';renderInventory()">In Stock</button>
        <button class="btn btn-ghost btn-sm ${(state.filters.stockAvailability)==='out'?'btn-primary':''}" onclick="state.filters.stockAvailability='out';renderInventory()">Out of Stock</button>
        <button class="btn btn-ghost btn-sm ${(state.filters.stockAvailability)==='low'?'btn-primary':''}" onclick="state.filters.stockAvailability='low';renderInventory()">Stock Alerts</button>
      </div>

    </div>

    <div class="card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th style="width:48px">Photo</th>
              <th>SKU / Code</th>
              <th>Material Name</th>
              <th>Zone</th>
              <th>Category</th>
              <th>Quantity</th>
              <th>Shelf</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="inventory-tbody-content">
          </tbody>
        </table>
      </div>
    </div>
  `;

  filterAndRenderInventoryRows();
}

function filterAndRenderInventoryRows() {
  let items = [...state.items];
  if (state.filters.zone && state.filters.zone !== 'all') items = items.filter(i => i.zone === state.filters.zone);
  
  const avail = state.filters.stockAvailability || 'all';
  if (avail === 'instock') {
    // In Stock (Green): quantity > minStock
    items = items.filter(i => (i.quantity || 0) > (i.minStock || 0));
  } else if (avail === 'low') {
    // Low Stock (Yellow): quantity > 0 AND quantity <= minStock
    items = items.filter(i => (i.quantity || 0) > 0 && (i.quantity || 0) <= (i.minStock || 0));
  } else if (avail === 'out') {
    // Out of Stock (Red): quantity === 0
    items = items.filter(i => (i.quantity || 0) === 0);
  }

  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    items = items.filter(i => 
      (i.name || '').toLowerCase().includes(q) || 
      (i.sku || '').toLowerCase().includes(q) || 
      (i.barcode || '').toLowerCase().includes(q) || 
      (i.location || '').toLowerCase().includes(q) ||
      (i.category || '').toLowerCase().includes(q) ||
      (i.soNumber || i.so || '').toLowerCase().includes(q) ||
      (i.poNumber || i.po || '').toLowerCase().includes(q)
    );
  }

  const subtitle = document.getElementById('inventory-subtitle-count');
  const filterLabelMap = {
    instock: 'In Stock',
    low: 'Low Stock Alerts',
    out: 'Out of Stock'
  };
  const activeLabel = filterLabelMap[avail] ? ` &middot; Filtered: ${filterLabelMap[avail]}` : '';
  if (subtitle) subtitle.innerHTML = `Showing ${items.length} of ${state.items.length} materials${activeLabel}`;

  const tbody = document.getElementById('inventory-tbody-content');
  if (!tbody) return;

  const isManager = state.user?.role === 'manager';

  if (items.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align:center;padding:3rem;color:var(--text-tertiary)">
          No materials matching "${escHtml(state.searchQuery)}"
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = items.map(item => `
    <tr>
      <td>${getItemImageHtml(item)}</td>
      <td style="font-family:var(--font-mono);font-size:0.75rem">${escHtml(item.sku)}</td>
      <td>
        <strong style="font-size:0.85rem">${escHtml(item.name)}</strong>
        ${item.notes ? `<div style="font-size:0.7rem;color:var(--text-tertiary)">${escHtml(item.notes)}</div>` : ''}
        ${(item.soNumber || item.so || item.poNumber || item.po) ? `
          <div style="display:flex;gap:0.35rem;font-size:0.68rem;margin-top:0.2rem;font-family:var(--font-mono)">
            ${(item.soNumber || item.so) ? `<span style="background:rgba(59,130,246,0.12);color:var(--accent-cyan);padding:0.08rem 0.35rem;border-radius:3px;border:1px solid rgba(59,130,246,0.25)">SO: ${escHtml(item.soNumber || item.so)}</span>` : ''}
            ${(item.poNumber || item.po) ? `<span style="background:rgba(16,185,129,0.12);color:var(--accent-emerald);padding:0.08rem 0.35rem;border-radius:3px;border:1px solid rgba(16,185,129,0.25)">PO: ${escHtml(item.poNumber || item.po)}</span>` : ''}
          </div>
        ` : ''}
      </td>
      <td>${zoneInlineTag(item.zone)}</td>
      <td style="color:var(--text-tertiary);font-size:0.75rem">${escHtml(item.category)}</td>
      <td style="font-family:var(--font-mono);font-weight:600">${item.quantity} ${item.unit}</td>
      <td style="font-family:var(--font-mono);font-size:0.75rem">${escHtml(item.location)}</td>
      <td>${stockTag(item)}</td>
      <td>
        <div style="display:flex;gap:0.3rem">
          <button class="btn btn-ghost btn-sm" title="Print Barcode on Tej C15" onclick="openPrintModal('${item.id}')">Sticker</button>
          <button class="btn btn-ghost btn-sm" title="Request Material" onclick="openRequestModal('${item.id}')">Request</button>
          ${isManager ? `<button class="btn btn-ghost btn-sm" onclick="openEditItemModal('${item.id}')">Edit</button>` : ''}
          ${isManager ? `<button class="btn btn-ghost btn-sm" onclick="deleteItem('${item.id}')" title="Delete this material" style="color:var(--danger)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
          </button>` : ''}
        </div>
      </td>
    </tr>
  `).join('');
}

// ═══════════════════════════════════════════════════════════════════════════════
//  REQUESTS
// ═══════════════════════════════════════════════════════════════════════════════
function renderRequests() {
  const isManager = state.user?.role === 'manager';
  const reqs = state.requests || [];
  const isMobile = window.innerWidth <= 640;

  let contentHtml = '';

  if (reqs.length === 0) {
    contentHtml = `
      <div style="text-align:center;padding:3.5rem 1rem;color:var(--text-tertiary)">
        <div style="font-weight:700;font-size:1.05rem;color:var(--text-primary);margin-bottom:0.35rem">No Supplier Offers Submitted</div>
        <div style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:1.25rem">Engineers can request items from the inventory at any time.</div>
        <button class="btn btn-primary btn-sm" onclick="openRequestModal()" style="margin:0 auto">+ Request Material</button>
      </div>
    `;
  } else if (isMobile) {
    // Mobile Touch Cards
    contentHtml = `
      <div style="display:flex;flex-direction:column;gap:0.75rem;padding:0.75rem">
        ${reqs.map(r => {
          const mats = Array.isArray(r.materials) ? r.materials : (
            r.itemName ? [{ itemName: r.itemName, itemSku: r.itemSku || r.itemId, quantity: r.quantityRequested, unit: r.unit }] : []
          );
          const matsHtml = mats.map(m =>
            `<div style="display:flex;justify-content:space-between;font-size:0.78rem;padding:0.25rem 0;border-bottom:1px solid var(--border-muted)">
              <span style="color:var(--text-primary);font-weight:600">${escHtml(m.itemName)}</span>
              <span style="font-family:var(--font-mono);color:var(--goose);font-weight:700">${m.quantity} ${m.unit || 'pcs'}</span>
            </div>`
          ).join('');
          return `
          <div style="background:var(--bg-elevated);border:1px solid var(--border-subtle);border-radius:var(--radius-md);padding:0.875rem;display:flex;flex-direction:column;gap:0.5rem">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:0.5rem">
              <div>
                <strong style="font-size:0.95rem;color:var(--text-primary);display:block;margin-bottom:0.15rem">${escHtml(r.name || r.engineerName)}</strong>
                <span style="font-size:0.72rem;color:var(--text-tertiary)">EID: ${escHtml(r.employeeId || '—')} &nbsp;|&nbsp; Project: ${escHtml(r.projectName)}</span>
              </div>
              ${reqStatusTag(r.status)}
            </div>
            <div style="background:var(--bg-surface);padding:0.4rem 0.625rem;border-radius:var(--radius);border:1px solid var(--border-muted);display:flex;flex-direction:column;gap:0.15rem">
              ${matsHtml}
            </div>
            <div style="font-size:0.72rem;color:var(--text-tertiary);display:flex;justify-content:space-between;align-items:center">
              <span>${escHtml(r.purpose || '')}</span>
              <span>${new Date(r.requestedAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}</span>
            </div>
            ${isManager ? (() => {
              if (r.status === 'pending') return `
                <div style="display:flex;gap:0.5rem;margin-top:0.4rem">
                  <button class="btn btn-primary btn-sm" style="flex:1;justify-content:center" onclick="processRequest('${r.id}', 'approved')">Approve</button>
                  <button class="btn btn-danger btn-sm" style="flex:1;justify-content:center" onclick="processRequest('${r.id}', 'rejected')">Reject</button>
                </div>`;
              if (r.status === 'approved') return `
                <div style="display:flex;gap:0.4rem;margin-top:0.4rem">
                  <button class="btn btn-primary btn-sm" style="flex:1;justify-content:center;gap:0.3rem" onclick="openChecklistModal('${r.id}')" title="Open Issue Checklist">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>
                    Issue
                  </button>
                  <button class="btn btn-ghost btn-sm" style="flex:1;justify-content:center" onclick="revertApproval('${r.id}')" title="Revert to Pending">Revert</button>
                </div>`;
              if (r.status === 'issued') return `
                <div style="margin-top:0.4rem">
                  <button class="btn btn-ghost btn-sm" style="width:100%;justify-content:center;gap:0.3rem;opacity:0.6" onclick="openChecklistModal('${r.id}', true)" title="View Issue Record">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>
                    View Record
                  </button>
                </div>`;
              return '';
            })() : ''}
          </div>`;
        }).join('')}
      </div>
    `;
  } else {
    // Desktop Table
    contentHtml = `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Submitted At</th>
              <th>Name / EID</th>
              <th>Materials</th>
              <th>Project</th>
              <th>Status</th>
              ${isManager ? '<th>Action</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${reqs.map(r => {
              const mats = Array.isArray(r.materials) ? r.materials : (
                r.itemName ? [{ itemName: r.itemName, itemSku: r.itemSku || r.itemId, quantity: r.quantityRequested, unit: r.unit }] : []
              );
              const matsHtml = mats.map(m =>
                `<div style="font-size:0.78rem;display:flex;gap:0.4rem;align-items:baseline">
                  <span style="font-weight:600;color:var(--text-primary)">${escHtml(m.itemName)}</span>
                  <span style="font-family:var(--font-mono);color:var(--goose);font-size:0.72rem">${m.quantity} ${m.unit || 'pcs'}</span>
                </div>`
              ).join('');
              return `
              <tr>
                <td style="font-size:0.75rem;color:var(--text-tertiary)">${new Date(r.requestedAt).toLocaleString('en-IN')}</td>
                <td>
                  <strong>${escHtml(r.name || r.engineerName)}</strong>
                  ${r.employeeId ? `<div style="font-size:0.72rem;color:var(--text-tertiary)">${escHtml(r.employeeId)}</div>` : ''}
                </td>
                <td style="max-width:240px">${matsHtml}</td>
                <td>${escHtml(r.projectName)}</td>
                <td>${reqStatusTag(r.status)}</td>
                ${isManager ? `
                  <td style="white-space:nowrap">
                    ${r.status === 'pending' ? `
                      <div style="display:flex;gap:0.5rem;align-items:center">
                        <button class="btn btn-primary btn-sm" onclick="processRequest('${r.id}', 'approved')">Approve</button>
                        <button class="btn btn-danger btn-sm" onclick="processRequest('${r.id}', 'rejected')">Reject</button>
                      </div>
                    ` : r.status === 'approved' ? `
                      <div style="display:flex;gap:0.5rem;align-items:center">
                        <button class="btn btn-primary btn-sm" style="gap:0.3rem" onclick="openChecklistModal('${r.id}')" title="Open Issue Checklist">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>
                          Issue
                        </button>
                        <button class="btn btn-ghost btn-sm" onclick="revertApproval('${r.id}')" title="Revert to Pending">Revert</button>
                      </div>
                    ` : r.status === 'issued' ? `
                      <button class="btn btn-ghost btn-sm" style="gap:0.3rem;opacity:0.6" onclick="openChecklistModal('${r.id}', true)" title="View Issue Record">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>
                        View Record
                      </button>
                    ` : `<span style="font-size:0.75rem;color:var(--text-tertiary)">—</span>`}
                  </td>
                ` : ''}
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  document.getElementById('view-requests').innerHTML = `
    <div class="page-hdr">
      <div>
        <h1 class="page-title">Supplier Offers</h1>
        <p class="page-subtitle">${isManager ? 'Review &amp; approve supplier offers' : 'Your submitted supplier offers'}</p>
      </div>
      <div>
        <button class="btn btn-primary" onclick="openRequestModal()">+ Request Material</button>
      </div>
    </div>

    <div class="card">
      ${contentHtml}
    </div>
  `;
}

async function processRequest(reqId, status) {
  try {
    await api.put(`/api/requests/${reqId}`, { status, processedBy: state.user?.name });
    const labels = { approved: 'Offer approved', rejected: 'Offer rejected', pending: 'Reverted to pending' };
    showToast(labels[status] || `Status: ${status}`, 'success');
    await loadAll();
    renderView('requests');
  } catch (err) {
    showToast('Failed to process request', 'error');
  }
}

// ─── Issue Checklist & Barcode Verification Modal ────────────────────────────
function openChecklistModal(reqId, readOnly = false) {
  const req = state.requests.find(r => r.id === reqId);
  if (!req) return;

  state.activeChecklistRequestId = reqId;
  const savedChecklist = Array.isArray(req.checklist) && req.checklist.length ? req.checklist : null;

  // Build checklist from request's materials
  state.activeChecklist = (req.materials || []).map(m => {
    const invItem = state.items.find(i => i.id === m.itemId || i.sku === m.itemSku || i.barcode === m.itemSku);
    const saved = savedChecklist?.find(c => c.itemId === m.itemId);
    return {
      itemId:       m.itemId,
      itemName:     m.itemName,
      itemSku:      m.itemSku || m.itemId,
      barcode:      invItem?.barcode || m.itemSku || m.itemId,
      location:     invItem?.location || 'Rack',
      quantity:     m.quantity,
      unit:         m.unit || 'pcs',
      checked:      readOnly ? (saved?.checked ?? false) : false
    };
  });

  // Header
  document.getElementById('checklist-modal-title').textContent =
    `Issue Materials — ${req.projectName || req.name || 'Order'}`;

  // Info block
  const info = document.getElementById('checklist-info-block');
  const row = (label, val) =>
    `<div><span style="font-size:0.7rem;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.05em">${label}</span><div style="font-weight:600;color:var(--text-primary);margin-top:0.1rem">${escHtml(val || '—')}</div></div>`;
  info.innerHTML =
    row('Engineer Name', req.name || req.engineerName) +
    row('Employee ID', req.employeeId) +
    row('Target Project', req.projectName) +
    row('Purpose', req.purpose);

  // Scan container visibility
  const scanContainer = document.getElementById('checklist-scan-container');
  if (scanContainer) scanContainer.style.display = readOnly ? 'none' : 'block';

  // Barcode input auto-focus
  const barcodeInput = document.getElementById('checklist-barcode-input');
  if (barcodeInput) {
    barcodeInput.value = '';
    if (!readOnly) {
      setTimeout(() => barcodeInput.focus(), 150);
    }
  }

  const feedbackEl = document.getElementById('checklist-scan-feedback');
  if (feedbackEl) {
    feedbackEl.style.display = 'none';
    feedbackEl.innerHTML = '';
  }

  // Remarks
  const remarksEl = document.getElementById('checklist-remarks');
  remarksEl.value = req.managerNotes || '';
  remarksEl.readOnly = readOnly;

  // Stock Out button
  const issueBtn = document.getElementById('checklist-issue-btn');
  if (issueBtn) issueBtn.style.display = readOnly ? 'none' : '';

  renderChecklistRows(readOnly);
  document.getElementById('modal-checklist-overlay').classList.remove('hidden');
}

function handleChecklistScanKey(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    processChecklistBarcodeScan();
  }
}

function processChecklistBarcodeScan() {
  const input = document.getElementById('checklist-barcode-input');
  if (!input) return;
  const rawCode = input.value.trim();
  if (!rawCode) return;

  const code = rawCode.toLowerCase();
  const feedbackEl = document.getElementById('checklist-scan-feedback');

  // Match code against itemSku, barcode, itemId, or itemName in activeChecklist
  const item = (state.activeChecklist || []).find(c => 
    c.itemId.toLowerCase() === code ||
    (c.itemSku && c.itemSku.toLowerCase() === code) ||
    (c.barcode && c.barcode.toLowerCase() === code) ||
    c.itemName.toLowerCase().includes(code)
  );

  if (item) {
    item.checked = true;
    input.value = '';
    renderChecklistRows();
    
    if (feedbackEl) {
      feedbackEl.style.display = 'block';
      feedbackEl.style.color = '#10b981';
      feedbackEl.innerHTML = `✓ Verified &amp; Scanned: <strong>${escHtml(item.itemName)}</strong> (${item.quantity} ${item.unit})`;
    }
    showToast(`Scanned & Verified: ${item.itemName}`, 'success');
  } else {
    if (feedbackEl) {
      feedbackEl.style.display = 'block';
      feedbackEl.style.color = '#ef4444';
      feedbackEl.innerHTML = `✗ Barcode <strong>"${escHtml(rawCode)}"</strong> not found in this request order.`;
    }
    showToast(`Barcode "${rawCode}" not in request list`, 'error');
  }
}

function renderChecklistRows(readOnly = false) {
  const container = document.getElementById('checklist-rows');
  const badgeEl = document.getElementById('checklist-progress-badge');
  if (!container) return;
  const cl = state.activeChecklist || [];
  const checkedCount = cl.filter(c => c.checked).length;

  if (badgeEl) {
    badgeEl.textContent = `${checkedCount} of ${cl.length} Verified (${cl.length ? Math.round(checkedCount / cl.length * 100) : 0}%)`;
    badgeEl.style.color = (checkedCount === cl.length && cl.length > 0) ? '#10b981' : 'var(--text-tertiary)';
  }

  container.innerHTML = cl.map((c, idx) => {
    const chk = c.checked;
    return `
      <div onclick="${readOnly ? '' : `toggleChecklistItem('${c.itemId}')`}"
        style="display:flex;align-items:center;gap:0.75rem;padding:0.6rem 0.85rem;
               background:${chk ? 'rgba(16,185,129,0.08)' : 'var(--bg-raised)'};
               border:1px solid ${chk ? 'rgba(16,185,129,0.35)' : 'var(--border-subtle)'};
               border-radius:var(--radius-md);cursor:${readOnly ? 'default' : 'pointer'};
               transition:all 0.15s">
        <!-- Checkbox -->
        <div style="width:20px;height:20px;flex-shrink:0;border-radius:4px;
                    border:2px solid ${chk ? '#10b981' : 'var(--border-muted)'};
                    background:${chk ? '#10b981' : 'transparent'};
                    display:flex;align-items:center;justify-content:center;transition:all 0.15s">
          ${chk ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>` : ''}
        </div>
        <!-- Details -->
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:0.4rem">
            <span style="font-size:0.875rem;font-weight:600;color:${chk ? 'var(--text-primary)' : 'var(--text-primary)'}">
              ${escHtml(c.itemName)}
            </span>
            ${chk ? `<span style="font-size:0.65rem;background:rgba(16,185,129,0.2);color:#10b981;padding:0.1rem 0.35rem;border-radius:4px;font-weight:700">VERIFIED</span>` : ''}
          </div>
          <div style="font-size:0.72rem;color:var(--text-tertiary);font-family:var(--font-mono);margin-top:0.1rem">
            SKU: ${escHtml(c.itemSku)} &nbsp;|&nbsp; Shelf: ${escHtml(c.location || 'R-A1')}
          </div>
        </div>
        <!-- Quantity badge -->
        <div style="text-align:right">
          <span style="font-size:0.85rem;font-family:var(--font-mono);font-weight:700;color:${chk ? '#10b981' : 'var(--goose)'}">
            ${c.quantity} ${c.unit}
          </span>
          <div style="font-size:0.68rem;color:var(--text-tertiary)">${chk ? 'Scanned' : 'Pending'}</div>
        </div>
      </div>`;
  }).join('');
}

function toggleChecklistItem(itemId) {
  const entry = (state.activeChecklist || []).find(c => c.itemId === itemId);
  if (!entry) return;
  entry.checked = !entry.checked;
  renderChecklistRows();
}

function closeChecklistModal(e) {
  if (e && e.target !== document.getElementById('modal-checklist-overlay')) return;
  document.getElementById('modal-checklist-overlay')?.classList.add('hidden');
  state.activeChecklistRequestId = null;
  state.activeChecklist = [];
}

async function submitIssue() {
  const reqId = state.activeChecklistRequestId;
  if (!reqId) return;
  const cl = state.activeChecklist || [];
  const unchecked = cl.filter(c => !c.checked).length;
  const remarks = document.getElementById('checklist-remarks')?.value.trim() || '';

  const doIssue = async () => {
    try {
      await api.put(`/api/requests/${reqId}`, {
        status: 'issued',
        checklist: cl,
        managerNotes: remarks,
        processedBy: state.user?.name || 'Store Manager'
      });
      document.getElementById('modal-checklist-overlay')?.classList.add('hidden');
      state.activeChecklistRequestId = null;
      state.activeChecklist = [];
      showToast('Material Stock Out completed & logged in Stock Movements!', 'success');
      await loadAll();
      renderView('requests');
    } catch (err) {
      showToast('Failed to complete stock out', 'error');
    }
  };

  if (unchecked > 0) {
    showConfirmModal({
      title: 'Stock Out with unchecked items?',
      message: `${unchecked} of ${cl.length} material${unchecked > 1 ? 's' : ''} not yet scanned or verified. Complete Stock Out anyway?`,
      confirmLabel: 'Stock Out Anyway',
      onConfirm: doIssue
    });
  } else {
    await doIssue();
  }
}

function revertApproval(reqId) {
  showConfirmModal({
    title: 'Revert Approval',
    message: 'Move this Supplier Offer back to Pending? Any checklist progress will be discarded.',
    confirmLabel: 'Revert',
    onConfirm: async () => {
      try {
        await api.put(`/api/requests/${reqId}`, {
          status: 'pending',
          processedBy: null,
          processedAt: null,
          checklist: [],
          managerNotes: ''
        });
        showToast('Offer reverted to pending', 'success');
        await loadAll();
        renderView('requests');
      } catch (err) {
        showToast('Failed to revert approval', 'error');
      }
    }
  });
}

// ─── Custom Confirm Modal ─────────────────────────────────────────────────────
function showConfirmModal({ title, message, confirmLabel = 'Delete', onConfirm }) {
  document.getElementById('confirm-modal-title').textContent = title;
  document.getElementById('confirm-modal-message').textContent = message;
  const okBtn = document.getElementById('confirm-modal-ok');
  okBtn.textContent = confirmLabel;
  okBtn.onclick = () => { closeConfirmModal(); onConfirm(); };
  document.getElementById('modal-confirm-overlay').classList.remove('hidden');
}

function closeConfirmModal() {
  document.getElementById('modal-confirm-overlay').classList.add('hidden');
}

// ─── Delete Item ──────────────────────────────────────────────────────────────
async function deleteItem(id, name) {
  if (state.user?.role !== 'manager') {
    showToast('Access Denied: Only Store Manager can delete inventory items', 'error');
    return;
  }
  const item = state.items.find(i => i.id === id);
  const itemName = item ? item.name : (name || 'this material');
  showConfirmModal({
    title: 'Delete Material',
    message: `Remove "${itemName}" from inventory? This cannot be undone.`,
    confirmLabel: 'Delete',
    onConfirm: async () => {
      try {
        const res = await api.delete(`/api/items/${id}`);
        if (res.success) {
          showToast(`"${itemName}" deleted from inventory`, 'success');
          await loadAll();
          renderView(state.currentView);
        } else {
          showToast('Failed to delete item', 'error');
        }
      } catch (err) {
        showToast('Error deleting item', 'error');
      }
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ITEM MODAL & IMAGE HANDLING
// ═══════════════════════════════════════════════════════════════════════════════
function generateProductId() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const seq = String(Math.floor(Math.random() * 9000) + 1000);
  const id = `GIS-${yy}${mm}-${seq}`;
  const skuEl = document.getElementById('item-sku');
  const bcEl = document.getElementById('item-barcode');
  if (skuEl) skuEl.value = id;
  if (bcEl) bcEl.value = id;
  return id;
}

function populateCategorySuggestions() {
  const dl = document.getElementById('category-suggestions');
  if (!dl) return;
  // Collect unique, non-empty categories from live state (case-insensitive dedup, preserve first-seen casing)
  const seen = new Map();
  (state.items || []).forEach(item => {
    const cat = (item.category || '').trim();
    if (cat && !seen.has(cat.toLowerCase())) {
      seen.set(cat.toLowerCase(), cat);
    }
  });
  const sorted = [...seen.values()].sort((a, b) => a.localeCompare(b));
  dl.innerHTML = sorted.map(c => `<option value="${c}"></option>`).join('');
}

function openAddItemModal() {
  state.editingItemId = null;
  document.getElementById('modal-item-title').textContent = 'New Item';
  document.getElementById('form-item').reset();
  // Clear Zoho Code, SO #, and PO # explicitly
  const zohoEl = document.getElementById('item-zoho-code');
  if (zohoEl) zohoEl.value = '';
  const soEl = document.getElementById('item-so');
  if (soEl) soEl.value = '';
  const poEl = document.getElementById('item-po');
  if (poEl) poEl.value = '';

  setImagePreview('');
  // Auto-generate product ID
  generateProductId();
  // Hide duplicate warning
  document.getElementById('duplicate-warning')?.classList.add('hidden');
  // Wire up live duplicate detection
  const nameEl = document.getElementById('item-name');
  if (nameEl) {
    nameEl.oninput = () => checkDuplicateName(nameEl.value);
  }
  // Populate category autocomplete suggestions from existing items
  populateCategorySuggestions();
  document.getElementById('modal-item-overlay').classList.remove('hidden');
}

function openEditItemModal(id) {
  const item = state.items.find(i => i.id === id);
  if (!item) return;
  state.editingItemId = id;
  document.getElementById('modal-item-title').textContent = 'Edit Item';
  document.getElementById('item-name').value = item.name;
  const skuEl = document.getElementById('item-sku');
  if (skuEl) { skuEl.value = item.sku; skuEl.removeAttribute('readonly'); }
  document.getElementById('item-zone').value = item.zone;
  document.getElementById('item-category').value = item.category;
  document.getElementById('item-quantity').value = item.quantity;
  document.getElementById('item-unit').value = item.unit;
  document.getElementById('item-min-stock').value = item.minStock ?? 0;
  document.getElementById('item-location').value = item.location;
  document.getElementById('item-barcode').value = item.barcode || item.sku || '';
  document.getElementById('item-notes').value = item.notes || '';
  // Populate Zoho Code, SO #, and PO #
  const zohoEl = document.getElementById('item-zoho-code');
  if (zohoEl) zohoEl.value = item.zohoCode || '';
  const soEl = document.getElementById('item-so');
  if (soEl) soEl.value = item.soNumber || item.so || '';
  const poEl = document.getElementById('item-po');
  if (poEl) poEl.value = item.poNumber || item.po || '';

  setImagePreview(item.imageUrl || '');
  document.getElementById('duplicate-warning')?.classList.add('hidden');
  const nameEl = document.getElementById('item-name');
  if (nameEl) nameEl.oninput = null;
  // Populate category autocomplete suggestions from existing items
  populateCategorySuggestions();
  document.getElementById('modal-item-overlay').classList.remove('hidden');
}

function closeItemModal(e) {
  if (e && e.target === document.getElementById('modal-item-overlay')) {
    // Prevent accidental closing when clicking outside the Add Item modal
    return;
  }
  document.getElementById('modal-item-overlay')?.classList.add('hidden');
  const nameEl = document.getElementById('item-name');
  if (nameEl) nameEl.oninput = null;
}

function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';

  const eyeOpen = btn.querySelector('.eye-icon-open');
  const eyeClosed = btn.querySelector('.eye-icon-closed');
  if (eyeOpen && eyeClosed) {
    eyeOpen.classList.toggle('hidden', isPassword);
    eyeClosed.classList.toggle('hidden', !isPassword);
  }
}

function checkDuplicateName(name) {
  if (!name || name.length < 4) {
    document.getElementById('duplicate-warning')?.classList.add('hidden');
    return;
  }
  const lower = name.toLowerCase();
  const matches = state.items.filter(i =>
    i.name && i.name.toLowerCase().includes(lower.slice(0, Math.min(lower.length, 12)))
  );
  const warn = document.getElementById('duplicate-warning');
  const warnText = document.getElementById('duplicate-warning-text');
  if (matches.length > 0 && warn && warnText) {
    warnText.textContent = `"${matches[0].name}" already exists in inventory (SKU: ${matches[0].sku}). Are you adding a different item?`;
    warn.classList.remove('hidden');
  } else if (warn) {
    warn.classList.add('hidden');
  }
}

async function handleItemSubmit(e) {
  e.preventDefault();
  const skuEl = document.getElementById('item-sku');
  // Ensure barcode mirrors product ID
  const productId = skuEl?.value.trim() || generateProductId();
  const bcEl = document.getElementById('item-barcode');
  if (bcEl) bcEl.value = productId;

  const data = {
    name: document.getElementById('item-name').value.trim(),
    sku: productId,
    zone: document.getElementById('item-zone').value,
    category: document.getElementById('item-category').value.trim(),
    quantity: parseInt(document.getElementById('item-quantity').value) || 0,
    unit: document.getElementById('item-unit').value,
    minStock: parseInt(document.getElementById('item-min-stock').value) || 0,
    location: document.getElementById('item-location').value.trim(),
    barcode: productId,
    notes: document.getElementById('item-notes').value.trim(),
    imageUrl: document.getElementById('item-imageUrl').value.trim(),
    zohoCode: document.getElementById('item-zoho-code').value.trim(),
    soNumber: document.getElementById('item-so')?.value.trim() || '',
    poNumber: document.getElementById('item-po')?.value.trim() || ''
  };

  try {
    let savedItem = null;
    if (state.editingItemId) {
      savedItem = await api.put(`/api/items/${state.editingItemId}`, data);
      showToast('Item updated successfully', 'success');
      document.getElementById('modal-item-overlay').classList.add('hidden');
    } else {
      savedItem = await api.post('/api/items', data);
      document.getElementById('modal-item-overlay').classList.add('hidden');
      await loadAll();
      renderView(state.currentView);
      // Offer immediate barcode print after adding new item
      setTimeout(() => promptPrintAfterSave(savedItem), 300);
      return;
    }
    await loadAll();
    renderView(state.currentView);
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}

function promptPrintAfterSave(item) {
  if (!item || !item.id) return;
  if (!state.items.find(i => i.id === item.id)) {
    state.items.push(item);
  }
  const barcodeVal = item.barcode || item.sku || item.id;
  const toastEl = document.getElementById('toast');
  const msgEl = document.getElementById('toast-message');
  const indEl = document.getElementById('toast-indicator');
  if (toastEl && msgEl) {
    indEl.className = 'toast-indicator toast-success';
    msgEl.innerHTML = `Item saved! Barcode ID: <strong>${barcodeVal}</strong>. 
      <a href="#" onclick="copyBarcodeToClipboard('${barcodeVal}');return false;" 
         style="color:var(--goose);font-weight:700;text-decoration:underline">Copy ID for FlashLabel</a>`;
    toastEl.classList.remove('hidden');
    setTimeout(() => toastEl.classList.add('hidden'), 10000);
  }
}

function setImagePreview(url) {
  const img = document.getElementById('item-img-preview');
  const ph = document.getElementById('item-img-placeholder');
  const hdn = document.getElementById('item-imageUrl');
  const btnR = document.getElementById('btn-remove-img');

  if (url) {
    if (img) { img.src = url; img.classList.remove('hidden'); }
    if (ph) ph.classList.add('hidden');
    if (hdn) hdn.value = url;
    if (btnR) btnR.classList.remove('hidden');
  } else {
    if (img) { img.src = ''; img.classList.add('hidden'); }
    if (ph) ph.classList.remove('hidden');
    if (hdn) hdn.value = '';
    if (btnR) btnR.classList.add('hidden');
  }
}

async function handleImageFileSelect(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    const dataUrl = e.target.result;
    setImagePreview(dataUrl);
    try {
      const res = await api.post('/api/upload', { image: dataUrl });
      if (res && res.imageUrl) {
        setImagePreview(res.imageUrl);
      }
      showToast('Photo uploaded successfully', 'success');
    } catch (err) {
      showToast('Photo attached', 'success');
    }
  };
  reader.readAsDataURL(file);
}

function removeSelectedImage() {
  document.getElementById('item-img-file').value = '';
  setImagePreview('');
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getItemImageHtml(item) {
  if (item.imageUrl) {
    return `<img src="${item.imageUrl}" style="width:36px;height:36px;border-radius:4px;object-fit:cover;cursor:pointer" onclick="openLightboxModal('${item.imageUrl}', '${escHtml(item.name)}')" />`;
  }
  return `<div style="width:36px;height:36px;border-radius:4px;background:var(--bg-elevated);display:flex;align-items:center;justify-content:center;color:var(--text-tertiary)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></div>`;
}

function stockTag(item) {
  const s = getStockStatus(item);
  if (s === 'ok') return `<span class="status-tag ok">● IN STOCK</span>`;
  if (s === 'low') return `<span class="status-tag low">● LOW STOCK</span>`;
  return `<span class="status-tag out">● OUT OF STOCK</span>`;
}

function getStockStatus(item) {
  if (!item) return 'ok';
  const qty = Number(item.quantity) || 0;
  const min = Number(item.minStock) || 0;
  if (qty <= 0) return 'out';
  if (min > 0 && qty <= min) return 'low';
  return 'ok';
}

function zoneInlineTag(zone) {
  return `<span style="font-size:0.65rem;font-weight:700;text-transform:uppercase;color:var(--zone-${zone==='electrical'?'elec':zone==='mechanical'?'mec':'con'})">${zone}</span>`;
}

function reqStatusTag(status) {
  if (status === 'approved') return `<span class="status-tag ok">Approved</span>`;
  if (status === 'rejected') return `<span class="status-tag out">Rejected</span>`;
  if (status === 'issued')   return `<span class="status-tag issued">Issued</span>`;
  return `<span class="status-tag low">Pending</span>`;
}

function escHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function showToast(msg, type = 'info') {
  const toast = document.getElementById('toast');
  const txt = document.getElementById('toast-message');
  if (!toast || !txt) return;
  txt.textContent = msg;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 3000);
}

function applyThemeUI(theme) {
  const isLight = theme === 'light';
  const moonIcon = document.getElementById('menu-icon-moon');
  const sunIcon = document.getElementById('menu-icon-sun');
  if (moonIcon) moonIcon.classList.toggle('hidden', isLight);
  if (sunIcon) sunIcon.classList.toggle('hidden', !isLight);
  
  const menuLabel = document.getElementById('menu-theme-label');
  if (menuLabel) menuLabel.textContent = isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode';

  const metaTheme = document.getElementById('meta-theme-color');
  if (metaTheme) metaTheme.setAttribute('content', isLight ? '#f8fafc' : '#090d16');
}

function initTheme() {
  const savedTheme = localStorage.getItem('ims_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  applyThemeUI(savedTheme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('ims_theme', next);
  applyThemeUI(next);
  showToast(`Switched to ${next === 'light' ? 'Light' : 'Dark'} Mode`, 'info');
}

// ─── Material Row counter ─────────────────────────────────────────────────────
let _rowCounter = 0;

// ─── Modal Openers for Requesting ─────────────────────────────────────────────
function openRequestModal() {
  _rowCounter = 0;
  document.getElementById('form-request').reset();
  const container = document.getElementById('material-rows-container');
  container.innerHTML = '';
  // Pre-fill name from session if available
  if (state.user?.name) {
    const el = document.getElementById('req-engineer');
    if (el) el.value = state.user.name;
  }
  // Add one empty row to start
  addMaterialRow();
  document.getElementById('modal-request-overlay').classList.remove('hidden');
}

function addMaterialRow() {
  const rowId = ++_rowCounter;
  const container = document.getElementById('material-rows-container');
  const row = document.createElement('div');
  row.id = `mat-row-${rowId}`;
  row.dataset.itemId = '';
  row.dataset.itemName = '';
  row.dataset.itemSku = '';
  row.dataset.unit = 'pcs';
  row.style.cssText = 'display:flex;align-items:center;gap:0.5rem;background:var(--bg-raised);border:1px solid var(--border-subtle);border-radius:var(--radius);padding:0.5rem 0.625rem';
  row.innerHTML = `
    <button type="button"
      style="flex:1;text-align:left;background:var(--bg-surface);border:1px solid var(--border-muted);border-radius:var(--radius);padding:0.4rem 0.65rem;font-size:0.82rem;color:var(--text-tertiary);cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0"
      onclick="openPickerModal(${rowId})" id="mat-picker-btn-${rowId}">
      Select Material
    </button>
    <div style="display:flex;align-items:center;gap:0.3rem;flex-shrink:0">
      <button type="button" class="btn btn-ghost btn-sm" style="padding:0.3rem 0.55rem;font-size:1rem;line-height:1" onclick="stepQty(${rowId}, -1)">−</button>
      <input type="number" id="mat-qty-${rowId}" value="1" min="1" class="field-input mono" style="width:52px;text-align:center;padding:0.3rem;font-size:0.88rem;-moz-appearance:textfield;-webkit-appearance:none;" oninput="if(this.value<1)this.value=1" />
      <button type="button" class="btn btn-ghost btn-sm" style="padding:0.3rem 0.55rem;font-size:1rem;line-height:1" onclick="stepQty(${rowId}, 1)">+</button>
      <span id="mat-unit-${rowId}" style="font-size:0.75rem;color:var(--text-tertiary);min-width:24px">pcs</span>
    </div>
    <button type="button" onclick="removeMaterialRow(${rowId})" style="flex-shrink:0;background:none;border:none;color:var(--text-tertiary);cursor:pointer;font-size:1.1rem;padding:0.15rem 0.3rem;line-height:1" title="Remove row">&times;</button>
  `;
  container.appendChild(row);
}

function removeMaterialRow(rowId) {
  const container = document.getElementById('material-rows-container');
  if (container.children.length <= 1) {
    showToast('At least one material row is required', 'warning');
    return;
  }
  document.getElementById(`mat-row-${rowId}`)?.remove();
}

function stepQty(rowId, delta) {
  const input = document.getElementById(`mat-qty-${rowId}`);
  if (!input) return;
  const newVal = Math.max(1, (parseInt(input.value) || 1) + delta);
  input.value = newVal;
}

// ─── Material Picker ──────────────────────────────────────────────────────────
let _pickerTargetRowId = null;
let _pickerCategory = 'All';

function openPickerModal(rowId) {
  _pickerTargetRowId = rowId;
  _pickerCategory = 'All';
  document.getElementById('picker-search').value = '';
  renderPickerSidebar();
  renderPickerGrid();
  document.getElementById('modal-picker-overlay').classList.remove('hidden');
}

function closePickerModal(e) {
  if (e && e.target !== document.getElementById('modal-picker-overlay')) return;
  document.getElementById('modal-picker-overlay')?.classList.add('hidden');
}

function renderPickerSidebar() {
  const sidebar = document.getElementById('picker-category-sidebar');
  if (!sidebar) return;
  const cats = ['All', ...[
    ...new Set((state.items || []).map(i => i.category).filter(Boolean))
  ].sort()];

  sidebar.innerHTML = cats.map(cat => {
    const active = cat === _pickerCategory;
    return `<button type="button" onclick="setPickerCategory('${escHtml(cat)}')"
      style="display:block;width:100%;text-align:left;padding:0.55rem 1rem;font-size:0.8rem;font-weight:${active ? 700 : 500};
             background:${active ? 'var(--accent-subtle,rgba(139,92,246,0.12))' : 'none'};
             color:${active ? 'var(--goose)' : 'var(--text-secondary)'};
             border:none;cursor:pointer;border-left:3px solid ${active ? 'var(--goose)' : 'transparent'}">
      ${escHtml(cat)}
    </button>`;
  }).join('');
}

function setPickerCategory(cat) {
  _pickerCategory = cat;
  renderPickerSidebar();
  renderPickerGrid();
}

function renderPickerGrid() {
  const grid = document.getElementById('picker-grid');
  if (!grid) return;
  const q = (document.getElementById('picker-search')?.value || '').toLowerCase();
  let items = state.items || [];
  if (_pickerCategory !== 'All') items = items.filter(i => i.category === _pickerCategory);
  if (q) items = items.filter(i => ((i.name || '') + ' ' + (i.sku || '') + ' ' + (i.barcode || '')).toLowerCase().includes(q));

  if (items.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--text-tertiary);font-size:0.85rem">No materials found</div>`;
    return;
  }

  grid.innerHTML = items.map(item => {
    const qty = item.quantity || 0;
    const min = item.minStock || 5;
    const isOut = qty <= 0;
    const isLow = !isOut && qty <= min;

    // Card border/background based on stock
    let cardBorder, cardBg, hoverBorder, hoverShadow, badge;

    if (isOut) {
      cardBorder  = '1px solid rgba(239,68,68,0.35)';
      cardBg      = 'rgba(239,68,68,0.06)';
      hoverBorder = 'rgba(239,68,68,0.6)';
      hoverShadow = '0 0 0 2px rgba(239,68,68,0.12)';
      badge = `<span style="font-size:0.62rem;font-weight:700;color:#dc2626;background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.3);border-radius:3px;padding:0.1rem 0.35rem;letter-spacing:0.03em">OUT OF STOCK</span>`;
    } else if (isLow) {
      cardBorder  = '1px solid rgba(245,158,11,0.35)';
      cardBg      = 'rgba(245,158,11,0.06)';
      hoverBorder = 'rgba(245,158,11,0.7)';
      hoverShadow = '0 0 0 2px rgba(245,158,11,0.15)';
      badge = `<span style="font-size:0.62rem;font-weight:700;color:#d97706;background:rgba(245,158,11,0.14);border:1px solid rgba(245,158,11,0.3);border-radius:3px;padding:0.1rem 0.35rem;letter-spacing:0.03em">LOW STOCK</span>`;
    } else {
      cardBorder  = '1px solid rgba(34,197,94,0.35)';
      cardBg      = 'rgba(34,197,94,0.06)';
      hoverBorder = 'rgba(34,197,94,0.7)';
      hoverShadow = '0 0 0 2px rgba(34,197,94,0.15)';
      badge = `<span style="font-size:0.62rem;font-weight:700;color:#16a34a;background:rgba(34,197,94,0.14);border:1px solid rgba(34,197,94,0.3);border-radius:3px;padding:0.1rem 0.35rem;letter-spacing:0.03em">IN STOCK</span>`;
    }

    const imgHtml = item.imageUrl
      ? `<img src="${escHtml(item.imageUrl)}" style="width:100%;height:80px;object-fit:cover;border-radius:var(--radius) var(--radius) 0 0;${isOut ? 'opacity:0.5;' : ''}" />`
      : `<div style="width:100%;height:80px;background:var(--bg-raised);border-radius:var(--radius) var(--radius) 0 0;display:flex;align-items:center;justify-content:center;color:var(--text-muted);${isOut ? 'opacity:0.5;' : ''}">
           <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
         </div>`;

    return `
      <div onclick="selectPickerItem('${escHtml(item.id)}')"
        style="background:${cardBg};border:${cardBorder};border-radius:var(--radius);cursor:pointer;overflow:hidden;transition:border-color 0.15s,box-shadow 0.15s;${isOut ? 'opacity:0.75;' : ''}"
        onmouseenter="this.style.borderColor='${hoverBorder}';this.style.boxShadow='${hoverShadow}'"
        onmouseleave="this.style.borderColor='${cardBorder}';this.style.boxShadow='none'">
        ${imgHtml}
        <div style="padding:0.45rem 0.5rem">
          <div style="font-size:0.78rem;font-weight:700;color:var(--text-primary);line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escHtml(item.name)}">${escHtml(item.name)}</div>
          <div style="font-size:0.68rem;font-family:var(--font-mono);color:var(--text-tertiary);margin-top:0.1rem">${escHtml(item.sku)}</div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-top:0.3rem;gap:0.3rem">
            <span style="font-size:0.68rem;color:var(--text-secondary)">${item.quantity} ${item.unit} · ${escHtml(item.location || '')}</span>
            ${badge}
          </div>
        </div>
      </div>`;
  }).join('');
}

function selectPickerItem(itemId) {
  const item = state.items.find(i => i.id === itemId);
  if (!item || _pickerTargetRowId === null) return;

  const row = document.getElementById(`mat-row-${_pickerTargetRowId}`);
  if (!row) return;

  // Store item data on the row element
  row.dataset.itemId   = item.id;
  row.dataset.itemName = item.name;
  row.dataset.itemSku  = item.sku;
  row.dataset.unit     = item.unit || 'pcs';

  // Update picker button label
  const btn = document.getElementById(`mat-picker-btn-${_pickerTargetRowId}`);
  if (btn) {
    btn.style.color = 'var(--text-primary)';
    btn.style.fontWeight = '600';
    btn.textContent = `${item.name} (${item.sku})`;
  }

  // Update unit label
  const unitEl = document.getElementById(`mat-unit-${_pickerTargetRowId}`);
  if (unitEl) unitEl.textContent = item.unit || 'pcs';

  // Close picker
  document.getElementById('modal-picker-overlay')?.classList.add('hidden');
  _pickerTargetRowId = null;
}

// ─── Old stubs kept for backward compat (now unused) ─────────────────────────
function onRequestItemSelectChange() {}

function closeRequestModal(e) {
  if (e && e.target !== document.getElementById('modal-request-overlay')) return;
  document.getElementById('modal-request-overlay')?.classList.add('hidden');
}

async function handleRequestSubmit(e) {
  e.preventDefault();

  // Collect all material rows
  const container = document.getElementById('material-rows-container');
  const rows = Array.from(container.children);
  const materials = [];

  for (const row of rows) {
    const itemId   = row.dataset.itemId;
    const itemName = row.dataset.itemName;
    const itemSku  = row.dataset.itemSku;
    const unit     = row.dataset.unit || 'pcs';
    const rowId    = row.id.replace('mat-row-', '');
    const qty      = parseInt(document.getElementById(`mat-qty-${rowId}`)?.value) || 0;

    if (!itemId) {
      showToast('Please select a material for every row', 'error');
      return;
    }
    if (qty < 1) {
      showToast('Quantity must be at least 1 for every material', 'error');
      return;
    }
    materials.push({ itemId, itemName, itemSku, unit, quantity: qty });
  }

  if (materials.length === 0) {
    showToast('Add at least one material to the offer', 'error');
    return;
  }

  const data = {
    name:          document.getElementById('req-engineer').value.trim(),
    employeeId:    document.getElementById('req-employee-id').value.trim(),
    engineerEmail: state.user?.email || 'surya@goosesolutions.in',
    projectName:   document.getElementById('req-project').value.trim(),
    purpose:       document.getElementById('req-purpose').value.trim(),
    materials,
  };

  try {
    const res = await api.post('/api/requests', data);
    if (res && res.error) {
      showToast(res.error, 'error');
      return;
    }
    showToast('Supplier offer submitted successfully!', 'success');
    document.getElementById('modal-request-overlay').classList.add('hidden');
    await loadAll();
    renderView('requests');
  } catch (err) {
    showToast('Failed to submit offer', 'error');
  }
}

// ─── Lightbox ────────────────────────────────────────────────────────────────
function openLightboxModal(url, title) {
  document.getElementById('lightbox-img').src = url;
  document.getElementById('lightbox-title').textContent = title || 'Material Photo';
  document.getElementById('modal-lightbox-overlay').classList.remove('hidden');
}
function closeLightboxModal(e) {
  if (e && e.target !== document.getElementById('modal-lightbox-overlay')) return;
  document.getElementById('modal-lightbox-overlay')?.classList.add('hidden');
}

// ─── Zoho Books Integration Handlers ─────────────────────────────────────────
function openZohoModal() {
  if (!state.zohoEnabled) {
    showToast('Zoho Books Integration is disabled in System Settings', 'warning');
    return;
  }
  if (state.user?.role !== 'manager') {
    showToast('Access Denied: Integration settings are restricted to Store Manager only', 'error');
    return;
  }
  document.getElementById('options-menu')?.classList.add('hidden');
  document.getElementById('modal-zoho-overlay')?.classList.remove('hidden');
}

function closeZohoModal(e) {
  if (e && e.target !== document.getElementById('modal-zoho-overlay')) return;
  document.getElementById('modal-zoho-overlay')?.classList.add('hidden');
}

function switchZohoTab(tab) {
  const csvTab = document.getElementById('zoho-tab-csv');
  const apiTab = document.getElementById('zoho-tab-api');
  const csvBtn = document.getElementById('zoho-tab-csv-btn');
  const apiBtn = document.getElementById('zoho-tab-api-btn');

  if (tab === 'csv') {
    csvTab?.classList.remove('hidden');
    apiTab?.classList.add('hidden');
    if (csvBtn) csvBtn.style.borderBottom = '2px solid var(--accent)';
    if (apiBtn) apiBtn.style.borderBottom = 'none';
  } else {
    csvTab?.classList.add('hidden');
    apiTab?.classList.remove('hidden');
    if (csvBtn) csvBtn.style.borderBottom = 'none';
    if (apiBtn) apiBtn.style.borderBottom = '2px solid var(--accent)';
  }
}

async function handleZohoCsvFile(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (event) => {
    const csvContent = event.target.result;
    try {
      showToast('Importing items from Zoho CSV...', 'info');
      const res = await api.post('/api/zoho/import-csv', { csvContent });
      if (res.success) {
        showToast(res.message, 'success');
        closeZohoModal();
        await loadAll();
        renderView(state.currentView);
      } else {
        showToast(res.error || 'Failed to import CSV', 'error');
      }
    } catch (err) {
      showToast('CSV processing failed', 'error');
    }
  };
  reader.readAsText(file);
}

async function handleZohoApiSync(e) {
  e.preventDefault();
  const organizationId = document.getElementById('zoho-org-id').value.trim();
  const authToken = document.getElementById('zoho-auth-token').value.trim();
  const domain = document.getElementById('zoho-domain').value;

  try {
    showToast('Connecting to Zoho Books API...', 'info');
    const res = await api.post('/api/zoho/sync-api', { organizationId, authToken, domain });
    if (res.success) {
      showToast(res.message, 'success');
      closeZohoModal();
      await loadAll();
      renderView(state.currentView);
    } else {
      showToast(res.error || 'Zoho API Sync Failed', 'error');
    }
  } catch (err) {
    showToast('Failed to connect to Zoho Books API', 'error');
  }
}

// ─── Settings Modal Handlers ─────────────────────────────────────────────────
function openSettingsModal() {
  if (state.user?.role !== 'manager') {
    showToast('Access Denied: Settings & Manager PIN configuration are restricted to Store Manager only', 'error');
    return;
  }
  applyZohoVisibility();
  const currentPin = localStorage.getItem('ims_manager_pin') || state.managerPin || '1234';
  const pinInput = document.getElementById('settings-manager-pin');
  if (pinInput) pinInput.value = currentPin;

  document.getElementById('options-menu')?.classList.add('hidden');
  document.getElementById('modal-settings-overlay')?.classList.remove('hidden');
}

function closeSettingsModal(e) {
  if (e && e.target !== document.getElementById('modal-settings-overlay')) return;
  document.getElementById('modal-settings-overlay')?.classList.add('hidden');
}

function handleSaveSettings(e) {
  e.preventDefault();
  if (state.user?.role !== 'manager') {
    showToast('Access Denied: Only Store Manager can change PIN or settings', 'error');
    return;
  }
  const newPin = document.getElementById('settings-manager-pin').value.trim();
  if (newPin) {
    state.managerPin = newPin;
    localStorage.setItem('ims_manager_pin', newPin);
  }
  showToast('Settings saved successfully', 'success');
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ENGINEER ACTIVITY & AUDIT HISTORY LOG
// ═══════════════════════════════════════════════════════════════════════════════
let _selectedEngineerEmail = 'all';

async function renderEngineerHistory() {
  const container = document.getElementById('view-engineer-history');
  if (!container) return;

  const isManager = state.user?.role === 'manager';
  const currentUserEmail = state.user?.email || '';

  // Extract unique engineer accounts from requests & transactions
  const engineersMap = new Map();

  (state.requests || []).forEach(r => {
    const email = (r.engineerEmail || r.email || '').toLowerCase().trim();
    if (!email) return;
    if (!engineersMap.has(email)) {
      engineersMap.set(email, {
        email,
        name: r.name || r.engineerName || 'Engineer',
        employeeId: r.employeeId || 'EMP-' + email.split('@')[0].toUpperCase(),
        requestsCount: 0,
        issuedCount: 0,
        materialsCount: 0,
        latestActivity: r.requestedAt
      });
    }
    const eng = engineersMap.get(email);
    eng.requestsCount++;
    if (r.status === 'issued') eng.issuedCount++;
    if (Array.isArray(r.materials)) {
      eng.materialsCount += r.materials.reduce((sum, m) => sum + (parseInt(m.quantity) || 0), 0);
    }
    if (new Date(r.requestedAt) > new Date(eng.latestActivity)) {
      eng.latestActivity = r.requestedAt;
    }
  });

  const engineersList = Array.from(engineersMap.values());

  // Default selection
  if (!isManager && currentUserEmail) {
    _selectedEngineerEmail = currentUserEmail;
  } else if (_selectedEngineerEmail !== 'all' && !engineersMap.has(_selectedEngineerEmail)) {
    _selectedEngineerEmail = engineersList[0]?.email || 'all';
  }

  // Filter requests for selected engineer or all engineers
  let activeRequests = [...(state.requests || [])];
  if (_selectedEngineerEmail !== 'all') {
    activeRequests = activeRequests.filter(r => (r.engineerEmail || r.email || '').toLowerCase().trim() === _selectedEngineerEmail);
  }

  // Calculate summary metrics
  const totalRequests = activeRequests.length;
  const issuedRequests = activeRequests.filter(r => r.status === 'issued').length;
  const pendingRequests = activeRequests.filter(r => r.status === 'pending').length;
  const totalItemsCount = activeRequests.reduce((sum, r) => {
    if (Array.isArray(r.materials)) {
      return sum + r.materials.reduce((mSum, m) => mSum + (parseInt(m.quantity) || 0), 0);
    }
    return sum + (parseInt(r.quantityRequested) || 0);
  }, 0);

  const selectedEngInfo = engineersMap.get(_selectedEngineerEmail) || {
    name: isManager ? 'All Engineers' : (state.user?.name || 'Engineer'),
    email: _selectedEngineerEmail === 'all' ? 'All Activity' : _selectedEngineerEmail,
    employeeId: state.user?.employeeId || 'EMP-SYSTEM'
  };

  container.innerHTML = `
    <div class="page-hdr">
      <div>
        <h1 class="page-title">Engineer Activity &amp; Audit Log</h1>
        <div class="page-subtitle">Historical material requests &amp; dispatch activity linked to engineer mail IDs</div>
      </div>
      <div style="display:flex;gap:0.75rem;align-items:center">
        ${isManager ? `
          <select id="engineer-filter-select" class="field-input" onchange="_selectedEngineerEmail=this.value;renderEngineerHistory()" style="width:auto;font-size:0.85rem;padding:0.5rem 0.85rem">
            <option value="all" ${_selectedEngineerEmail === 'all' ? 'selected' : ''}>📋 All Engineers Activity</option>
            ${engineersList.map(e => `<option value="${e.email}" ${_selectedEngineerEmail === e.email ? 'selected' : ''}>👤 ${escHtml(e.name)} (${escHtml(e.email)})</option>`).join('')}
          </select>
        ` : ''}
        <button class="btn btn-primary" onclick="exportEngineerActivityPDF('${_selectedEngineerEmail}')" style="display:inline-flex;align-items:center;gap:0.4rem">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          <span>Export Activity PDF</span>
        </button>
      </div>
    </div>

    <!-- Metric Summary Grid -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:1rem;margin-bottom:1.5rem">
      <div class="card" style="padding:1.1rem 1.25rem">
        <div style="font-size:0.72rem;font-weight:700;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.06em">Selected Profile</div>
        <div style="font-size:1.05rem;font-weight:700;color:var(--goose);margin-top:0.25rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
          ${escHtml(selectedEngInfo.name)}
        </div>
        <div style="font-size:0.75rem;color:var(--text-secondary);font-family:var(--font-mono);margin-top:0.15rem">${escHtml(selectedEngInfo.email)}</div>
      </div>

      <div class="card" style="padding:1.1rem 1.25rem">
        <div style="font-size:0.72rem;font-weight:700;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.06em">Material Requests</div>
        <div style="font-size:1.5rem;font-weight:800;color:var(--text-primary);margin-top:0.15rem">${totalRequests}</div>
        <div style="font-size:0.72rem;color:var(--text-tertiary)">Total Submissions</div>
      </div>

      <div class="card" style="padding:1.1rem 1.25rem">
        <div style="font-size:0.72rem;font-weight:700;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.06em">Issued Stock Dispatches</div>
        <div style="font-size:1.5rem;font-weight:800;color:#10b981;margin-top:0.15rem">${issuedRequests}</div>
        <div style="font-size:0.72rem;color:var(--text-tertiary)">${pendingRequests} Pending Approval</div>
      </div>

      <div class="card" style="padding:1.1rem 1.25rem">
        <div style="font-size:0.72rem;font-weight:700;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.06em">Total Items Volume</div>
        <div style="font-size:1.5rem;font-weight:800;color:var(--accent-cyan);margin-top:0.15rem">${totalItemsCount} <span style="font-size:0.85rem;font-weight:500;color:var(--text-tertiary)">pcs</span></div>
        <div style="font-size:0.72rem;color:var(--text-tertiary)">Across All Projects</div>
      </div>
    </div>

    <!-- Request History Activity Table -->
    <div class="card" style="overflow:hidden">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date &amp; Time</th>
              <th>Engineer Name &amp; Mail ID</th>
              <th>Target Project</th>
              <th>Requested Materials</th>
              <th>Status</th>
              <th>Manager Remarks</th>
            </tr>
          </thead>
          <tbody>
            ${activeRequests.length === 0 ? `
              <tr>
                <td colspan="6" style="text-align:center;padding:3rem;color:var(--text-tertiary)">
                  No activity or material request history recorded for this profile yet.
                </td>
              </tr>
            ` : activeRequests.map(r => {
              const dt = new Date(r.requestedAt || r.date || Date.now());
              const dateStr = dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' + dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

              let statusBadge = '';
              if (r.status === 'issued') {
                statusBadge = `<span style="background:rgba(16,185,129,0.15);color:#10b981;padding:0.2rem 0.5rem;border-radius:4px;font-size:0.72rem;font-weight:700;letter-spacing:0.04em">ISSUED</span>`;
              } else if (r.status === 'approved') {
                statusBadge = `<span style="background:rgba(0,198,255,0.15);color:var(--accent-cyan);padding:0.2rem 0.5rem;border-radius:4px;font-size:0.72rem;font-weight:700;letter-spacing:0.04em">APPROVED</span>`;
              } else if (r.status === 'rejected') {
                statusBadge = `<span style="background:rgba(239,68,68,0.15);color:#ef4444;padding:0.2rem 0.5rem;border-radius:4px;font-size:0.72rem;font-weight:700;letter-spacing:0.04em">REJECTED</span>`;
              } else {
                statusBadge = `<span style="background:rgba(245,158,11,0.15);color:#f59e0b;padding:0.2rem 0.5rem;border-radius:4px;font-size:0.72rem;font-weight:700;letter-spacing:0.04em">PENDING</span>`;
              }

              const matsSummary = Array.isArray(r.materials) && r.materials.length > 0
                ? r.materials.map(m => `• <strong>${escHtml(m.itemName)}</strong> (${m.quantity} ${m.unit || 'pcs'})`).join('<br>')
                : `• <strong>${escHtml(r.itemName || 'Material')}</strong> (${r.quantityRequested || 1} pcs)`;

              return `
                <tr>
                  <td style="font-family:var(--font-mono);font-size:0.78rem;color:var(--text-secondary);white-space:nowrap">${dateStr}</td>
                  <td>
                    <div style="font-weight:600;color:var(--text-primary)">${escHtml(r.name || r.engineerName || 'Engineer')}</div>
                    <div style="font-size:0.72rem;color:var(--text-tertiary);font-family:var(--font-mono)">${escHtml(r.engineerEmail || r.email || '—')}</div>
                  </td>
                  <td>
                    <div style="font-weight:600;color:var(--goose)">${escHtml(r.projectName || '—')}</div>
                    <div style="font-size:0.72rem;color:var(--text-tertiary)">${escHtml(r.purpose || '')}</div>
                  </td>
                  <td style="font-size:0.82rem;line-height:1.4">${matsSummary}</td>
                  <td>${statusBadge}</td>
                  <td style="font-size:0.8rem;color:var(--text-secondary)">${escHtml(r.managerNotes || '—')}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function exportEngineerActivityPDF(filterEmail = 'all') {
  let activeRequests = [...(state.requests || [])];
  if (filterEmail && filterEmail !== 'all') {
    activeRequests = activeRequests.filter(r => (r.engineerEmail || r.email || '').toLowerCase().trim() === filterEmail.toLowerCase().trim());
  }

  if (activeRequests.length === 0) {
    showToast('No activity records available to export for this engineer', 'warning');
    return;
  }

  showToast('Generating Engineer Activity PDF Report...', 'info');

  try {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      showToast('Opening print view...', 'info');
      window.print();
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    const firstReq = activeRequests[0] || {};
    const engName = firstReq.name || firstReq.engineerName || (state.user?.role === 'engineer' ? state.user.name : 'Engineer');
    const engMail = filterEmail !== 'all' ? filterEmail : (firstReq.engineerEmail || 'All Engineers');

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    const totalReqs = activeRequests.length;
    const totalQty = activeRequests.reduce((sum, r) => {
      if (Array.isArray(r.materials)) return sum + r.materials.reduce((mSum, m) => mSum + (parseInt(m.quantity) || 0), 0);
      return sum + (parseInt(r.quantityRequested) || 0);
    }, 0);

    // Title Header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 297, 28, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text('GOOSE INDUSTRIAL SOLUTIONS PVT LTD', 14, 12);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(56, 189, 248);
    doc.text('ENGINEER MATERIAL REQUEST & ACTIVITY AUDIT REPORT', 14, 21);

    doc.setFontSize(8);
    doc.setTextColor(203, 213, 225);
    doc.text(`Generated: ${dateStr}, ${timeStr}`, 220, 21);

    // Profile Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, 32, 269, 16, 2, 2, 'FD');

    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(`Engineer Name: ${engName}`, 18, 41);
    doc.text(`Email ID: ${engMail}`, 100, 41);
    doc.text(`Total Requests: ${totalReqs}`, 185, 41);
    doc.text(`Items Volume: ${totalQty} pcs`, 235, 41);

    // Data Table
    const tableData = activeRequests.map((r, index) => {
      const dt = new Date(r.requestedAt || Date.now());
      const formattedDate = dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

      const mats = Array.isArray(r.materials) && r.materials.length > 0
        ? r.materials.map(m => `${m.itemName} (${m.quantity} ${m.unit || 'pcs'})`).join('; ')
        : `${r.itemName || 'Material'} (${r.quantityRequested || 1} pcs)`;

      return [
        index + 1,
        formattedDate,
        r.projectName || '—',
        mats,
        (r.status || 'pending').toUpperCase(),
        r.managerNotes || '—'
      ];
    });

    doc.autoTable({
      startY: 53,
      head: [['#', 'Date & Time', 'Target Project', 'Requested Materials & Quantities', 'Status', 'Manager Remarks']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
      bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
      columnStyles: {
        0: { cellWidth: 12 },
        1: { cellWidth: 38 },
        2: { cellWidth: 45 },
        3: { cellWidth: 110 },
        4: { cellWidth: 24, fontStyle: 'bold' },
        5: { cellWidth: 40 }
      },
      didParseCell: function(data) {
        if (data.section === 'body' && data.column.index === 4) {
          const val = String(data.cell.raw).toUpperCase();
          if (val === 'ISSUED') data.cell.styles.textColor = [16, 185, 129];
          else if (val === 'APPROVED') data.cell.styles.textColor = [0, 198, 255];
          else if (val === 'REJECTED') data.cell.styles.textColor = [239, 68, 68];
          else data.cell.styles.textColor = [245, 158, 11];
        }
      }
    });

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(`Goose Inventory System · Engineer Activity Audit · Page ${i} of ${pageCount}`, 14, 203);
    }

    const cleanFilenameMail = engMail.replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`Engineer_Activity_${cleanFilenameMail}_${dateStr.replace(/ /g, '_')}.pdf`);
    showToast('Engineer Activity PDF Report downloaded!', 'success');
  } catch (err) {
    console.error('PDF Export Error:', err);
    showToast('Failed to generate PDF report', 'error');
  }
}

// ─── Init ────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  const saved = sessionStorage.getItem('ims_user');
  if (saved) {
    try { setUser(JSON.parse(saved)); return; } catch {}
  }
  hideLoadingScreen();
});
