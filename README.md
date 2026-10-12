# ระบบบันทึกชั่วโมงกิจกรรมนักศึกษา (Student Activity Hour Tracker)

ระบบเว็บบันทึกและตรวจสอบชั่วโมงกิจกรรมสำหรับนักศึกษา รองรับนักศึกษา 1,000+ คนต่อปีการศึกษา พร้อมระบบแอดมินสำหรับจัดกิจกรรม เช็คชื่อ และส่งออกรายงานสรุปผล (Excel) เชื่อมต่อกับ **Google Sheets** และพร้อม Deploy บน **Vercel**

---

## 🌟 ฟีเจอร์หลัก (Key Features)

### 1. ฝั่งนักศึกษา (Student Portal)
- 🔍 ค้นหาด้วยรหัสนักศึกษา (เช่น `6601001`, `6701001`)
- 📊 แดชบอร์ดสรุปชั่วโมงสะสมรวม และ Progress Bar เทียบกับเกณฑ์บังคับขั้นต่ำ
- 🏷️ สรุปชั่วโมงแยกตามหมวดกิจกรรม:
  - หมวดมหาวิทยาลัย
  - หมวดคณะ/สาขาวิชา
  - หมวดบำเพ็ญประโยชน์/จิตอาสา
  - หมวดส่งเสริมวิชาการ/วิชาชีพ
- 📜 ประวัติการเข้าร่วมกิจกรรมย้อนหลัง พร้อมสถานะการอนุมัติ
- 📥 **ดาวน์โหลดใบบันทึกผลกิจกรรมส่วนบุคคล (Excel Transcript)** ได้ทันที

### 2. ฝั่งแอดมิน/อาจารย์ (Admin Portal)
- ➕ **สร้างกิจกรรมใหม่:** กำหนดชื่อกิจกรรม, หมวดหมู่, วันที่จัด, และ**จำนวนชั่วโมงที่ได้รับ**
- 📋 **ระบบเช็คชื่อ/ให้ชั่วโมง (Bulk Check-in):** คัดลอกรหัสนักศึกษาจาก Excel หรือเครื่องสแกนบาร์โค้ดมาวางเพื่อบันทึกชั่วโมงพร้อมกันหลายคน
- 📤 **ระบบสรุปผลและส่งออกรายงาน (Export Reports):**
  - **สรุปผลนักศึกษาทั้งหมด**
  - **สรุปผลแยกรายชั้นปี** (ปี 1, ปี 2, ปี 3, ปี 4)
  - **สรุปผลแยกรายสาขาวิชา** (เช่น วิทยาการคอมพิวเตอร์, เทคโนโลยีสารสนเทศ)
  - คำนวณสรุปชั่วโมงแต่ละหมวด และเช็คสถานะผ่าน/ไม่ผ่านเกณฑ์สะสมให้อัตโนมัติ

---

## 📊 โครงสร้างตาราง Google Sheets (Sheet Structure)

สร้าง Google Spreadsheet ใหม่ 1 ไฟล์ โดยตั้งชื่อแท็บ/แผ่นงาน (Worksheet) 3 แผ่น ดังนี้:

### 1. แผ่นงาน `Students`
| StudentID | Name | Major | AcademicYear | YearLevel |
|---|---|---|---|---|
| 6601001 | สมชาย มุ่งมั่น | วิทยาการคอมพิวเตอร์ | 2566 | 2 |
| 6701001 | กานดา ใจดี | วิทยาการคอมพิวเตอร์ | 2567 | 1 |

### 2. แผ่นงาน `Activities`
| ID | Title | Category | Hours | Date | AcademicYear | Location |
|---|---|---|---|---|---|---|
| ACT-001 | ปฐมนิเทศนักศึกษาใหม่ | มหาวิทยาลัย | 6 | 2024-06-15 | 2567 | หอประชุมใหญ่ |

### 3. แผ่นงาน `Attendance`
| ID | StudentID | ActivityID | ActivityTitle | Category | HoursEarned | DateRecorded | Status |
|---|---|---|---|---|---|---|---|
| REC-1 | 6601001 | ACT-002 | อบรมสัมมนา AI | ส่งเสริมวิชาการ/วิชาชีพ | 3 | 2024-07-20 | APPROVED |

---

## 🚀 วิธีการ Deploy ขึ้น GitHub และ Vercel

### ขั้นตอนที่ 1: เตรียม Git Repository และขึ้น GitHub
1. สร้าง New Repository บน [GitHub.com](https://github.com)
2. รันคำสั่งใน Terminal:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Student Activity Tracker"
   git branch -M main
   git remote add origin https://github.com/USERNAME/REPO_NAME.git
   git push -u origin main
   ```

### ขั้นตอนที่ 2: Deploy บน Vercel
1. ไปที่ [Vercel.com](https://vercel.com) แล้วล็อกอินด้วย GitHub
2. กดปุ่ม **"Add New Project"** -> เลือก Repository ที่เพิ่ง Push ขึ้นไป
3. ตั้งค่า **Environment Variables** ในหน้า Vercel (นำมาจาก Google Service Account):
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_PRIVATE_KEY`
   - `GOOGLE_SHEET_ID`
4. กด **Deploy** เว็บไซต์จะออนไลน์ทันที!

> **หมายเหตุ:** หากยังไม่ได้ใส่ Environment Variables ระบบจะทำงานในโหมด **Mock Data อัตโนมัติ** ทำให้สามารถเปิดทดสอบระบบ หน้าตาเว็บ และการ Export Excel ได้ทันทีโดยไม่ Error
