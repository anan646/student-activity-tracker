const fs = require('fs');

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzRcJuzvfN2W7AHiCXdDU13tKRQz3nPWTTNzyybylmuEJ4SSr0zG-0sGguaCOWfG2XL1g/exec';

async function updateMajorsInSheet() {
  const students = JSON.parse(fs.readFileSync('ftu_students.json', 'utf-8'));
  console.log(`กำลังส่งคำสั่งอัปเดตคอลัมน์สาขาวิชา (Major) จำนวน ${students.length} คนลง Google Sheet...`);

  // ส่ง mapping array [{ studentId, major }]
  const mapping = students.map(s => ({
    studentId: String(s.studentId).trim(),
    major: s.major
  }));

  const chunkSize = 200;
  for (let i = 0; i < mapping.length; i += chunkSize) {
    const chunk = mapping.slice(i, i + chunkSize);
    console.log(`อัปเดตชุดที่ ${Math.floor(i / chunkSize) + 1} (${chunk.length} คน)...`);

    try {
      const res = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'update_majors',
          updates: chunk
        }),
        redirect: 'follow',
      });
      const text = await res.text();
      console.log(`ผลลัพธ์ชุดที่ ${Math.floor(i / chunkSize) + 1}:`, text);
    } catch (err) {
      console.error('Error updating:', err.message);
    }
  }

  console.log('🎉 อัปเดตสาขาวิชาเสร็จสิ้น!');
}

updateMajorsInSheet();
