const fs = require('fs');

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzRcJuzvfN2W7AHiCXdDU13tKRQz3nPWTTNzyybylmuEJ4SSr0zG-0sGguaCOWfG2XL1g/exec';

async function uploadToGoogleSheet() {
  const raw = fs.readFileSync('ftu_students.json', 'utf-8');
  const students = JSON.parse(raw);

  console.log(`กำลังเตรียมส่งข้อมูลนักศึกษาจำนวน ${students.length} คนไปยัง Google Sheet...`);

  // แบ่งส่งเป็นชุดๆ ละ 200 คนเพื่อไม่ให้ Google Apps Script Timeout
  const chunkSize = 200;
  let totalUploaded = 0;

  for (let i = 0; i < students.length; i += chunkSize) {
    const chunk = students.slice(i, i + chunkSize).map(s => ({
      studentId: s.StudentID,
      name: s.Name,
      major: s.Major,
      academicYear: s.AcademicYear,
      yearLevel: s.YearLevel,
    }));

    console.log(`ส่งชุดที่ ${Math.floor(i / chunkSize) + 1} (${chunk.length} คน)...`);

    try {
      const res = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'import_students',
          students: chunk,
        }),
        redirect: 'follow',
      });

      const text = await res.text();
      console.log(`ผลลัพธ์ชุดที่ ${Math.floor(i / chunkSize) + 1}:`, text);
      totalUploaded += chunk.length;
    } catch (err) {
      console.error(`เกิดข้อผิดพลาดในชุดที่ ${i}:`, err.message);
    }
  }

  console.log(`🎉 ส่งข้อมูลเสร็จสิ้นทั้งหมด ${totalUploaded} คน!`);
}

uploadToGoogleSheet();
