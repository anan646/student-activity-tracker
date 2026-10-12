const XLSX = require('xlsx');

// อ่านไฟล์นักศึกษา 960 คน
const wb = XLSX.readFile('ftu_students_all.xlsx');
const ws = wb.Sheets['Students'];
const data = XLSX.utils.sheet_to_json(ws);

console.log('--- ตัวอย่างข้อมูลนักศึกษา (5 คนแรก) ---');
console.log(data.slice(0, 5));

// สรุปจำนวนตามปีการศึกษา
const byYear = {};
data.forEach(s => {
  byYear[s.AcademicYear] = (byYear[s.AcademicYear] || 0) + 1;
});
console.log('\n--- จำนวนนักศึกษาแยกตามปีการศึกษา ---');
console.log(byYear);
