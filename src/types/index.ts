export interface Student {
  studentId: string;
  name: string;
  gender: 'ชาย' | 'หญิง' | string;
  major: string;        // เช่น อิสลามศึกษา, การศึกษาปฐมวัย, ภาษาอังกฤษ ฯลฯ
  academicYear: string; // เช่น 2569, 2568, 2567, 2566
  yearLevel: number;    // ชั้นปี 1, 2, 3, 4
}

export type ActivityCategory = 
  | 'คณะ' 
  | 'สาขาวิชา' 
  | 'สโมสรนักศึกษา' 
  | 'จิตอาสา/บำเพ็ญประโยชน์' 
  | 'เสริมทักษะวิชาชีพ'
  | string;

export type ActivityType = 'บังคับ' | 'เลือก';

export interface Activity {
  id: string;
  title: string;
  category: ActivityCategory;
  activityType?: ActivityType; // บังคับ หรือ เลือก
  hours: number;
  date: string;         // YYYY-MM-DD or formatted date string
  academicYear: string; // เช่น 2569
  location: string;
  description?: string;
  capacity?: number;    // จำนวนรับสูงสุด (Max capacity)
  checkInMode?: 'SINGLE' | 'IN_OUT'; // รอบเดียว หรือสองรอบ เข้า/ออก
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  activityId: string;
  activityTitle: string;
  category: string;
  activityType?: ActivityType;
  hoursEarned: number;
  dateRecorded: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  checkInType?: 'IN' | 'OUT' | 'SINGLE';
  inTime?: string;
  outTime?: string;
}

export interface StudentSummary {
  student: Student;
  totalHours: number;
  hoursByCategory: Record<string, number>;
  records: AttendanceRecord[];
}

export type UserRole = 'superadmin' | 'staff' | 'student';
