// src/services/iihDataService.js
// ============================================================
// IIH Essentials DataService integration
// Reads live PLC data from: GET /iih/DataService/Data
// (nginx proxies /iih/ → http://edgeappdataservice:4203/)
// No authentication required for internal Docker network calls.
// ============================================================

// ── Runtime base URL ─────────────────────────────────────────
const getIIHBase = () =>
  (window.RUNTIME_ENV && window.RUNTIME_ENV.IIH_BASE_URL) || '/iih';

// ── Variable UUID registry ────────────────────────────────────
// All IDs extracted from the Node-RED flow (IIH Essentials variable IDs)
// Format: { [humanReadableKey]: uuid }

export const VARIABLE_IDS = {

  // ── SANDWICHING (6 machines) ──────────────────────────────
  // OEE
  SW_M1_OEE: '1ce12eda-f3aa-4079-9947-93d825dd7d35',
  SW_M2_OEE: '2bf7985d-0748-4be5-a657-3aa2eea7d8c5',
  SW_M3_OEE: '3dc891d6-1eb1-4727-8c3e-d93f7d020693',
  SW_M4_OEE: '4d26420c-5fd2-4966-bfa1-f5d09c4c6510',
  SW_M5_OEE: '5c485ba4-fca9-4a6d-9a19-e477b3e19db4',
  SW_M6_OEE: '63005377-b7b1-470e-a8e0-3a3c5b463c1f',
  // MTTR
  SW_M1_MTTR: '37f8ca20-d746-4ef2-8c7c-88a852d55de2',
  SW_M2_MTTR: '2957352a-dbac-4019-9782-19e6a5dc45d7',
  SW_M3_MTTR: 'ad6ddcf5-6a95-4f87-967a-030fdd9c635c',
  SW_M4_MTTR: 'ec3126f6-0d74-4b23-8114-24af9e128183',
  SW_M5_MTTR: 'f1fda272-38fc-49a9-b749-f5b558d82b5b',
  SW_M6_MTTR: 'f9dfbdce-5f17-4b97-8115-0d8739797801',
  // TotalDowntime
  SW_M1_DOWNTIME: '26c46d98-6fb2-41b9-833b-a0287204bf0d',
  SW_M2_DOWNTIME: '43ef7ee2-c7b0-43f4-baab-a6ecc416891d',
  SW_M3_DOWNTIME: '2fd38205-619d-496c-983a-fd37bc89ef6a',
  SW_M4_DOWNTIME: '64a33a90-a22a-4d4c-a840-747ddd7a8bb2',
  SW_M5_DOWNTIME: '95d044a4-e41b-43f9-ab0e-ab3e12ea4966',
  SW_M6_DOWNTIME: 'fad994b0-4df5-4cc1-910c-bb8d5e75916c',
  // Defect_Broken
  SW_M1_DEFECT_BROKEN: '8aca291b-7111-40f3-9cbf-4ab60aa80360',
  SW_M2_DEFECT_BROKEN: '09968ada-f725-44b9-9ba7-700b9a0a1215',
  SW_M3_DEFECT_BROKEN: '1ec54427-71b4-4119-8d78-6bf422cd023d',
  SW_M4_DEFECT_BROKEN: '882c2540-e9d3-4b7f-87c5-e0330326bc39',
  SW_M5_DEFECT_BROKEN: '8db8a6e8-4326-4085-874d-f083efef2d0d',
  SW_M6_DEFECT_BROKEN: 'a8e571c3-c254-41c8-8e3d-bc2f32ced3ff',
  // Defect_UpsideDown
  SW_M1_DEFECT_UD: '41ea6b7a-9ff0-491c-977e-11a8358ebd6c',
  SW_M2_DEFECT_UD: '748bf9c1-3e1c-4601-b46e-03f5dcecdeb7',
  SW_M3_DEFECT_UD: '524306ec-1336-41fa-93a6-23aa32d3b049',
  SW_M4_DEFECT_UD: '9cf8c2e3-8432-47d3-b436-7bdf23bd8dab',
  SW_M5_DEFECT_UD: 'fc4ff10f-9984-4340-87b7-4e1e9fae0e2c',
  // MachineState (0=Idle,1=Running,2=Fault,3=Maintenance)
  SW_M1_STATE: '22cbbdb4-a0aa-47a1-a2de-674ff0f4e3f9',
  SW_M2_STATE: '4b840a04-8e9f-4c71-85e5-e36e2cbbfec3',
  SW_M3_STATE: '7df4e631-b2bd-4739-b311-e8707f18d330',
  SW_M4_STATE: '868ddaba-5a20-4989-933f-7b79bf4dbf2a',
  SW_M5_STATE: 'b76fbc50-4889-496b-add8-783bf92842d5',
  SW_M6_STATE: 'e26d71fd-d592-4e07-a93a-319bd4801a0a',

  // ── PACKING (5 machines) ──────────────────────────────────
  // OEE
  PK_M1_OEE: '67aad834-12af-4674-a1d1-3ab51933a8b7',
  PK_M2_OEE: '7e4a2bb3-a8ef-48dc-a60d-9bbe5a597089',
  PK_M3_OEE: 'ae355903-a8b0-4808-8171-225daec37dbe',
  PK_M4_OEE: 'ba603054-cd89-4b43-ba2d-c47f4b8c65a4',
  PK_M5_OEE: 'c44d1e27-d8f0-4a84-91e6-3ed47a923c51',
  // MTTR
  PK_M1_MTTR: '7d0cba0b-0371-4e90-972a-60b2b01b110d',
  PK_M2_MTTR: '7e77313f-684b-4dd3-ae29-1e1835e87a2c',
  PK_M3_MTTR: 'dd00e4f1-d5fb-44dc-8eaa-81b63673e362',
  PK_M4_MTTR: '23de7941-25ed-47c6-adc3-d26a087c2f94',
  PK_M5_MTTR: '1bec585d-2127-470e-805f-c56e3bee735f',
  // TotalDowntime
  PK_M1_DOWNTIME: '6224f8cd-5656-4c64-8506-91d2731a84f8',
  PK_M2_DOWNTIME: 'a2c406f7-e880-4d2f-911e-4b3f1fbaecd9',
  PK_M3_DOWNTIME: 'b39e6a66-533a-4b2f-915f-a3face7e5f71',
  PK_M4_DOWNTIME: 'c40482e2-f0fd-494c-a3a4-33f9eeec8cb7',
  PK_M5_DOWNTIME: 'e05c187f-6623-466a-b580-d354cb3b4350',
  // Defect_Joint
  PK_M1_DEFECT_JOINT: '9190eb57-c2e3-4938-89be-06f18f0be594',
  PK_M2_DEFECT_JOINT: 'a560b02f-4ef7-4890-b1c5-3f6dafc1f008',
  PK_M3_DEFECT_JOINT: '37a7bd38-80d0-4c8b-8ca9-ab9c59fbba0e',
  PK_M4_DEFECT_JOINT: '42dea1c8-4aa8-4ac8-81b2-0fddf01ecbf8',
  PK_M5_DEFECT_JOINT: 'a71f96d6-c11b-4daf-996b-91456aae5a68',
  // Defect_Burnt
  PK_M1_DEFECT_BURNT: '3f1c867d-432d-4187-a1db-6afa3376aebe',
  PK_M2_DEFECT_BURNT: '5371a6ee-565d-4e3f-b1ad-bc06bb127ff0',
  PK_M3_DEFECT_BURNT: 'b80b0b11-c4e6-4d1c-86be-cc23fe4e8608',
  PK_M4_DEFECT_BURNT: 'c7a17126-11f4-4691-8b1b-89e45f245445',
  PK_M5_DEFECT_BURNT: 'ebbaeae3-8bf8-453c-8312-0e35f7288c26',
  // Defect_Empty
  PK_M1_DEFECT_EMPTY: 'a5bfead7-53d2-433d-8048-32ff64eb153f',
  PK_M2_DEFECT_EMPTY: 'a8d98d22-eb84-44a2-94af-6fc821c3c080',
  PK_M3_DEFECT_EMPTY: 'ca6581b9-cef9-465d-a967-9782f07b48c6',
  PK_M4_DEFECT_EMPTY: 'a1c5ea33-e324-4072-9e27-f32884d1196d',
  PK_M5_DEFECT_EMPTY: 'cd32860a-f3cb-48d3-9ceb-2f0b2add4655',
  // Defect_OverWeight
  PK_M1_DEFECT_OW: '3be41447-ed67-48a9-a64e-a36fe24575c4',
  PK_M2_DEFECT_OW: '869d80da-a00e-427e-91e5-90098cff1b32',
  PK_M3_DEFECT_OW: '569302f4-c2f1-484d-a563-394bb7d5df49',
  PK_M4_DEFECT_OW: 'cb0a638c-afa6-43a1-a9c5-ef83a700da0b',
  PK_M5_DEFECT_OW: '1d8e0740-e055-4b7a-a813-72fbbd269ae6',
  // Defect_UnderWeight
  PK_M1_DEFECT_UW: '3721031f-1c22-4c7e-8b2b-3b53b84cb88e',
  PK_M2_DEFECT_UW: 'c1ed640e-baed-4912-9b46-ce54459725b1',
  PK_M3_DEFECT_UW: 'd112206b-98d0-4aab-b237-060bdaa61161',
  PK_M4_DEFECT_UW: 'c5323b22-15be-4254-99a3-8685ead52c51',
  PK_M5_DEFECT_UW: 'f08df1c9-3b0b-4141-8fe5-3ba92e306076',
  // TotalOutput
  PK_M1_OUTPUT: 'b8364275-8eaf-4c81-ae40-d61eaf280f48',
  PK_M2_OUTPUT: '5252b7db-3279-4b1e-98f2-c0bc622d9f7c',
  PK_M3_OUTPUT: '17f46b94-4176-4fdd-8a25-01f183eda254',
  PK_M4_OUTPUT: '6c421454-4f95-4c48-9eb6-354de1034614',
  PK_M5_OUTPUT: 'b9c672f6-49ed-4303-a221-ed181547e0eb',

  // ── SECONDARY PACKING (2 machines) ───────────────────────
  // OEE
  SP_M1_OEE: 'd8d9c76b-1a53-4c92-97a2-ae6953f7cd21',
  SP_M2_OEE: 'dd498a09-5da0-42f6-87b1-095cb09e8174',
  // TotalDowntime
  SP_M1_DOWNTIME: '22f85642-5d4b-49d0-8466-b2553991ce81',
  SP_M2_DOWNTIME: 'bbe5cb28-560c-49a8-8aca-8e8a220697e6',
  // TotalOutput
  SP_M1_OUTPUT: '35148237-3855-4181-9563-467d0c207718',
  SP_M2_OUTPUT: 'ac30af69-37d0-4208-9231-ba3e969d3e9f',

  // ── CROSS-SECTION ─────────────────────────────────────────
  // MTBF (11 machines across all sections)
  SW_M1_MTBF: '04fc83bb-b98f-485d-a7cb-d7b571ddc871',
  SW_M2_MTBF: '129e6768-ea93-4998-853c-416c53ab00c9',
  SW_M3_MTBF: '4ab864c0-b817-4b95-9778-935ca6f7f484',
  SW_M4_MTBF: '4bcc8400-f76b-486d-af65-f03aa7ddd446',
  SW_M5_MTBF: '84809694-596a-4ee9-bbd7-2414bd736e02',
  SW_M6_MTBF: 'a553a726-ffc4-4be7-a1d4-d67ff3dd26f3',
  PK_M1_MTBF: 'a8302072-c8e5-4d01-b775-c03f7bc86f6e',
  PK_M2_MTBF: 'b5d8a838-de6b-4c5d-b8a8-f6e5cea2880d',
  PK_M3_MTBF: 'bbe9d1a1-5791-4836-b0bc-66fe2e838155',
  PK_M4_MTBF: 'e2561934-71ec-4e09-b4b5-49929146fc56',
  PK_M5_MTBF: 'e4e84ce5-dff1-486f-a462-86b66a680498',
  // Data_block_1
  EMERGENCY_STOP: '13dedf20-2eac-4176-a54e-3750cc5f0b25',
  LINE_TEMPERATURE: '4d484290-01e2-4eb2-8cf4-c6d32a719ac5',
};

// ── All UUIDs as a flat array (for bulk fetch) ────────────────
const ALL_IDS = Object.values(VARIABLE_IDS);

// ── IIH DataService API call ──────────────────────────────────
/**
 * Fetch latest values for given variable UUIDs from IIH Essentials.
 * GET /iih/DataService/Data?variableIds=uuid1,uuid2,...
 *
 * Response format (IIH Essentials v4.x):
 * [
 *   { variableId: "...", values: [{ timestamp, value, qualityCode }] },
 *   ...
 * ]
 */
async function fetchVariables(ids = ALL_IDS) {
  const base = getIIHBase();
  const query = ids.map(id => `variableIds=${encodeURIComponent(id)}`).join('&');
  const url = `${base}/DataService/Data?${query}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`IIH DataService error: ${response.status} ${response.statusText}`);
  }

  const raw = await response.json();
  // Normalise: build a map { uuid → latestValue }
  return parseResponse(raw);
}

/**
 * Parse IIH response array into a flat { uuid: value } map.
 * Picks the latest value from the values array.
 */
function parseResponse(data) {
  const map = {};
  if (!Array.isArray(data)) return map;

  for (const entry of data) {
    const id = entry.variableId;
    const vals = entry.values;
    if (id && Array.isArray(vals) && vals.length > 0) {
      // Take the last entry (most recent)
      const latest = vals[vals.length - 1];
      map[id] = latest.value ?? null;
    }
  }
  return map;
}

// ── Structured data builder ───────────────────────────────────
/**
 * Builds a structured snapshot object from the raw UUID→value map.
 * Returns:
 * {
 *   sandwiching: { machines: [{ id, oee, mttr, mtbf, downtime, state, defects }] },
 *   packing:     { machines: [...] },
 *   secondary:   { machines: [...] },
 *   summary:     { avgOee, totalDowntime, totalDefects, emergencyStop, temperature },
 *   raw:         { uuid: value, ... },
 *   timestamp:   ISO string
 * }
 */
function buildSnapshot(map) {
  const v = (key) => {
    const val = map[VARIABLE_IDS[key]];
    return val !== undefined && val !== null ? Number(val) : null;
  };

  const boolV = (key) => {
    const val = map[VARIABLE_IDS[key]];
    return val === true || val === 1 || val === '1' || val === 'true';
  };

  // Machine state label
  const stateLabel = (n) => {
    const states = { 0: 'Idle', 1: 'Running', 2: 'Fault', 3: 'Maintenance' };
    return states[n] ?? 'Unknown';
  };

  const sandwichingMachines = [1, 2, 3, 4, 5, 6].map(i => ({
    id: i,
    label: `SW-M${i}`,
    oee: v(`SW_M${i}_OEE`),
    mttr: v(`SW_M${i}_MTTR`),
    mtbf: v(`SW_M${i}_MTBF`),
    downtime: v(`SW_M${i}_DOWNTIME`),
    stateCode: v(`SW_M${i}_STATE`),
    stateLabel: stateLabel(v(`SW_M${i}_STATE`)),
    defects: {
      broken: v(`SW_M${i}_DEFECT_BROKEN`),
      upsideDown: i <= 5 ? v(`SW_M${i}_DEFECT_UD`) : null,
    },
  }));

  const packingMachines = [1, 2, 3, 4, 5].map(i => ({
    id: i,
    label: `PK-M${i}`,
    oee: v(`PK_M${i}_OEE`),
    mttr: v(`PK_M${i}_MTTR`),
    mtbf: v(`PK_M${i}_MTBF`),
    downtime: v(`PK_M${i}_DOWNTIME`),
    output: v(`PK_M${i}_OUTPUT`),
    stateCode: null, // No state tags for packing in this config
    stateLabel: v(`PK_M${i}_OEE`) > 0 ? 'Running' : 'Idle',
    defects: {
      joint: v(`PK_M${i}_DEFECT_JOINT`),
      burnt: v(`PK_M${i}_DEFECT_BURNT`),
      empty: v(`PK_M${i}_DEFECT_EMPTY`),
      overWeight: v(`PK_M${i}_DEFECT_OW`),
      underWeight: v(`PK_M${i}_DEFECT_UW`),
    },
  }));

  const secondaryMachines = [1, 2].map(i => ({
    id: i,
    label: `SP-M${i}`,
    oee: v(`SP_M${i}_OEE`),
    downtime: v(`SP_M${i}_DOWNTIME`),
    output: v(`SP_M${i}_OUTPUT`),
    stateLabel: v(`SP_M${i}_OEE`) > 0 ? 'Running' : 'Idle',
  }));

  // Summary aggregates
  const allOee = [
    ...sandwichingMachines.map(m => m.oee),
    ...packingMachines.map(m => m.oee),
    ...secondaryMachines.map(m => m.oee),
  ].filter(x => x !== null);

  const allDowntime = [
    ...sandwichingMachines.map(m => m.downtime),
    ...packingMachines.map(m => m.downtime),
    ...secondaryMachines.map(m => m.downtime),
  ].filter(x => x !== null);

  const totalDefects =
    sandwichingMachines.reduce((acc, m) =>
      acc + (m.defects.broken || 0) + (m.defects.upsideDown || 0), 0) +
    packingMachines.reduce((acc, m) =>
      acc + (m.defects.joint || 0) + (m.defects.burnt || 0) +
      (m.defects.empty || 0) + (m.defects.overWeight || 0) + (m.defects.underWeight || 0), 0);

  const avgOee = allOee.length
    ? allOee.reduce((a, b) => a + b, 0) / allOee.length
    : null;

  const totalDowntime = allDowntime.reduce((a, b) => a + b, 0);

  return {
    sandwiching: { machines: sandwichingMachines },
    packing: { machines: packingMachines },
    secondary: { machines: secondaryMachines },
    summary: {
      avgOee: avgOee !== null ? Math.round(avgOee * 10) / 10 : null,
      totalDowntime: Math.round(totalDowntime * 10) / 10,
      totalDefects,
      emergencyStop: boolV('EMERGENCY_STOP'),
      temperature: v('LINE_TEMPERATURE'),
    },
    raw: map,
    timestamp: new Date().toISOString(),
  };
}

// ── Public API ────────────────────────────────────────────────

/**
 * Fetch all IIH variables and return a structured snapshot.
 */
export async function fetchAll() {
  const map = await fetchVariables();
  return buildSnapshot(map);
}

/**
 * Fetch a specific subset of variables by key names.
 * @param {string[]} keys - Keys from VARIABLE_IDS (e.g. ['SW_M1_OEE', 'SW_M1_MTTR'])
 */
export async function fetchByKeys(keys) {
  const ids = keys.map(k => VARIABLE_IDS[k]).filter(Boolean);
  return fetchVariables(ids);
}

/**
 * Start polling IIH for live data.
 * @param {Function} onData  - Called with snapshot on each successful fetch
 * @param {Function} onError - Called with Error on failure
 * @param {number}   intervalMs - Poll interval (default 5000ms)
 * @returns {Function} stop - Call to stop polling
 */
export function startPolling(onData, onError, intervalMs = 5000) {
  let active = true;
  let timeoutId = null;

  const poll = async () => {
    if (!active) return;
    try {
      const snapshot = await fetchAll();
      if (active) onData(snapshot);
    } catch (err) {
      console.error('[iihDataService] Poll error:', err);
      if (active && onError) onError(err);
    } finally {
      if (active) timeoutId = setTimeout(poll, intervalMs);
    }
  };

  // Fire immediately
  poll();

  return () => {
    active = false;
    if (timeoutId) clearTimeout(timeoutId);
  };
}

export default { fetchAll, fetchByKeys, startPolling, VARIABLE_IDS };
