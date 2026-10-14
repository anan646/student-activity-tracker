import * as XLSX from 'xlsx';
import { Student, Activity, AttendanceRecord } from '@/types';

// Helper to trigger browser file download
function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ----------------------------------------------------
// 1. ส่งออกรายงานชั่วโมงกิจกรรม (Hours Report)
// ----------------------------------------------------

export interface HoursReportFilterMeta {
  gender: string;
  major: string;
  year: string;
  status: string;
  requiredHours: number;
}

// 1.1 Excel
export function exportHoursReportExcel(
  students: Array<Student & { totalHours: number }>,
  filters: HoursReportFilterMeta
) {
  const filterDesc = [
    `เพศ: ${filters.gender === 'all' ? 'ทั้งหมด' : filters.gender}`,
    `สาขาวิชา: ${filters.major === 'all' ? 'ทั้งหมด' : filters.major}`,
    `ชั้นปี: ${filters.year === 'all' ? 'ทั้งหมด' : `ปี ${filters.year}`}`,
    `เกณฑ์ขั้นต่ำ: ${filters.requiredHours} ชม.`,
    `วันที่ส่งออก: ${new Date().toLocaleDateString('th-TH')}`,
  ].join(' | ');

  const headers = [
    ['รายงานสรุปผลชั่วโมงกิจกรรมสะสมนักศึกษา (EDU Pass)'],
    ['คณะศึกษาศาสตร์ มหาวิทยาลัยฟาฏอนี (Faculty of Education, Fatoni University)'],
    [filterDesc],
    [],
    ['ลำดับ', 'รหัสนักศึกษา', 'ชื่อ-นามสกุล', 'เพศ', 'สาขาวิชา', 'ชั้นปี', 'ปีการศึกษา', 'ชั่วโมงสะสม', 'เกณฑ์ที่กำหนด', 'สถานะ'],
  ];

  const rows = students.map((s, idx) => [
    idx + 1,
    s.studentId,
    s.name,
    s.gender || 'ไม่ระบุ',
    s.major,
    `ปี ${s.yearLevel}`,
    s.academicYear,
    s.totalHours,
    `${filters.requiredHours} ชม.`,
    s.totalHours >= filters.requiredHours ? 'ครบเกณฑ์' : `ยังไม่ครบ (ขาดอีก ${filters.requiredHours - s.totalHours} ชม.)`,
  ]);

  const ws = XLSX.utils.aoa_to_sheet([...headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'ชั่วโมงกิจกรรม');
  const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  triggerDownload(blob, `รายงานชั่วโมงกิจกรรม_EDU_Pass_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// 1.2 Word (.doc)
export function exportHoursReportWord(
  students: Array<Student & { totalHours: number }>,
  filters: HoursReportFilterMeta
) {
  const dateStr = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
  const filterText = `เพศ: ${filters.gender === 'all' ? 'ทั้งหมด' : filters.gender} | สาขา: ${filters.major === 'all' ? 'ทั้งหมด' : filters.major} | ชั้นปี: ${filters.year === 'all' ? 'ทั้งหมด' : `ปี ${filters.year}`} | เกณฑ์: ${filters.requiredHours} ชม.`;

  const rowsHtml = students.map((s, i) => `
    <tr>
      <td style="text-align:center;">${i + 1}</td>
      <td style="font-family:monospace;text-align:center;">${s.studentId}</td>
      <td>${s.name}</td>
      <td style="text-align:center;">${s.gender}</td>
      <td>${s.major}</td>
      <td style="text-align:center;">ปี ${s.yearLevel}</td>
      <td style="text-align:center;font-weight:bold;color:#0070f3;">${s.totalHours}</td>
      <td style="text-align:center;font-weight:bold;color:${s.totalHours >= filters.requiredHours ? '#059669' : '#e11d48'};">
        ${s.totalHours >= filters.requiredHours ? 'ครบเกณฑ์' : `ขาด ${filters.requiredHours - s.totalHours}`}
      </td>
    </tr>
  `).join('');

  const html = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>รายงานชั่วโมงกิจกรรม EDU Pass</title>
    <style>
      body { font-family: 'TH Sarabun New', 'Sarabun', Tahoma, sans-serif; font-size: 14pt; line-height: 1.3; }
      h2 { text-align: center; margin: 0; padding: 0; font-size: 18pt; }
      h3 { text-align: center; margin: 2px 0 10px; padding: 0; font-size: 15pt; color: #444; }
      p.meta { text-align: center; font-size: 12pt; color: #666; margin-bottom: 15px; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #444; padding: 6px 8px; font-size: 12pt; }
      th { background-color: #f1f5f9; font-weight: bold; text-align: center; }
    </style>
    </head>
    <body>
      <h2>รายงานสรุปผลชั่วโมงกิจกรรมสะสมนักศึกษา (EDU Pass)</h2>
      <h3>คณะศึกษาศาสตร์ มหาวิทยาลัยฟาฏอนี</h3>
      <p class="meta">${filterText} | ข้อมูล ณ วันที่ ${dateStr} (รวม ${students.length} คน)</p>
      <table>
        <thead>
          <tr>
            <th style="width:40px;">ลำดับ</th>
            <th style="width:100px;">รหัสนักศึกษา</th>
            <th>ชื่อ-นามสกุล</th>
            <th style="width:50px;">เพศ</th>
            <th>สาขาวิชา</th>
            <th style="width:50px;">ชั้นปี</th>
            <th style="width:70px;">ชั่วโมงสะสม</th>
            <th style="width:80px;">สถานะ</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
      <div style="margin-top: 40px; display: flex; justify-content: space-between; text-align: center;">
        <div style="float: right; width: 250px; text-align: center;">
          <p>ลงชื่อ......................................................</p>
          <p>(ผู้ดูแลระบบงานกิจกรรมนักศึกษา)</p>
          <p>วันที่.........เดือน.....................พ.ศ...........</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff' + html], { type: 'application/msword;charset=utf-8' });
  triggerDownload(blob, `รายงานชั่วโมงกิจกรรม_EDU_Pass_${new Date().toISOString().slice(0, 10)}.doc`);
}

// 1.3 PDF (Printable View)
export function exportHoursReportPdf(
  students: Array<Student & { totalHours: number }>,
  filters: HoursReportFilterMeta
) {
  const dateStr = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
  const filterText = `เพศ: ${filters.gender === 'all' ? 'ทั้งหมด' : filters.gender} | สาขา: ${filters.major === 'all' ? 'ทั้งหมด' : filters.major} | ชั้นปี: ${filters.year === 'all' ? 'ทั้งหมด' : `ปี ${filters.year}`} | เกณฑ์: ${filters.requiredHours} ชม.`;

  const rowsHtml = students.map((s, i) => `
    <tr>
      <td style="text-align:center;">${i + 1}</td>
      <td style="font-family:monospace;text-align:center;font-weight:600;">${s.studentId}</td>
      <td>${s.name}</td>
      <td style="text-align:center;">${s.gender}</td>
      <td>${s.major}</td>
      <td style="text-align:center;">ปี ${s.yearLevel}</td>
      <td style="text-align:center;font-weight:bold;color:#0070f3;">${s.totalHours}</td>
      <td style="text-align:center;font-weight:bold;color:${s.totalHours >= filters.requiredHours ? '#059669' : '#e11d48'};">
        ${s.totalHours >= filters.requiredHours ? 'ครบเกณฑ์' : `ขาด ${filters.requiredHours - s.totalHours}`}
      </td>
    </tr>
  `).join('');

  const win = window.open('', '_blank');
  if (!win) {
    alert('กรุณาอนุญาตป๊อปอัปเพื่อเปิดหน้าต่างพิมพ์รายงาน');
    return;
  }

  win.document.write(`
    <!DOCTYPE html>
    <html lang="th">
    <head>
      <meta charset="utf-8">
      <title>รายงานชั่วโมงกิจกรรมสะสม - คณะศึกษาศาสตร์ มหาวิทยาลัยฟาฏอนี</title>
      <style>
        @page { size: A4 portrait; margin: 1.5cm; }
        body { font-family: 'Sarabun', 'TH Sarabun New', sans-serif; font-size: 12px; color: #1e293b; line-height: 1.4; margin: 0; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #0070f3; padding-bottom: 12px; margin-bottom: 16px; }
        .logo-text { font-size: 18px; font-weight: 800; color: #0f172a; }
        .sub-text { font-size: 13px; color: #64748b; margin-top: 3px; }
        .badge { display: inline-block; padding: 3px 10px; background: #f1f5f9; border-radius: 6px; font-size: 11px; margin-top: 6px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; font-size: 11px; }
        th { background-color: #f8fafc; font-weight: 700; text-align: center; }
        .footer { margin-top: 30px; display: flex; justify-content: flex-end; page-break-inside: avoid; }
        .sign-box { width: 220px; text-align: center; }
        @media print {
          body { padding: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="margin-bottom: 15px; text-align: right;">
        <button onclick="window.print()" style="padding: 8px 16px; background:#0070f3; color:#fff; border:none; border-radius:8px; font-weight:bold; cursor:pointer;">
          🖨️ สั่งพิมพ์ / บันทึกเป็น PDF
        </button>
      </div>
      <div class="header">
        <div class="logo-text">รายงานสรุปผลชั่วโมงกิจกรรมสะสมนักศึกษา (EDU Pass)</div>
        <div class="sub-text">คณะศึกษาศาสตร์ มหาวิทยาลัยฟาฏอนี | Faculty of Education, Fatoni University</div>
        <div class="badge">${filterText} | ข้อมูล ณ วันที่ ${dateStr} (รวม ${students.length} คน)</div>
      </div>
      <table>
        <thead>
          <tr>
            <th style="width:30px;">#</th>
            <th style="width:90px;">รหัสนักศึกษา</th>
            <th>ชื่อ-นามสกุล</th>
            <th style="width:40px;">เพศ</th>
            <th>สาขาวิชา</th>
            <th style="width:45px;">ชั้นปี</th>
            <th style="width:65px;">ชั่วโมงสะสม</th>
            <th style="width:75px;">สถานะ</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
      <div class="footer">
        <div class="sign-box">
          <p style="margin-top:40px;">ลงชื่อ......................................................</p>
          <p style="font-weight:bold;">(ผู้รับผิดชอบงานกิจกรรมนักศึกษา)</p>
          <p>วันที่ ${dateStr}</p>
        </div>
      </div>
      <script>
        window.onload = function() { window.print(); }
      </script>
    </body>
    </html>
  `);
  win.document.close();
}

// ----------------------------------------------------
// 2. ส่งออกรายงานกิจกรรม (Activity Attendees & Absentees)
// ----------------------------------------------------

export interface ActivityReportFilterMeta {
  gender: string;
  major: string;
  year: string;
}

// 2.1 Excel สำหรับกิจกรรม (Attended หรือ Absent)
export function exportActivityStudentsExcel(
  activity: Activity,
  students: Student[],
  type: 'attended' | 'absent',
  recordMap?: Map<string, AttendanceRecord>,
  filters?: ActivityReportFilterMeta
) {
  const isAttended = type === 'attended';
  const filterDesc = [
    `หมวด: ${activity.category}`,
    `ประเภท: ${activity.activityType || 'เลือก'}`,
    `ชั่วโมง: +${activity.hours} ชม.`,
    `วันที่จัด: ${activity.date}`,
    `สถานที่: ${activity.location || 'คณะศึกษาศาสตร์'}`,
    `กลุ่มนักศึกษา: ${isAttended ? 'ผู้เข้าร่วมกิจกรรม' : 'ผู้ไม่เข้าร่วม (ขาดกิจกรรม)'}`,
    `จำนวน: ${students.length} คน`,
    filters ? `ตัวกรอง: เพศ ${filters.gender} | สาขา ${filters.major} | ชั้นปี ${filters.year}` : '',
  ].filter(Boolean).join(' | ');

  const headers = [
    [`รายงานรายชื่อนักศึกษา${isAttended ? 'ที่เข้าร่วมกิจกรรม' : 'ที่ไม่เข้าร่วมกิจกรรม (ขาดกิจกรรม)'}`],
    [`กิจกรรม: ${activity.title} (${activity.id})`],
    ['คณะศึกษาศาสตร์ มหาวิทยาลัยฟาฏอนี'],
    [filterDesc],
    [],
    isAttended
      ? ['ลำดับ', 'รหัสนักศึกษา', 'ชื่อ-นามสกุล', 'เพศ', 'สาขาวิชา', 'ชั้นปี', 'รอบเช็คอิน', 'ชั่วโมงที่ได้รับ', 'เวลาที่บันทึก']
      : ['ลำดับ', 'รหัสนักศึกษา', 'ชื่อ-นามสกุล', 'เพศ', 'สาขาวิชา', 'ชั้นปี', 'ปีการศึกษา', 'สถานะ'],
  ];

  const rows = students.map((s, idx) => {
    if (isAttended) {
      const rec = recordMap?.get(s.studentId);
      return [
        idx + 1,
        s.studentId,
        s.name,
        s.gender || 'ไม่ระบุ',
        s.major,
        `ปี ${s.yearLevel}`,
        rec?.checkInType === 'IN' ? 'เข้า (IN)' : rec?.checkInType === 'OUT' ? 'ออก (OUT)' : 'ปกติ (Single)',
        `+${rec?.hoursEarned ?? activity.hours} ชม.`,
        rec?.dateRecorded || activity.date,
      ];
    } else {
      return [
        idx + 1,
        s.studentId,
        s.name,
        s.gender || 'ไม่ระบุ',
        s.major,
        `ปี ${s.yearLevel}`,
        s.academicYear,
        'ไม่เข้าร่วม / ขาด',
      ];
    }
  });

  const ws = XLSX.utils.aoa_to_sheet([...headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, isAttended ? 'ผู้เข้าร่วม' : 'ผู้ไม่เข้าร่วม');
  const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const filename = `${activity.id}_${isAttended ? 'ผู้เข้าร่วม' : 'ผู้ไม่เข้าร่วม'}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  triggerDownload(blob, filename);
}

// 2.2 Word สำหรับกิจกรรม
export function exportActivityStudentsWord(
  activity: Activity,
  students: Student[],
  type: 'attended' | 'absent',
  recordMap?: Map<string, AttendanceRecord>,
  filters?: ActivityReportFilterMeta
) {
  const isAttended = type === 'attended';
  const dateStr = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
  const filterDesc = filters ? `เพศ: ${filters.gender} | สาขา: ${filters.major} | ชั้นปี: ${filters.year}` : '';

  const rowsHtml = students.map((s, i) => {
    if (isAttended) {
      const rec = recordMap?.get(s.studentId);
      return `
        <tr>
          <td style="text-align:center;">${i + 1}</td>
          <td style="font-family:monospace;text-align:center;">${s.studentId}</td>
          <td>${s.name}</td>
          <td style="text-align:center;">${s.gender}</td>
          <td>${s.major}</td>
          <td style="text-align:center;">ปี ${s.yearLevel}</td>
          <td style="text-align:center;">${rec?.checkInType || 'ปกติ'}</td>
          <td style="text-align:center;font-weight:bold;color:#0070f3;">+${rec?.hoursEarned ?? activity.hours}</td>
        </tr>
      `;
    } else {
      return `
        <tr>
          <td style="text-align:center;">${i + 1}</td>
          <td style="font-family:monospace;text-align:center;">${s.studentId}</td>
          <td>${s.name}</td>
          <td style="text-align:center;">${s.gender}</td>
          <td>${s.major}</td>
          <td style="text-align:center;">ปี ${s.yearLevel}</td>
          <td style="text-align:center;color:#e11d48;font-weight:bold;">ไม่เข้าร่วม / ขาด</td>
        </tr>
      `;
    }
  }).join('');

  const html = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>${activity.title} - ${isAttended ? 'ผู้เข้าร่วม' : 'ผู้ไม่เข้าร่วม'}</title>
    <style>
      body { font-family: 'TH Sarabun New', 'Sarabun', Tahoma, sans-serif; font-size: 14pt; line-height: 1.3; }
      h2 { text-align: center; margin: 0; padding: 0; font-size: 17pt; }
      h3 { text-align: center; margin: 2px 0; padding: 0; font-size: 15pt; color: #0070f3; }
      p.meta { text-align: center; font-size: 12pt; color: #555; margin-bottom: 15px; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #444; padding: 6px 8px; font-size: 12pt; }
      th { background-color: #f1f5f9; font-weight: bold; text-align: center; }
    </style>
    </head>
    <body>
      <h2>รายชื่อนักศึกษา${isAttended ? 'ที่เข้าร่วมกิจกรรม' : 'ที่ไม่เข้าร่วมกิจกรรม (ขาดกิจกรรม)'}</h2>
      <h3>${activity.title}</h3>
      <p class="meta">
        หมวด: ${activity.category} | ประเภท: ${activity.activityType || 'เลือก'} (+${activity.hours} ชม.) | วันที่: ${activity.date}<br/>
        ${filterDesc ? filterDesc + ' | ' : ''}ยอดรวม: ${students.length} คน | ข้อมูล ณ วันที่ ${dateStr}
      </p>
      <table>
        <thead>
          <tr>
            <th style="width:35px;">ลำดับ</th>
            <th style="width:95px;">รหัสนักศึกษา</th>
            <th>ชื่อ-นามสกุล</th>
            <th style="width:45px;">เพศ</th>
            <th>สาขาวิชา</th>
            <th style="width:45px;">ชั้นปี</th>
            ${isAttended ? '<th style="width:60px;">รอบ</th><th style="width:50px;">ชั่วโมง</th>' : '<th style="width:100px;">สถานะ</th>'}
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
      <div style="margin-top: 40px; float: right; width: 250px; text-align: center;">
        <p>ลงชื่อ......................................................</p>
        <p>(ผู้รับผิดชอบโครงการ/กิจกรรม)</p>
        <p>วันที่.........เดือน.....................พ.ศ...........</p>
      </div>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff' + html], { type: 'application/msword;charset=utf-8' });
  const filename = `${activity.id}_${isAttended ? 'ผู้เข้าร่วม' : 'ผู้ไม่เข้าร่วม'}_${new Date().toISOString().slice(0, 10)}.doc`;
  triggerDownload(blob, filename);
}

// 2.3 PDF สำหรับกิจกรรม (Printable Window)
export function exportActivityStudentsPdf(
  activity: Activity,
  students: Student[],
  type: 'attended' | 'absent',
  recordMap?: Map<string, AttendanceRecord>,
  filters?: ActivityReportFilterMeta
) {
  const isAttended = type === 'attended';
  const dateStr = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
  const filterDesc = filters ? `เพศ: ${filters.gender} | สาขา: ${filters.major} | ชั้นปี: ${filters.year}` : '';

  const rowsHtml = students.map((s, i) => {
    if (isAttended) {
      const rec = recordMap?.get(s.studentId);
      return `
        <tr>
          <td style="text-align:center;">${i + 1}</td>
          <td style="font-family:monospace;text-align:center;font-weight:bold;">${s.studentId}</td>
          <td>${s.name}</td>
          <td style="text-align:center;">${s.gender}</td>
          <td>${s.major}</td>
          <td style="text-align:center;">ปี ${s.yearLevel}</td>
          <td style="text-align:center;">${rec?.checkInType || 'ปกติ'}</td>
          <td style="text-align:center;font-weight:bold;color:#0070f3;">+${rec?.hoursEarned ?? activity.hours}</td>
        </tr>
      `;
    } else {
      return `
        <tr>
          <td style="text-align:center;">${i + 1}</td>
          <td style="font-family:monospace;text-align:center;font-weight:bold;">${s.studentId}</td>
          <td>${s.name}</td>
          <td style="text-align:center;">${s.gender}</td>
          <td>${s.major}</td>
          <td style="text-align:center;">ปี ${s.yearLevel}</td>
          <td style="text-align:center;color:#e11d48;font-weight:bold;">ไม่เข้าร่วม / ขาด</td>
        </tr>
      `;
    }
  }).join('');

  const win = window.open('', '_blank');
  if (!win) {
    alert('กรุณาอนุญาตป๊อปอัปเพื่อเปิดหน้าต่างพิมพ์รายงาน');
    return;
  }

  win.document.write(`
    <!DOCTYPE html>
    <html lang="th">
    <head>
      <meta charset="utf-8">
      <title>${activity.title} - ${isAttended ? 'ผู้เข้าร่วม' : 'ผู้ไม่เข้าร่วม'}</title>
      <style>
        @page { size: A4 portrait; margin: 1.5cm; }
        body { font-family: 'Sarabun', 'TH Sarabun New', sans-serif; font-size: 12px; color: #1e293b; line-height: 1.4; margin: 0; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid ${isAttended ? '#0070f3' : '#e11d48'}; padding-bottom: 12px; margin-bottom: 16px; }
        .logo-text { font-size: 17px; font-weight: 800; color: #0f172a; }
        .act-title { font-size: 15px; font-weight: 700; color: ${isAttended ? '#0070f3' : '#e11d48'}; margin-top: 4px; }
        .sub-text { font-size: 11px; color: #64748b; margin-top: 4px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; font-size: 11px; }
        th { background-color: #f8fafc; font-weight: 700; text-align: center; }
        .footer { margin-top: 30px; display: flex; justify-content: flex-end; page-break-inside: avoid; }
        .sign-box { width: 220px; text-align: center; }
        @media print {
          body { padding: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="margin-bottom: 15px; text-align: right;">
        <button onclick="window.print()" style="padding: 8px 16px; background:${isAttended ? '#0070f3' : '#e11d48'}; color:#fff; border:none; border-radius:8px; font-weight:bold; cursor:pointer;">
          🖨️ สั่งพิมพ์ / บันทึกเป็น PDF
        </button>
      </div>
      <div class="header">
        <div class="logo-text">รายชื่อนักศึกษา${isAttended ? 'ที่เข้าร่วมกิจกรรม' : 'ที่ไม่เข้าร่วมกิจกรรม (ขาดกิจกรรม)'}</div>
        <div class="act-title">${activity.title} (${activity.id})</div>
        <div class="sub-text">
          หมวด: ${activity.category} | ประเภท: ${activity.activityType || 'เลือก'} | ชั่วโมง: +${activity.hours} ชม. | วันที่: ${activity.date}<br/>
          ${filterDesc ? filterDesc + ' | ' : ''}จำนวน: ${students.length} คน | ข้อมูล ณ วันที่ ${dateStr}
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th style="width:30px;">#</th>
            <th style="width:90px;">รหัสนักศึกษา</th>
            <th>ชื่อ-นามสกุล</th>
            <th style="width:40px;">เพศ</th>
            <th>สาขาวิชา</th>
            <th style="width:45px;">ชั้นปี</th>
            ${isAttended ? '<th style="width:50px;">รอบ</th><th style="width:50px;">ชั่วโมง</th>' : '<th style="width:90px;">สถานะ</th>'}
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
      <div class="footer">
        <div class="sign-box">
          <p style="margin-top:40px;">ลงชื่อ......................................................</p>
          <p style="font-weight:bold;">(ผู้รับผิดชอบโครงการ/กิจกรรม)</p>
          <p>วันที่ ${dateStr}</p>
        </div>
      </div>
      <script>
        window.onload = function() { window.print(); }
      </script>
    </body>
    </html>
  `);
  win.document.close();
}
