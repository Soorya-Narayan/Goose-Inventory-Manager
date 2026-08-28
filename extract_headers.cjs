const xlsx = require('xlsx');

try {
  const filePath = 'd:\\Documents\\cip-dashboard-react_backup_41\\PHE-01_Report (1).xlsm';
  console.log('Reading file:', filePath);
  const workbook = xlsx.readFile(filePath);
  const firstSheetName = workbook.SheetNames[0];
  console.log('Sheet name:', firstSheetName);
  const worksheet = workbook.Sheets[firstSheetName];
  const json = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
  
  if (json.length > 0) {
    console.log('Data sample (first 5 rows):');
    console.log(JSON.stringify(json.slice(0, 5), null, 2));
  } else {
    console.log("Empty sheet");
  }
} catch (e) {
  console.error("Error reading file:", e);
}
