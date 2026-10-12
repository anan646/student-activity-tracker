function cleanAndFillAllMajors() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Students");
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;
  
  // 1. ดึงข้อมูลทั้งหมด
  var data = sheet.getRange(2, 1, lastRow - 1, 5).getValues();
  
  var map = {
    "441": "อิสลามศึกษา",
    "442": "ภาษาอาหรับ",
    "443": "วิทยาศาสตร์ทั่วไป",
    "444": "เคมี",
    "445": "ภาษาอังกฤษ",
    "446": "ภาษามลายูและเทคโนโลยีการศึกษา",
    "447": "การศึกษาปฐมวัย"
  };
  
  // 2. กรองข้อมูลซ้ำโดยใช้ StudentID เป็นหลัก และใส่สาขาที่ถูกต้อง
  var seen = {};
  var uniqueRows = [];
  
  data.forEach(function(row) {
    var id = String(row[0]).trim();
    if (!id || id === "StudentID") return;
    
    if (!seen[id]) {
      seen[id] = true;
      var code = id.length >= 6 ? id.substring(3, 6) : "";
      var major = map[code] || row[2] || "ไม่ระบุสาขา";
      uniqueRows.push([id, row[1], major, row[3], row[4]]);
    }
  });
  
  // 3. ล้างตารางเดิมตั้งแต่แถวที่ 2
  sheet.getRange(2, 1, lastRow - 1, 5).clearContent();
  
  // 4. เขียนข้อมูลที่ถูกต้องกลับลงไป
  if (uniqueRows.length > 0) {
    sheet.getRange(2, 1, uniqueRows.length, 5).setValues(uniqueRows);
  }
  
  Logger.log("จัดระเบียบเรียบร้อย: นักศึกษาทั้งหมด " + uniqueRows.length + " คน พร้อมสาขาวิชาครบถ้วน!");
}
