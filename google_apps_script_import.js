// วางโค้ดนี้ลงใน Google Apps Script (ส่วนขยาย > Apps Script) แล้วกดรันฟังก์ชัน `importAllFTUStudents` เพียงครั้งเดียว!

function importAllFTUStudents() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Students");
  if (!sheet) {
    sheet = ss.insertSheet("Students");
    sheet.appendRow(["StudentID", "Name", "Major", "AcademicYear", "YearLevel"]);
  }
  
  // ล้างข้อมูลเก่า (คงหัวตารางแถว 1 ไว้)
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 5).clearContent();
  }

  // ดึงข้อมูลนักศึกษาทั้ง 960 คน
  var studentsData = GET_STUDENTS_LIST();
  
  var rows = studentsData.map(function(s) {
    return [s.StudentID, s.Name, s.Major, s.AcademicYear, s.YearLevel];
  });
  
  sheet.getRange(2, 1, rows.length, 5).setValues(rows);
  Logger.log("นำเข้านักศึกษาสำเร็จ " + rows.length + " คน!");
}
