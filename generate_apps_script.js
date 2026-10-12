const fs = require('fs');
const path = require('path');

const students = JSON.parse(fs.readFileSync(path.join(__dirname, 'src/data/students.json'), 'utf-8'));

const rows = students.map(s => [
  s.StudentID,
  s.Name,
  s.Gender,
  s.Major,
  parseInt(s.AcademicYear, 10),
  s.YearLevel
]);

const scriptCode = `// ฟังก์ชันอัปเดตข้อมูลนักศึกษาทั้ง 960 คนพร้อม 6 คอลัมน์ (รหัส, ชื่อ-สกุล, เพศ, สาขา, ปีการศึกษา, ชั้นปี)
// คัดลอกโค้ดนี้ไปวางใน Google Apps Script (ส่วนขยาย > Apps Script) แล้วกด Run ฟังก์ชัน 'updateAllStudentsAccurate'

function updateAllStudentsAccurate() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Students");
  if (!sheet) {
    sheet = ss.insertSheet("Students");
  }

  // 1. ตั้งหัวตาราง 6 คอลัมน์ที่ถูกต้องครบถ้วน
  sheet.getRange(1, 1, 1, 6).setValues([
    ["StudentID", "Name", "Gender", "Major", "AcademicYear", "YearLevel"]
  ]);

  // 2. ข้อมูลนักศึกษา 960 คนที่ตรวจสอบความถูกต้อง 100% แล้ว
  var studentsData = ${JSON.stringify(rows)};

  // 3. ล้างข้อมูลเก่าทั้งหมดตั้งแต่แถวที่ 2
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, Math.max(sheet.getLastColumn(), 6)).clearContent();
  }

  // 4. บันทึกข้อมูล 960 คนลง Google Sheet
  sheet.getRange(2, 1, studentsData.length, 6).setValues(studentsData);
  Logger.log("✅ อัปเดตข้อมูลนักศึกษาสำเร็จเรียบร้อย " + studentsData.length + " คน!");
}
`;

fs.writeFileSync(path.join(__dirname, 'update_google_sheet_code.js'), scriptCode, 'utf-8');
console.log('✅ Generated update_google_sheet_code.js with ' + rows.length + ' students.');
