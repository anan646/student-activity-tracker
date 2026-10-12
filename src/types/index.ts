export interface Student {
  studentId: string;
  name: string;
  major: string;        // เช่น วิทยาการคอมพิวเตอร์, เทคโนโลยีสารสนเทศ
  academicYear: string; // เช่น 2567
  yearLevel: number;    // ชั้นปี เช่น 1, 2, 3, 4
}

export interface Activity {
  id: string;
  title: string;
  category: 'มหาวิทยาลัย' | 'คณะ/สาขา' | 'บำเพ็ญประโยชน์/จิตอาสา' | 'ส่งเสริมวิชาการ/วิชาชีพ';
  hours: number;
  date: string;         // YYYY-MM-DD
  academicYear: string; // เช่น 2567
  location: string;
  description?: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  activityId: string;
  activityTitle: string;
  category: string;
  hoursEarned: number;
  dateRecorded: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
}

export interface StudentSummary {
  student: Student;
  totalHours: number;
  hoursByCategory: Record<string, number>;
  records: AttendanceRecord[];
}
