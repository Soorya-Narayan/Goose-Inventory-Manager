const xlsx = require('xlsx');
const fs = require('fs');

try {
  console.log('Reading workbook...');
  const workbook = xlsx.readFile('d:\\Documents\\cip-dashboard-react_backup_41\\PHE-01_Report (1).xlsm');
  console.log('Available sheets:', workbook.SheetNames);
  
  const sheet = workbook.Sheets['PV'];
  if (!sheet) {
    console.error('PV sheet not found!');
    process.exit(1);
  }
  
  console.log('Converting PV sheet to CSV...');
  const csv = xlsx.utils.sheet_to_csv(sheet);
  
  fs.writeFileSync('d:\\Documents\\cip-dashboard-react_backup_41\\PV_Data.csv', csv);
  console.log('Successfully saved to PV_Data.csv');
  
  // Print first few lines for preview
  const lines = csv.split('\n');
  console.log('--- PREVIEW ---');
  console.log(lines.slice(0, 10).join('\n'));
} catch (e) {
  console.error(e);
}
