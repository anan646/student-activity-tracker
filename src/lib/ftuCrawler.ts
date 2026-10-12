import { Student } from '@/types';

// 1. ตารางสาขาวิชาตามโครงสร้างรหัส 3 หลัก (หลักที่ 4-6 ของรหัสนักศึกษา)
export const MAJOR_MAP: Record<string, string> = {
  '441': 'อิสลามศึกษา',
  '442': 'ภาษาอาหรับ',
  '443': 'วิทยาศาสตร์ทั่วไป',
  '444': 'เคมี',
  '445': 'ภาษาอังกฤษ',
  '446': 'ภาษามลายูและเทคโนโลยีการศึกษา',
  '447': 'การศึกษาปฐมวัย',
};

// ฟังก์ชันระบุสาขาวิชาจากรหัสนักศึกษา
export function getMajorFromStudentId(studentId: string): string {
  if (studentId.length >= 6) {
    const code = studentId.substring(3, 6);
    if (MAJOR_MAP[code]) {
      return MAJOR_MAP[code];
    }
  }
  return 'ไม่ระบุสาขา';
}

// 2. ฟังก์ชันระบุเพศจากรหัสนักศึกษา (หลักที่ 3: 1 = ชาย, 2 = หญิง) หรือคำนำหน้า
export function getGenderFromStudentId(studentId: string, name?: string): 'ชาย' | 'หญิง' {
  if (studentId.length >= 3) {
    const digit3 = studentId.charAt(2);
    if (digit3 === '1') return 'ชาย';
    if (digit3 === '2') return 'หญิง';
  }
  if (name) {
    if (name.includes('นาย')) return 'ชาย';
    if (name.includes('นางสาว') || name.includes('นาง') || name.includes('น.ส.')) return 'หญิง';
  }
  return 'ชาย';
}

// 3. ฟังก์ชันคำนวณปีการศึกษาที่เข้าและชั้นปีที่ถูกต้องแม่นยำ
// รหัส 2 หลักแรก = ปี พ.ศ. ที่เข้าศึกษา (เช่น 69 = 2569, 68 = 2568, 67 = 2567, 66 = 2566)
export function getAcademicYearAndLevel(studentId: string, currentAcademicYear = 2569): {
  academicYear: string;
  yearLevel: number;
} {
  const prefix2 = studentId.length >= 2 ? studentId.substring(0, 2) : '69';
  const entryYearBE = '25' + prefix2;
  const entryYearNum = parseInt(entryYearBE, 10);

  // คำนวณชั้นปี: ปี 2569 นศ. รหัส 69 อยู่ปี 1, รหัส 68 อยู่ปี 2, รหัส 67 อยู่ปี 3, รหัส 66 อยู่ปี 4
  let yearLevel = currentAcademicYear - entryYearNum + 1;
  if (yearLevel < 1) yearLevel = 1;
  if (yearLevel > 6) yearLevel = 4;

  return {
    academicYear: entryYearBE,
    yearLevel,
  };
}

// 4. ดึงข้อมูลนักศึกษาจากระบบสำนักทะเบียน FTU
export async function fetchStudentsFromFTU(acadYear: string): Promise<Student[]> {
  const baseUrl = 'https://reg.ftu.ac.th/registrar/studentset.asp';
  const mainUrl = `${baseUrl}?levelid=40&facultyid=4000&acadyear=${acadYear}&d1=2&semester=1`;

  try {
    const res = await fetch(mainUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch FTU registrar: HTTP ${res.status}`);
    }

    const cookie = res.headers.get('set-cookie') || '';
    const buffer = await res.arrayBuffer();
    const decoder = new TextDecoder('windows-874');
    const html = decoder.decode(buffer);

    const linkRegex = /href=["']?(studentset\.asp\?cmd=1[^"' >]+)["']?/gi;
    const subLinks = new Set<string>();
    let match;

    while ((match = linkRegex.exec(html)) !== null) {
      const rawLink = match[1];
      if (!rawLink.includes('status=')) {
        subLinks.add(rawLink.replace(/&amp;/g, '&'));
      }
    }

    const students: Student[] = [];

    for (const subLink of Array.from(subLinks)) {
      try {
        const subRes = await fetch(`https://reg.ftu.ac.th/registrar/${subLink}`, {
          headers: {
            'Cookie': cookie,
            'Referer': mainUrl,
            'User-Agent': 'Mozilla/5.0',
          },
        });

        if (!subRes.ok) continue;

        const subBuffer = await subRes.arrayBuffer();
        const subHtml = decoder.decode(subBuffer);

        const rows = subHtml.match(/<TR[^>]*class=['"]normalDetail['"][^>]*>[\s\S]*?<\/TR>/gi) || [];

        for (const row of rows) {
          const tdMatches = row.match(/<TD[^>]*>([\s\S]*?)<\/TD>/gi) || [];
          if (tdMatches.length >= 3) {
            const studentId = tdMatches[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, '').trim();
            const name = tdMatches[2].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

            if (/^\d{8,10}$/.test(studentId) && name) {
              if (!students.some((s) => s.studentId === studentId)) {
                const major = getMajorFromStudentId(studentId);
                const gender = getGenderFromStudentId(studentId, name);
                const { academicYear, yearLevel } = getAcademicYearAndLevel(studentId);

                students.push({
                  studentId,
                  name,
                  gender,
                  major,
                  academicYear,
                  yearLevel,
                });
              }
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
