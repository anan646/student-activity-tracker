const fs = require('fs');
const XLSX = require('xlsx');

function calculateYearLevel(entryYearStr) {
  const entryYear = parseInt(entryYearStr, 10);
  const currentAcademicYear = 2568;
  if (isNaN(entryYear)) return 1;
  const level = currentAcademicYear - entryYear + 1;
  return level > 0 && level <= 6 ? level : 1;
}

async function crawlYear(acadYear) {
  console.log(`\n=== เริ่มดึงข้อมูลปีการศึกษา ${acadYear} ===`);
  const baseUrl = 'https://reg.ftu.ac.th/registrar/studentset.asp';
  const mainUrl = `${baseUrl}?levelid=40&facultyid=4000&acadyear=${acadYear}&d1=2&semester=1`;

  const res = await fetch(mainUrl);
  const cookie = res.headers.get('set-cookie') || '';

  const buffer = await res.arrayBuffer();
  const decoder = new TextDecoder('windows-874');
  const html = decoder.decode(buffer);

  const linkRegex = /href=["']?(studentset\.asp\?cmd=1[^"' >]+)["']?/gi;
  const subLinks = new Set();
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    let rawLink = match[1];
    if (!rawLink.includes('status=')) {
      subLinks.add(rawLink.replace(/&amp;/g, '&'));
    }
  }

  console.log(`พบกลุ่มวิชาทั้งหมด: ${subLinks.size} กลุ่ม`);
  const students = [];

  for (const subLink of Array.from(subLinks)) {
    try {
      const subRes = await fetch(`https://reg.ftu.ac.th/registrar/${subLink}`, {
        headers: {
          'Cookie': cookie,
          'Referer': mainUrl,
        },
      });
      if (!subRes.ok) continue;

      const subBuffer = await subRes.arrayBuffer();
      const subHtml = decoder.decode(subBuffer);

      let major = 'ไม่ระบุสาขา';
      const majorMatch = subHtml.match(/สาขาวิชา\s*[\d\-:]*\s*([^\r\n<]+)/);
      if (majorMatch && majorMatch[1]) {
        major = majorMatch[1].trim();
      }

      // ดึงแถวนักศึกษา class='normalDetail'
      const rows = subHtml.match(/<TR[^>]*class=['"]normalDetail['"][^>]*>[\s\S]*?<\/TR>/gi) || [];

      for (const row of rows) {
        // ดึงคอลัมน์ td ทั้งหมด
        const tdMatches = row.match(/<TD[^>]*>([\s\S]*?)<\/TD>/gi) || [];
        if (tdMatches.length >= 3) {
          const studentId = tdMatches[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, '').trim();
          const name = tdMatches[2].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

          if (/^\d{8,10}$/.test(studentId) && name) {
            if (!students.some((s) => s.StudentID === studentId)) {
              students.push({
                StudentID: studentId,
                Name: name,
                Major: major,
                AcademicYear: acadYear,
                YearLevel: calculateYearLevel(acadYear),
              });
            }
          }
        }
      }
    } catch (err) {
      console.error('Error fetching group:', err.message);
    }
  }

  console.log(`ดึงนักศึกษาปี ${acadYear} ได้ทั้งหมด: ${students.length} คน`);
  return students;
}

async function run() {
  const years = ['2565', '2566', '2567', '2568'];
  const allStudents = [];

  for (const y of years) {
    const list = await crawlYear(y);
    allStudents.push(...list);
  }

  console.log(`\n🎉 รวมนักศึกษาทั้งหมดที่ดึงได้: ${allStudents.length} คน`);

  // สร้างไฟล์ Excel
  const ws = XLSX.utils.json_to_sheet(allStudents);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Students');
  XLSX.writeFile(wb, 'ftu_students_all.xlsx');
  console.log('✅ บันทึกลงไฟล์ ftu_students_all.xlsx สำเร็จ');

  // บันทึกลง JSON
  fs.writeFileSync('ftu_students.json', JSON.stringify(allStudents, null, 2), 'utf-8');
}

run();
