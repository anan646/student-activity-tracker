const fs = require('fs');

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzRcJuzvfN2W7AHiCXdDU13tKRQz3nPWTTNzyybylmuEJ4SSr0zG-0sGguaCOWfG2XL1g/exec';

const MAJOR_MAP = {
  '441': 'อิสลามศึกษา',
  '442': 'ภาษาอาหรับ',
  '443': 'วิทยาศาสตร์ทั่วไป',
  '444': 'เคมี',
  '445': 'ภาษาอังกฤษ',
  '446': 'ภาษามลายูและเทคโนโลยีการศึกษา',
  '447': 'การศึกษาปฐมวัย',
};

function getMajor(id) {
  const code = id.substring(3, 6);
  return MAJOR_MAP[code] || 'ไม่ระบุสาขา';
}

async function updateAllWithMajors() {
  const raw = fs.readFileSync('ftu_students.json', 'utf-8');
  const students = JSON.parse(raw);

  console.log(`กำลังอัปเดตข้อมูลนักศึกษา 960 คนพร้อมระบุสาขาวิชาที่ถูกต้อง...`);

  const updatedStudents = students.map(s => ({
    studentId: s.StudentID,
    name: s.Name,
    major: getMajor(s.StudentID),
    academicYear: s.AcademicYear,
    yearLevel: s.YearLevel,
  }));

  // ส่งไปแทนที่ข้อมูลใน Google Sheet ผ่าน action: 'replace_all_students'
  const chunkSize = 250;
  for (let i = 0; i < updatedStudents.length; i += chunkSize) {
    const chunk = updatedStudents.slice(i, i + chunkSize);
    console.log(`ส่งชุดที่ ${Math.floor(i / chunkSize) + 1} (${chunk.length} คน)...`);

    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: i === 0 ? 'replace_all_students' : 'import_students',
        students: chunk,
      }),
      redirect: 'follow',
    });

    const text = await res.text();
    console.log(`ผลลัพธ์ชุดที่ ${Math.floor(i / chunkSize) + 1}:`, text);
  }

  // อัปเดตไฟล์ JSON และ Excel ด้วย
  fs.writeFileSync('ftu_students.json', JSON.stringify(updatedStudents, null, 2), 'utf-8');
  console.log('🎉 อัปเดตข้อมูลนักศึกษาพร้อมสาขาวิชาเสร็จสมบูรณ์!');
}

updateAllWithMajors();
