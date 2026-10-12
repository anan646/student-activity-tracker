import { Student } from '@/types';

// ฟังก์ชันแปลงเลขปี พ.ศ. เป็นชั้นปี (เช่น ปัจจุบัน 2568, เข้าปี 2568 = ปี 1, 2567 = ปี 2)
function calculateYearLevel(entryYearStr: string): number {
  const entryYear = parseInt(entryYearStr, 10);
  const currentAcademicYear = 2568; // ปีการศึกษาปัจจุบัน
  if (isNaN(entryYear)) return 1;
  const level = currentAcademicYear - entryYear + 1;
  return level > 0 && level <= 6 ? level : 1;
}

export async function fetchStudentsFromFTU(acadYear: string): Promise<Student[]> {
  const baseUrl = 'https://reg.ftu.ac.th/registrar/studentset.asp';
  const mainUrl = `${baseUrl}?levelid=40&facultyid=4000&acadyear=${acadYear}&d1=2&semester=1`;

  try {
    const res = await fetch(mainUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch FTU registrar: HTTP ${res.status}`);
    }

    const buffer = await res.arrayBuffer();
    const decoder = new TextDecoder('windows-874');
    const html = decoder.decode(buffer);

    // ดึง sublinks ของแต่ละกลุ่มวิชาที่มีรายชื่อนักศึกษา
    // รูปแบบลิงก์: studentset.asp?cmd=1&campusid=1&groupyear=...&studentgroup=...&avs...
    const linkRegex = /href=["']?(studentset\.asp\?cmd=1[^"' >]+)["']?/gi;
    const subLinks = new Set<string>();
    let match;

    while ((match = linkRegex.exec(html)) !== null) {
      let rawLink = match[1];
      // เอาเฉพาะลิงก์ที่ไม่มี filter status (คือรายชื่อรับเข้าทั้งหมด)
      if (!rawLink.includes('status=')) {
        subLinks.add(rawLink.replace(/&amp;/g, '&'));
      }
    }

    const students: Student[] = [];

    // วนลูปดึงรายชื่อจากแต่ละกลุ่มวิชา
    for (const subLink of Array.from(subLinks)) {
      try {
        const subRes = await fetch(`https://reg.ftu.ac.th/registrar/${subLink}`, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
        });

        if (!subRes.ok) continue;

        const subBuffer = await subRes.arrayBuffer();
        const subHtml = decoder.decode(subBuffer);

        // ดึงชื่อสาขาวิชาจากหน้า
        let major = 'ไม่ระบุสาขา';
        const majorMatch = subHtml.match(/สาขาวิชา\s*[\d\-:]*\s*([^\r\n<]+)/);
        if (majorMatch && majorMatch[1]) {
          major = majorMatch[1].trim();
        }

        // ดึงแถวนักศึกษา
        // รูปแบบตาราง: <td>ลำดับ</td><td>รหัสประจำตัว</td><td>ชื่อ</td><td>สถานภาพ</td>
        const rowRegex = /<tr[^>]*>[\s\S]*?<\/tr>/gi;
        const rows = subHtml.match(rowRegex) || [];

        for (const row of rows) {
          // ตรวจสอบว่ามีรหัสนักศึกษา (ตัวเลข 8-10 หลัก) หรือไม่
          const studentIdMatch = row.match(/>\s*(\d{8,10})\s*</);
          if (studentIdMatch && studentIdMatch[1]) {
            const studentId = studentIdMatch[1].trim();

            // ค้นหาชื่อ-นามสกุล (นาย/นาง/นางสาว/น.ส.)
            const nameMatch = row.match(/>\s*([^\d<]+(?:นาย|นาง|นางสาว|น\.ส\.)[^\d<]+)\s*</);
            let name = '';
            if (nameMatch && nameMatch[1]) {
              name = nameMatch[1].replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
            }

            // ถ้าไม่เจอนำหน้า ให้ดึงข้อความคอลัมน์ถัดไป
            if (!name) {
              const tdMatches = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
              if (tdMatches && tdMatches.length >= 3) {
                name = tdMatches[2].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
              }
            }

            if (name && !students.some((s) => s.studentId === studentId)) {
              students.push({
                studentId,
                name,
                major,
                academicYear: acadYear,
                yearLevel: calculateYearLevel(acadYear),
              });
            }
          }
        }
      } catch (subErr) {
        console.error('Error fetching sublink:', subErr);
      }
    }

    return students;
  } catch (error) {
    console.error(`Error crawling FTU acadyear ${acadYear}:`, error);
    throw error;
  }
}
