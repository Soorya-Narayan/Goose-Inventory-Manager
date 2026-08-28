const fs = require('fs');

try {
  const inputFile = 'd:\\Documents\\cip-dashboard-react_backup_41\\PHE01_ENMPro_FullDay_09062026.csv';
  const outputFile = 'd:\\Documents\\cip-dashboard-react_backup_41\\PHE01_ENMPro_FullDay_Expanded.csv';
  
  const content = fs.readFileSync(inputFile, 'utf-8');
  const lines = content.split('\n');
  
  if (lines.length < 2) {
    console.error('Not enough lines to expand');
    process.exit(1);
  }
  
  // Headers
  const header = lines[0].trim();
  const newHeader = header + ',phLevel,causticLevel,productionStatus,cipStatus,sterilizationStatus,alarms';
  
  const expandedLines = [newHeader];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const parts = line.split(',');
    
    // index 1 is flowRate based on standard header: timestamp,flowRate,waterLevel,temperature,pressure,conductivity
    const flowRate = parseFloat(parts[1] || '0');
    
    // Simulate data
    const phLevel = (6.8 + Math.random() * 0.4).toFixed(2);
    const causticLevel = (45 + Math.random() * 10).toFixed(1);
    
    let productionStatus = '0';
    let cipStatus = '0';
    let sterilizationStatus = '0';
    
    if (flowRate > 5000) {
      productionStatus = '1';
    } else if (flowRate > 1000) {
      cipStatus = '1';
    }
    
    const alarms = ''; // no active alarms
    
    const newLine = `${line},${phLevel},${causticLevel},${productionStatus},${cipStatus},${sterilizationStatus},${alarms}`;
    expandedLines.push(newLine);
  }
  
  fs.writeFileSync(outputFile, expandedLines.join('\n'));
  console.log(`Successfully expanded CSV. Output saved to ${outputFile}`);
} catch (e) {
  console.error('Error:', e.message);
}
