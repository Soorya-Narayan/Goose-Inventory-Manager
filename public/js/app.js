// ═══════════════════════════════════════════════════════════════════════════════
//  StoreIMS — Application Logic with Helett HT20 & Tej C15 Hardware Integration
// ═══════════════════════════════════════════════════════════════════════════════

const state = {
  user: null,
  currentView: 'dashboard',
  items: [],
  requests: [],
  stats: {},
  filters: { zone: 'all', stockStatus: 'all', category: '' },
  searchQuery: '',
  editingItemId: null,
  requestingItemId: null,
  pendingDeleteId: null,
  printItemId: null,
  // Bluetooth printer
  printerDevice: null,
  printerConnected: false,
};

// ─── API Helpers ─────────────────────────────────────────────────────────────
const api = {
  get:    async (url) => (await fetch(url)).json(),
  post:   async (url, data) => (await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })).json(),
  put:    async (url, data) => (await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })).json(),
  del:    async (url) => (await fetch(url, { method: 'DELETE' })).json(),
  delete: async (url) => (await fetch(url, { method: 'DELETE' })).json(),
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
    (i.sku && i.sku.toLowerCase() === barcode.toLowerCase())
  );

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
  // Remove any old test item first
  state.items = state.items.filter(i => i.id !== 'demo-test');
  const dummyItem = {
    id: 'demo-test',
    name: 'Test Material',
    sku: 'TEST-001',
    barcode: 'TEST-001',
    location: 'A1',
    zone: 'mechanical'
  };
  state.items.push(dummyItem);
  openPrintModal('demo-test');
}

async function triggerTejC15Print() {
  const item = state.items.find(i => i.id === state.printItemId) || {
    name: 'MATERIAL ITEM',
    sku: 'ELEC0001',
    location: 'A1',
    zone: 'MECH'
  };

  showToast('Sending direct barcode print to Tej C15...', 'info');

  try {
    const res = await api.post('/api/print-tspl', {
      name: item.name,
      sku: item.sku || item.barcode || 'ELEC0001',
      location: item.location || 'A1',
      zone: item.zone || 'MECH',
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
  document.getElementById('manager-pin-group').classList.toggle('hidden', role !== 'manager');
  document.getElementById('engineer-name-group').classList.toggle('hidden', role !== 'engineer');
}

function handleLogin(e) {
  e.preventDefault();
  const isManager = document.getElementById('role-btn-manager').classList.contains('selected');
  const errorEl = document.getElementById('login-error');

  if (isManager) {
    const pin = document.getElementById('manager-pin').value;
    const requiredPin = state.managerPin || '1234';
    if (pin !== requiredPin) {
      errorEl.classList.remove('hidden');
      return;
    }
    setUser({ role: 'manager', name: 'Store Manager' });
  } else {
    const name = document.getElementById('engineer-name').value.trim() || 'Engineer';
    setUser({ role: 'engineer', name });
  }
}

function setUser(user) {
  state.user = user;
  sessionStorage.setItem('ims_user', JSON.stringify(user));

  showLoadingScreen(`Welcome, ${user.name}! Authenticating & Initializing Inventory...`);

  if (document.getElementById('user-chip-name')) {
    document.getElementById('user-chip-name').textContent = user.name;
    document.getElementById('user-chip-avatar').textContent = user.name.charAt(0).toUpperCase();
  }
  if (document.getElementById('menu-user-name')) {
    document.getElementById('menu-user-name').textContent = user.name;
    document.getElementById('menu-user-role').textContent = user.role.toUpperCase();
    document.getElementById('menu-avatar').textContent = user.name.charAt(0).toUpperCase();
  }

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
    case 'dashboard':     renderDashboard();     break;
    case 'storemap':      renderStoreMap();      break;
    case 'inventory':     renderInventory();     break;
    case 'requests':      renderRequests();      break;
    case 'transactions':  renderTransactions();  break;
    case 'labeldesigner': renderLabelDesigner(); break;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  STOCK MOVEMENTS — Inward & Outward Transaction Log
// ═══════════════════════════════════════════════════════════════════════════════
async function renderTransactions() {
  const container = document.getElementById('view-transactions');
  if (!container) return;

  container.innerHTML = `
    <div class="page-hdr">
      <div>
        <h1 class="page-title">Stock Movements</h1>
        <div class="page-subtitle">Barcode-scanned inward receipts and outward allocations</div>
      </div>
      <div style="display:flex;gap:0.75rem">
        <button class="btn btn-ghost" onclick="clearAllTransactions()" style="font-size:0.8rem;color:var(--danger)">Clear All</button>
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
          <th style="width:40px"></th>
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
              <td>
                <button onclick="deleteTransaction('${t.id}')" title="Delete this log entry"
                  style="background:none;border:none;cursor:pointer;color:var(--text-tertiary);padding:4px;border-radius:4px"
                  onmouseover="this.style.color='var(--danger)'" onmouseout="this.style.color='var(--text-tertiary)'">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                </button>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

function renderLabelDesigner() {
  document.getElementById('view-labeldesigner').innerHTML = `
    <div class="page-hdr">
      <div>
        <h1 class="page-title">Thermal Label Designer</h1>
        <p class="page-subtitle">Custom barcode sticker layouts &amp; thermal printer template studio</p>
      </div>
    </div>

    <div class="card" style="padding:3.5rem 2rem;max-width:640px;margin:2rem auto;text-align:center;background:var(--bg-raised);border:1px solid var(--border-muted);border-radius:var(--radius-lg);box-shadow:0 8px 32px rgba(0,0,0,0.2)">
      <div style="width:64px;height:64px;border-radius:16px;background:var(--goose-dim);color:var(--goose);display:flex;align-items:center;justify-content:center;margin:0 auto 1.5rem">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/><line x1="6" y1="18" x2="18" y2="18"/><line x1="6" y1="14" x2="18" y2="14"/><rect x="8" y="5" width="8" height="5"/></svg>
      </div>
      <div style="font-size:0.75rem;font-weight:700;color:var(--goose);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:0.5rem">MODULE IN DEVELOPMENT</div>
      <h2 style="font-size:1.6rem;font-weight:800;color:var(--text-primary);margin-bottom:0.75rem">Visual Label Designer — Coming Soon</h2>
      <p style="color:var(--text-secondary);font-size:0.9rem;line-height:1.6;max-width:520px;margin:0 auto 1.75rem">
        Drag-and-drop thermal label template editor for Tej C15 &amp; FlashLabel Pro printers. Custom QR codes, logos, HSN tags, and batch printing rules will be available here.
      </p>
      <div style="display:inline-flex;align-items:center;gap:0.5rem;padding:0.5rem 1rem;background:var(--bg-elevated);border:1px solid var(--border-subtle);border-radius:var(--radius-md);font-size:0.8rem;color:var(--text-tertiary)">
        <span style="width:8px;height:8px;border-radius:50%;background:var(--warn);display:inline-block"></span>
        Scheduled for v1.2 Release &middot; 1-Click FlashLabel Pro helper is currently active in Inventory.
      </div>
    </div>
  `;
}

function renderDashboard() {
  const items = state.items || [];
  const s = state.stats || {};
  const alertItems = items.filter(i => getStockStatus(i) !== 'ok');

  const totalCount = items.length || 1;
  const outStockCount = items.filter(i => (i.quantity || 0) === 0).length;
  const lowStockCount = items.filter(i => (i.quantity || 0) > 0 && (i.quantity || 0) <= (i.minStock || 0)).length;
  const inStockCount = Math.max(0, items.length - outStockCount - lowStockCount);

  const inStockPct = ((inStockCount / totalCount) * 100).toFixed(1);
  const lowStockPct = ((lowStockCount / totalCount) * 100).toFixed(1);
  const outStockPct = ((outStockCount / totalCount) * 100).toFixed(1);

  document.getElementById('view-dashboard').innerHTML = `
    <div class="page-hdr">
      <div>
        <h1 class="page-title">Store Overview</h1>
        <p class="page-subtitle">${new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' })} &middot; Goose Industrial Systems</p>
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
            <div style="position:relative;width:150px;height:150px;flex-shrink:0">
              <canvas id="overview-stock-chart"></canvas>
            </div>

            <!-- Legend & Metric Breakdown -->
            <div style="display:flex;flex-direction:column;gap:0.6rem;font-size:0.8rem;flex-grow:1;max-width:250px">
              
              <!-- In Stock -->
              <div style="display:flex;align-items:center;gap:0.6rem;background:var(--bg-elevated);padding:0.5rem 0.75rem;border-radius:var(--radius-md);border:1px solid var(--border-subtle)">
                <span style="width:10px;height:10px;border-radius:50%;background:#10b981;display:inline-block;flex-shrink:0"></span>
                <div style="flex-grow:1">
                  <div style="display:flex;justify-content:space-between;align-items:center">
                    <span style="font-weight:600;color:var(--text-primary)">In Stock</span>
                    <span style="font-weight:700;font-family:var(--font-mono);color:var(--ok)">${inStockCount}</span>
                  </div>
                  <div style="font-size:0.68rem;color:var(--text-tertiary)">${inStockPct}% healthy stock</div>
                </div>
              </div>

              <!-- Low Stock -->
              <div style="display:flex;align-items:center;gap:0.6rem;background:var(--bg-elevated);padding:0.5rem 0.75rem;border-radius:var(--radius-md);border:1px solid var(--border-subtle)">
                <span style="width:10px;height:10px;border-radius:50%;background:#f59e0b;display:inline-block;flex-shrink:0"></span>
                <div style="flex-grow:1">
                  <div style="display:flex;justify-content:space-between;align-items:center">
                    <span style="font-weight:600;color:var(--text-primary)">Low Stock</span>
                    <span style="font-weight:700;font-family:var(--font-mono);color:var(--warn)">${lowStockCount}</span>
                  </div>
                  <div style="font-size:0.68rem;color:var(--text-tertiary)">${lowStockPct}% reorder alert</div>
                </div>
              </div>

              <!-- Out of Stock -->
              <div style="display:flex;align-items:center;gap:0.6rem;background:var(--bg-elevated);padding:0.5rem 0.75rem;border-radius:var(--radius-md);border:1px solid var(--border-subtle)">
                <span style="width:10px;height:10px;border-radius:50%;background:#ef4444;display:inline-block;flex-shrink:0"></span>
                <div style="flex-grow:1">
                  <div style="display:flex;justify-content:space-between;align-items:center">
                    <span style="font-weight:600;color:var(--text-primary)">Out of Stock</span>
                    <span style="font-weight:700;font-family:var(--font-mono);color:var(--danger)">${outStockCount}</span>
                  </div>
                  <div style="font-size:0.68rem;color:var(--text-tertiary)">${outStockPct}% zero inventory</div>
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

function renderOverviewStockChart(inStock, lowStock, outOfStock) {
  const canvas = document.getElementById('overview-stock-chart');
  if (!canvas || !window.Chart) return;

  if (window._overviewChartInstance) {
    window._overviewChartInstance.destroy();
  }

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const borderColor = isDark ? '#1e293b' : '#ffffff';

  window._overviewChartInstance = new Chart(canvas, {
    type: 'pie',
    data: {
      labels: ['In Stock', 'Low Stock', 'Out of Stock'],
      datasets: [{
        data: [inStock, lowStock, outOfStock],
        backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
        borderWidth: 2,
        borderColor: borderColor,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: isDark ? '#0f172a' : '#ffffff',
          titleColor: isDark ? '#f8fafc' : '#0f172a',
          bodyColor: isDark ? '#cbd5e1' : '#334155',
          borderColor: isDark ? '#334155' : '#e2e8f0',
          borderWidth: 1,
          padding: 8,
          boxPadding: 4
        }
      }
    }
  });
}

function filterZone(zone) {
  state.filters.zone = zone;
  navigateTo('inventory');
}

// ═══════════════════════════════════════════════════════════════════════════════
//  STORE MAP (Coming Soon)
// ═══════════════════════════════════════════════════════════════════════════════
function renderStoreMap() {
  document.getElementById('view-storemap').innerHTML = `
    <div class="page-hdr">
      <div>
        <h1 class="page-title">Store Layout Map</h1>
      </div>
    </div>
    <div class="card" style="padding:4rem 2rem;max-width:600px;margin:2rem auto;text-align:center;background:var(--bg-raised)">
      <div style="font-size:1.5rem;font-weight:700;color:var(--text-primary)">
        Coming Soon
      </div>
    </div>
  `;
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

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
  const encodedUri = encodeURI(csvContent);

  const link = document.createElement('a');
  const dateStr = new Date().toISOString().split('T')[0];
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `Goose_Store_Inventory_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

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
    doc.text('GOOSE INDUSTRIAL SYSTEMS', 14, 11);

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
  if (state.filters.zone !== 'all') items = items.filter(i => i.zone === state.filters.zone);
  
  const avail = state.filters.stockAvailability || 'all';
  if (avail === 'instock') items = items.filter(i => (i.quantity || 0) > 0);
  if (avail === 'out') items = items.filter(i => (i.quantity || 0) === 0);
  if (avail === 'low') items = items.filter(i => getStockStatus(i) !== 'ok');

  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    items = items.filter(i => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q) || (i.location && i.location.toLowerCase().includes(q)));
  }

  const subtitle = document.getElementById('inventory-subtitle-count');
  if (subtitle) subtitle.textContent = `Showing ${items.length} of ${state.items.length} materials`;

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
  const reqs = state.requests;

  document.getElementById('view-requests').innerHTML = `
    <div class="page-hdr">
      <div>
        <h1 class="page-title">Material Requests</h1>
        <p class="page-subtitle">${isManager ? 'Review & approve engineer requests' : 'Your submitted material requests'}</p>
      </div>
    </div>

    <div class="card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Requested At</th>
              <th>Engineer</th>
              <th>Material</th>
              <th>Project</th>
              <th>Quantity</th>
              <th>Status</th>
              ${isManager ? '<th>Manager Action</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${reqs.length === 0 ? `<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-tertiary)">No requests submitted yet</td></tr>` : reqs.map(r => `
              <tr>
                <td style="font-size:0.75rem;color:var(--text-tertiary)">${new Date(r.requestedAt).toLocaleString('en-IN')}</td>
                <td><strong>${escHtml(r.engineerName)}</strong></td>
                <td>${escHtml(r.itemName)}</td>
                <td>${escHtml(r.projectName)}</td>
                <td style="font-family:var(--font-mono);font-weight:600">${r.quantityRequested} ${r.unit}</td>
                <td>${reqStatusTag(r.status)}</td>
                ${isManager ? `
                  <td>
                    ${r.status === 'pending' ? `
                      <button class="btn btn-primary btn-sm" onclick="processRequest('${r.id}', 'approved')">Approve</button>
                      <button class="btn btn-danger btn-sm" onclick="processRequest('${r.id}', 'rejected')">Reject</button>
                    ` : `<span style="font-size:0.75rem;color:var(--text-tertiary)">Processed</span>`}
                  </td>
                ` : ''}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

async function processRequest(reqId, status) {
  try {
    await api.put(`/api/requests/${reqId}`, { status, processedBy: state.user?.name });
    showToast(`Request ${status}`, 'success');
    await loadAll();
    renderView('requests');
  } catch (err) {
    showToast('Failed to process request', 'error');
  }
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

function openAddItemModal() {
  state.editingItemId = null;
  document.getElementById('modal-item-title').textContent = 'New Item';
  document.getElementById('form-item').reset();
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
  setImagePreview(item.imageUrl || '');
  document.getElementById('duplicate-warning')?.classList.add('hidden');
  const nameEl = document.getElementById('item-name');
  if (nameEl) nameEl.oninput = null;
  document.getElementById('modal-item-overlay').classList.remove('hidden');
}

function closeItemModal(e) {
  if (e && e.target !== document.getElementById('modal-item-overlay')) return;
  document.getElementById('modal-item-overlay')?.classList.add('hidden');
  const nameEl = document.getElementById('item-name');
  if (nameEl) nameEl.oninput = null;
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
  return `<div style="width:36px;height:36px;border-radius:4px;background:var(--bg-elevated);display:flex;align-items:center;justify-content:center;color:var(--text-tertiary);font-size:0.7rem">📦</div>`;
}

function stockTag(item) {
  const s = getStockStatus(item);
  if (s === 'ok') return `<span class="status-tag ok">● IN STOCK</span>`;
  if (s === 'low') return `<span class="status-tag low">● LOW STOCK</span>`;
  return `<span class="status-tag out">● OUT OF STOCK</span>`;
}

function getStockStatus(item) {
  if (item.quantity === 0) return 'out';
  if (item.minStock > 0 && item.quantity <= item.minStock) return 'low';
  return 'ok';
}

function zoneInlineTag(zone) {
  return `<span style="font-size:0.65rem;font-weight:700;text-transform:uppercase;color:var(--zone-${zone==='electrical'?'elec':zone==='mechanical'?'mec':'con'})">${zone}</span>`;
}

function reqStatusTag(status) {
  if (status === 'approved') return `<span class="status-tag ok">Approved</span>`;
  if (status === 'rejected') return `<span class="status-tag out">Rejected</span>`;
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

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  
  const isLight = next === 'light';
  const moonIcon = document.getElementById('menu-icon-moon');
  const sunIcon = document.getElementById('menu-icon-sun');
  if (moonIcon) moonIcon.classList.toggle('hidden', isLight);
  if (sunIcon) sunIcon.classList.toggle('hidden', !isLight);
  
  const menuLabel = document.getElementById('menu-theme-label');
  if (menuLabel) menuLabel.textContent = isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode';
}

// ─── Modal Openers for Requesting ───────────────────────────────────────────
function openRequestModal(itemId) {
  const item = state.items.find(i => i.id === itemId);
  if (!item) return;
  state.requestingItemId = itemId;

  document.getElementById('request-item-info').innerHTML = `
    <strong>${escHtml(item.name)}</strong> (${escHtml(item.sku)})
    <div style="font-size:0.75rem;color:var(--text-tertiary)">Stock: ${item.quantity} ${item.unit} | Location: ${item.location}</div>
  `;
  document.getElementById('req-unit-label').textContent = item.unit;
  document.getElementById('form-request').reset();

  if (state.user?.role === 'engineer') {
    document.getElementById('req-engineer').value = state.user.name;
  }
  document.getElementById('modal-request-overlay').classList.remove('hidden');
}

function closeRequestModal(e) {
  if (e && e.target !== document.getElementById('modal-request-overlay')) return;
  document.getElementById('modal-request-overlay')?.classList.add('hidden');
}

async function handleRequestSubmit(e) {
  e.preventDefault();
  const item = state.items.find(i => i.id === state.requestingItemId);
  if (!item) return;

  const data = {
    itemId: item.id,
    itemName: item.name,
    itemSku: item.sku,
    zone: item.zone,
    quantityRequested: parseInt(document.getElementById('req-quantity').value) || 1,
    unit: item.unit,
    engineerName: document.getElementById('req-engineer').value.trim(),
    projectName: document.getElementById('req-project').value.trim(),
    purpose: document.getElementById('req-purpose').value.trim(),
  };

  try {
    await api.post('/api/requests', data);
    showToast('Material request submitted', 'success');
    document.getElementById('modal-request-overlay').classList.add('hidden');
    await loadAll();
    renderView('requests');
  } catch (err) {
    showToast('Failed to submit request', 'error');
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
  document.getElementById('options-menu')?.classList.add('hidden');
  document.getElementById('modal-settings-overlay')?.classList.remove('hidden');
}

function closeSettingsModal(e) {
  if (e && e.target !== document.getElementById('modal-settings-overlay')) return;
  document.getElementById('modal-settings-overlay')?.classList.add('hidden');
}

function handleSaveSettings(e) {
  e.preventDefault();
  const newPin = document.getElementById('settings-manager-pin').value.trim();
  if (newPin) {
    state.managerPin = newPin;
  }
  showToast('Settings saved successfully', 'success');
  closeSettingsModal();
}

// ─── Init ────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const saved = sessionStorage.getItem('ims_user');
  if (saved) {
    try { setUser(JSON.parse(saved)); return; } catch {}
  }
});
