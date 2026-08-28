// src/utils/historicDataStore.js

// Expected CSV format (header row required):
// timestamp,temperature,pressure,flowRate,conductivity,phLevel,waterLevel
// 2023-10-25T08:00:00Z,75.2,2.1,120.5,15.2,7.1,85

export const parseHistoricCSV = (csvText) => {
  try {
    const lines = csvText.split('\n');
    if (lines.length < 2) throw new Error("CSV file is empty or has no data rows.");

    // Detect delimiter (comma or semicolon)
    const firstLine = lines[0];
    const delimiter = firstLine.includes(';') ? ';' : ',';

    const rawHeaders = firstLine.split(delimiter).map(h => h.trim());
    const headers = rawHeaders.map(normalizeHeader);

    const parsedData = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = line.split(delimiter);
      const row = {};
      
      headers.forEach((header, index) => {
        let val = values[index]?.trim();
        // Parse numbers if they look like numbers
        if (val !== undefined && val !== '' && !isNaN(Number(val))) {
          row[header] = Number(val);
        } else {
          row[header] = val;
        }
      });
      
      // Attempt to normalize timestamp to ISO
      if (row.timestamp && typeof row.timestamp === 'string') {
        if (row.timestamp.includes('.')) {
          // German format "DD.MM.YYYY HH:mm:ss"
          const parts = row.timestamp.split(' ');
          if (parts.length === 2) {
            const dateParts = parts[0].split('.');
            if (dateParts.length === 3) {
              row.timestamp = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}T${parts[1]}`;
            }
          }
        }
      }

      parsedData.push(row);
    }

    // Sort by timestamp
    parsedData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    return parsedData;
  } catch (e) {
    throw new Error("Failed to parse CSV: " + e.message);
  }
};

// Extracted date string from timestamp (e.g. YYYY-MM-DD)
export const getDateFromTimestamp = (timestamp) => {
  try {
    return new Date(timestamp).toISOString().split('T')[0];
  } catch (e) {
    return null;
  }
};

export const saveHistoricData = (parsedData) => {
  if (!parsedData || parsedData.length === 0) return null;

  // Group by date to store day-by-day
  const dataByDate = {};
  
  parsedData.forEach(point => {
    const dateStr = getDateFromTimestamp(point.timestamp);
    if (!dateStr) return;
    
    if (!dataByDate[dateStr]) dataByDate[dateStr] = [];
    dataByDate[dateStr].push(point);
  });

  const savedDates = [];
  let storageFull = false;

  Object.keys(dataByDate).forEach(dateStr => {
    const key = `cip_historic_data_${dateStr}`;
    try {
      localStorage.setItem(key, JSON.stringify(dataByDate[dateStr]));
      savedDates.push(dateStr);
    } catch (e) {
      console.warn(`Failed to save historic data for ${dateStr}. LocalStorage might be full.`, e);
      storageFull = true;
    }
  });
  
  if (storageFull && savedDates.length === 0) {
    throw new Error("Local storage is full. Please clear existing historic data using the 'Clear All' button first.");
  }

  // Update index of available dates
  const existingDates = getAvailableHistoricDates();
  const allDates = [...new Set([...existingDates, ...savedDates])].sort((a, b) => new Date(b) - new Date(a)); // Newest first
  localStorage.setItem('cip_historic_dates_index', JSON.stringify(allDates));

  return savedDates;
};

export const getHistoricData = (dateString) => {
  try {
    const data = localStorage.getItem(`cip_historic_data_${dateString}`);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
};

export const getAvailableHistoricDates = () => {
  try {
    const index = localStorage.getItem('cip_historic_dates_index');
    return index ? JSON.parse(index) : [];
  } catch (e) {
    return [];
  }
};

export const getHistoricDates = () => {
  try {
    const dates = localStorage.getItem('cip_historic_dates_index');
    return dates ? JSON.parse(dates) : [];
  } catch (e) {
    console.error("Failed to load historic dates index", e);
    return [];
  }
};

const HEADER_MAP = {
  timestamp: ['timestamp', 'date', 'time', 'date and time', 'datetime', 'to date & time'],
  temperature: ['temperature', 'holding out(tt-1 a)', 'holdingout', 'hot milk', 'temp', 'e_holdingout_tt1a', 'holding out (tt-06)'],
  pressure: ['pressure', 'steam pressure', 'steampressure', 'e_steampressure'],
  flowRate: ['flowrate', 'flow rate', 'milk flow', 'milk flow (l/hr)', 'e_milkflow_lperhr'],
  conductivity: ['conductivity', 'electric conductivity', 'electric conductivity (ms)', 'e_elecconductivity_ms'],
  waterLevel: ['waterlevel', 'water level', 'holding in (tt07)', 'holding in', 'e_holdingin_tt07'], // Used as fallback for water demo
  phLevel: ['phlevel', 'ph level', 'ph'],
  causticLevel: ['causticlevel', 'caustic level', 'caustic'],
  productionStatus: ['production status', 'production', 'prod status'],
  cipStatus: ['cip status', 'cip', 'cip flushing'],
  sterilizationStatus: ['sterilization status', 'sterilization'],
  alarms: ['alarms', 'alarm', 'active alarms', 'active alarm']
};

const normalizeHeader = (header) => {
  const clean = header.trim().toLowerCase();
  for (const [key, aliases] of Object.entries(HEADER_MAP)) {
    if (aliases.some(alias => clean.includes(alias))) {
      return key;
    }
  }
  return clean; // If no match, keep the cleaned version
};

export const clearHistoricData = () => {
  const dates = getAvailableHistoricDates();
  dates.forEach(date => localStorage.removeItem(`cip_historic_data_${date}`));
  localStorage.removeItem('cip_historic_dates_index');
};
