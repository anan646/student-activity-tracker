import { Student } from '@/types';

// แมปสาขาวิชาตามโครงสร้างรหัส 3 หลัก (ตำแหน่งที่ 4-6 ของรหัสนักศึกษา)
export const MAJOR_MAP: Record<string, string> = {
  '441': 'อิสลามศึกษา',
  '442': 'ภาษาอาหรับ',
  '443': 'วิทยาศาสตร์ทั่วไป',
  '444': 'เคมี',
  '445': 'ภาษาอังกฤษ',
  '446': 'ภาษามลายูและเทคโนโลยีการศึกษา',
  '447': 'การศึกษาปฐมวัย',
};

export function getMajorFromStudentId(studentId: string): string {
  if (studentId.length >= 6) {
    const code = studentId.substring(3, 6);
    if (MAJOR_MAP[code]) {
      return MAJOR_MAP[code];
    }
  }
  return 'ไม่ระบุสาขา';
}

// ฟังก์ชันคำนวณชั้นปีแบบ Dynamic อิงจากปีการศึกษาปัจจุบัน
export function calculateYearLevel(entryYearStr: string, currentAcademicYear?: number): number {
  const entryYear = parseInt(entryYearStr, 10);
  // หากไม่ระบุ ให้คำนวณปีปัจจุบันตามปฏิทิน พ.ศ. (เดือน 5 ขึ้นไป ถือเป็นปีการศึกษาใหม่)
  const now = new Date();
  const currentYearBE = now.getFullYear() + 543;
  const currentAcad = currentAcademicYear || (now.getMonth() >= 4 ? currentYearBE : currentYearBE - 1);

  if (isNaN(entryYear)) return 1;
  const level = currentAcad - entryYear + 1;
  return level > 0 && level <= 6 ? level : 1;
}

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
                // ระบุสาขาอัตโนมัติตามโครงสร้างรหัส 3 หลัก
                const major = getMajorFromStudentId(studentId);

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
