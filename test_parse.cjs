const fs = require('fs');
const content = fs.readFileSync('d:\\Documents\\cip-dashboard-react_backup_41\\PHE01_ENMPro_FullDay_09062026.csv', 'utf-8');

const parseHistoricCSV = (csvText) => {
  try {
    const lines = csvText.split('\n');
    if (lines.length < 2) throw new Error('CSV file is empty or has no data rows.');

    const firstLine = lines[0];
    const delimiter = firstLine.includes(';') ? ';' : ',';

    const HEADER_MAP = {
      timestamp: ['timestamp', 'date', 'time', 'date and time', 'datetime', 'to date & time'],
      temperature: ['temperature', 'holding out(tt-1 a)', 'holdingout', 'hot milk', 'temp', 'e_holdingout_tt1a', 'holding out (tt-06)'],
      pressure: ['pressure', 'steam pressure', 'steampressure', 'e_steampressure'],
      flowRate: ['flowrate', 'flow rate', 'milk flow', 'milk flow (l/hr)', 'e_milkflow_lperhr'],
      conductivity: ['conductivity', 'electric conductivity', 'electric conductivity (ms)', 'e_elecconductivity_ms'],
      waterLevel: ['waterlevel', 'water level', 'holding in (tt07)', 'holding in', 'e_holdingin_tt07'],
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
      return clean;
    };

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
        if (val !== undefined && val !== '' && !isNaN(Number(val))) {
          row[header] = Number(val);
        } else {
          row[header] = val;
        }
      });
      
      if (row.timestamp && typeof row.timestamp === 'string') {
        if (row.timestamp.includes('.')) {
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

    parsedData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    return parsedData;
  } catch (e) {
    throw new Error('Failed to parse CSV: ' + e.message);
  }
};

const getDateFromTimestamp = (timestamp) => {
  try {
    return new Date(timestamp).toISOString().split('T')[0];
  } catch (e) {
    return null;
  }
};

const parsedData = parseHistoricCSV(content);
console.log('Parsed Data Length:', parsedData.length);

const dataByDate = {};
let invalidDates = 0;
parsedData.forEach(point => {
  const dateStr = getDateFromTimestamp(point.timestamp);
  if (!dateStr) {
    invalidDates++;
    return;
  }
  if (!dataByDate[dateStr]) dataByDate[dateStr] = [];
  dataByDate[dateStr].push(point);
});

console.log('Saved Dates length:', Object.keys(dataByDate).length);
console.log('Invalid Dates:', invalidDates);
