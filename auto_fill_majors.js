function fillAllMajorsNow() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Students");
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;
  
  var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  var map = {
    "441": "อิสลามศึกษา",
    "442": "ภาษาอาหรับ",
    "443": "วิทยาศาสตร์ทั่วไป",
    "444": "เคมี",
    "445": "ภาษาอังกฤษ",
    "446": "ภาษามลายูและเทคโนโลยีการศึกษา",
    "447": "การศึกษาปฐมวัย"
  };
  
  var majors = ids.map(function(r) {
    var id = String(r[0]).trim();
    var code = id.length >= 6 ? id.substring(3, 6) : "";
    return [map[code] || "ไม่ระบุสาขา"];
  });
  
  // เขียนลงคอลัมน์ C (Major) แถวที่ 2 ถึง แถวสุดท้าย
  sheet.getRange(2, 3, majors.length, 1).setValues(majors);
  Logger.log("อัปเดตสาขาวิชาสำเร็จ " + majors.length + " แถว!");
}
