'use client';

import { useState, useEffect } from 'react';
import { 
  PlusCircle, 
  UserCheck, 
  FileSpreadsheet, 
  Filter, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Users,
  Search
} from 'lucide-react';
import { Student, Activity } from '@/types';

export default function AdminPortal() {
  const [tab, setTab] = useState<'create_activity' | 'attendance' | 'reports'>('reports');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // ฟอร์มสร้างกิจกรรม
  const [activityForm, setActivityForm] = useState({
    title: '',
    category: 'มหาวิทยาลัย',
    hours: 3,
    date: '2024-10-01',
    academicYear: '2567',
    location: '',
    description: '',
  });

  // ฟอร์มเช็คชื่อ
  const [selectedActivityId, setSelectedActivityId] = useState('');
  const [studentIdsInput, setStudentIdsInput] = useState('');

  // ตัวกรองรายงาน
  const [filterType, setFilterType] = useState<'all' | 'year' | 'major'>('all');
  const [selectedYear, setSelectedYear] = useState('1');
  const [selectedMajor, setSelectedMajor] = useState('วิทยาการคอมพิวเตอร์');

  // โหลดข้อมูลกิจกรรมและนักศึกษา
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const res = await fetch('/api/students');
      const data = await res.json();
      if (data.activities) setActivities(data.activities);
      if (data.students) setStudents(data.students);
      if (data.activities && data.activities.length > 0) {
        setSelectedActivityId(data.activities[0].id);
      }
    } catch (err) {
      console.error('Failed to load initial admin data', err);
    }
  };

  // บันทึกกิจกรรมใหม่
  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_activity',
          ...activityForm,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'บันทึกไม่สำเร็จ');

      setMessage({ text: 'สร้างกิจกรรมและบันทึกลง Google Sheets เรียบร้อยแล้ว!', type: 'success' });
      setActivityForm({
        title: '',
        category: 'มหาวิทยาลัย',
        hours: 3,
        date: new Date().toISOString().split('T')[0],
        academicYear: '2567',
        location: '',
        description: '',
      });
      fetchInitialData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setMessage({ text: err.message, type: 'error' });
      } else {
        setMessage({ text: 'เกิดข้อผิดพลาดในการบันทึกกิจกรรม', type: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  // บันทึกการเข้าร่วมกิจกรรม
  const handleRecordAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const activity = activities.find((a) => a.id === selectedActivityId);
    if (!activity) {
      setMessage({ text: 'กรุณาเลือกกิจกรรม', type: 'error' });
      setLoading(false);
      return;
    }

    // แยกและตัดช่องว่างรหัสนักศึกษา (รองรับขึ้นบรรทัดใหม่ หรือเว้นวรรค หรือจุลภาค)
    const rawIds = studentIdsInput
      .split(/[\n, ]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (rawIds.length === 0) {
      setMessage({ text: 'กรุณากรอกรหัสนักศึกษาอย่างน้อย 1 คน', type: 'error' });
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'record_attendance',
          studentIds: rawIds,
          activity,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'บันทึกการเข้าร่วมไม่สำเร็จ');

      setMessage({
        text: `บันทึกการเข้าร่วมและให้ชั่วโมงกิจกรรมสำเร็จ (${result.successCount} คน)`,
        type: 'success',
      });
      setStudentIdsInput('');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setMessage({ text: err.message, type: 'error' });
      } else {
        setMessage({ text: 'เกิดข้อผิดพลาดในการบันทึกชั่วโมงกิจกรรม', type: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  // ดาวน์โหลดรายงานสรุป
  const handleDownloadReport = () => {
    let url = '/api/export?type=all';
    if (filterType === 'year') {
      url = `/api/export?type=year&yearLevel=${selectedYear}`;
    } else if (filterType === 'major') {
      url = `/api/export?type=major&major=${encodeURIComponent(selectedMajor)}`;
    }
    window.open(url, '_blank');
  };

  const majors = Array.from(new Set(students.map((s) => s.major)));

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* ส่วนหัว */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800">
            ระบบจัดการกิจกรรมและออกรายงาน (Admin)
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            จัดกิจกรรม บันทึกชั่วโมง นศ. และส่งออกรายงานสรุปผล (Sync ข้อมูลตรงกับ Google Sheets)
          </p>
        </div>

        {/* แท็บเมนู */}
        <div className="flex bg-slate-200/70 p-1 rounded-xl text-sm font-medium w-full sm:w-auto">
          <button
            onClick={() => { setTab('reports'); setMessage(null); }}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg transition ${
              tab === 'reports' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>สรุปผล & Export</span>
          </button>
          <button
            onClick={() => { setTab('attendance'); setMessage(null); }}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg transition ${
              tab === 'attendance' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>เช็คชื่อ/ให้ชั่วโมง</span>
          </button>
          <button
            onClick={() => { setTab('create_activity'); setMessage(null); }}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg transition ${
              tab === 'create_activity' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>สร้างกิจกรรม</span>
          </button>
        </div>
      </div>

      {/* แจ้งเตือนข้อความ Success / Error */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* แท็บที่ 1: สรุปผลและ Export รายงาน */}
      {tab === 'reports' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-indigo-600" />
              <span>ตัวกรองและส่งออกรายงานสรุปผล (Excel)</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  รูปแบบการสรุปรายงาน
                </label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as 'all' | 'year' | 'major')}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="all">นักศึกษาทั้งหมด (ทุกชั้นปี/ทุกสาขา)</option>
                  <option value="year">สรุปผลแยกตามชั้นปี</option>
                  <option value="major">สรุปผลแยกตามสาขาวิชา</option>
                </select>
              </div>

              {filterType === 'year' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    เลือกชั้นปี
                  </label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="1">ชั้นปีที่ 1</option>
                    <option value="2">ชั้นปีที่ 2</option>
                    <option value="3">ชั้นปีที่ 3</option>
                    <option value="4">ชั้นปีที่ 4</option>
                  </select>
                </div>
              )}

              {filterType === 'major' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    เลือกสาขาวิชา
                  </label>
                  <select
                    value={selectedMajor}
                    onChange={(e) => setSelectedMajor(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {majors.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <button
              onClick={handleDownloadReport}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition shadow-md cursor-pointer"
            >
              <FileSpreadsheet className="w-5 h-5" />
              <span>ดาวน์โหลดไฟล์สรุปผล Excel (.xlsx)</span>
            </button>
          </div>

          {/* รายชื่อกิจกรรมล่าสุดในระบบ */}
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                <span>กิจกรรมทั้งหมดในระบบ ({activities.length} รายการ)</span>
              </span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b text-xs font-semibold text-slate-500 uppercase">
                  <tr>
                    <th className="py-3 px-4">รหัส</th>
                    <th className="py-3 px-4">ชื่อกิจกรรม</th>
                    <th className="py-3 px-4">หมวดหมู่</th>
                    <th className="py-3 px-4">วันที่จัด</th>
                    <th className="py-3 px-4 text-center">ชั่วโมง</th>
                    <th className="py-3 px-4">สถานที่</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activities.map((act) => (
                    <tr key={act.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-mono text-xs text-slate-500">{act.id}</td>
                      <td className="py-3 px-4 font-medium text-slate-800">{act.title}</td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-600">
                          {act.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500">{act.date}</td>
                      <td className="py-3 px-4 text-center font-bold text-indigo-600">{act.hours} ชม.</td>
                      <td className="py-3 px-4 text-xs text-slate-500">{act.location}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* แท็บที่ 2: บันทึกการเข้าร่วม (Attendance / Check-in) */}
      {tab === 'attendance' && (
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-2">
            <UserCheck className="w-5 h-5 text-indigo-600" />
            <span>เช็คชื่อและให้ชั่วโมงกิจกรรมแก่นักศึกษา</span>
          </h2>
          <p className="text-xs text-slate-500 mb-6">
            เลือกรอบกิจกรรม และนำรหัสนักศึกษามาวาง (สามารถคัดลอกจาก Excel หรือสแกนบาร์โค้ด/QR เข้ามาได้)
          </p>

          <form onSubmit={handleRecordAttendance} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                เลือกกิจกรรมที่จัดขึ้น *
              </label>
              <select
                value={selectedActivityId}
                onChange={(e) => setSelectedActivityId(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                required
              >
                {activities.map((act) => (
                  <option key={act.id} value={act.id}>
                    [{act.id}] {act.title} ({act.hours} ชั่วโมง - {act.category})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                รหัสนักศึกษาที่เข้าร่วม (คัดลอกมาวางได้หลายคน เช่น ขึ้นบรรทัดใหม่ หรือเว้นวรรค) *
              </label>
              <textarea
                rows={6}
                value={studentIdsInput}
                onChange={(e) => setStudentIdsInput(e.target.value)}
                placeholder="6601001&#10;6601002&#10;6601003"
                className="w-full p-3 rounded-xl border border-slate-200 font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                required
              />
              <p className="text-xs text-slate-400 mt-1">
                * ระบบจะทำการแมปรหัสและคำนวณชั่วโมงพร้อมบันทึกลงแผ่นงาน Google Sheets โดยอัตโนมัติ
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition shadow-md disabled:bg-indigo-300 cursor-pointer flex items-center gap-2"
            >
              {loading ? 'กำลังบันทึกลง Google Sheets...' : 'บันทึกการเข้าร่วมและให้ชั่วโมง'}
            </button>
          </form>
        </div>
      )}

      {/* แท็บที่ 3: สร้างกิจกรรมใหม่ */}
      {tab === 'create_activity' && (
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-2">
            <PlusCircle className="w-5 h-5 text-indigo-600" />
            <span>สร้างกิจกรรมใหม่และระบุชั่วโมง</span>
          </h2>
          <p className="text-xs text-slate-500 mb-6">
            ข้อมูลกิจกรรมจะถูกบันทึกลงตาราง Google Sheets แผ่นงาน `Activities`
          </p>

          <form onSubmit={handleCreateActivity} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">ชื่อกิจกรรม *</label>
                <input
                  type="text"
                  value={activityForm.title}
                  onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })}
                  placeholder="เช่น สัมมนาเตรียมความพร้อมสู่การทำงาน"
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">หมวดกิจกรรม *</label>
                <select
                  value={activityForm.category}
                  onChange={(e) => setActivityForm({ ...activityForm, category: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="มหาวิทยาลัย">มหาวิทยาลัย</option>
                  <option value="คณะ/สาขา">คณะ/สาขา</option>
                  <option value="บำเพ็ญประโยชน์/จิตอาสา">บำเพ็ญประโยชน์/จิตอาสา</option>
                  <option value="ส่งเสริมวิชาการ/วิชาชีพ">ส่งเสริมวิชาการ/วิชาชีพ</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">จำนวนชั่วโมงที่ได้รับ *</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={activityForm.hours}
                  onChange={(e) => setActivityForm({ ...activityForm, hours: Number(e.target.value) })}
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">วันที่จัดกิจกรรม *</label>
                <input
                  type="date"
                  value={activityForm.date}
                  onChange={(e) => setActivityForm({ ...activityForm, date: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">ปีการศึกษา *</label>
                <input
                  type="text"
                  value={activityForm.academicYear}
                  onChange={(e) => setActivityForm({ ...activityForm, academicYear: e.target.value })}
                  placeholder="เช่น 2567"
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">สถานที่จัดกิจกรรม</label>
                <input
                  type="text"
                  value={activityForm.location}
                  onChange={(e) => setActivityForm({ ...activityForm, location: e.target.value })}
                  placeholder="เช่น อาคารเรียนรวม 3 ห้อง 301"
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">รายละเอียดกิจกรรมเพิ่มเติม</label>
                <textarea
                  rows={3}
                  value={activityForm.description}
                  onChange={(e) => setActivityForm({ ...activityForm, description: e.target.value })}
                  placeholder="ระบุวัตถุประสงค์ หรือหมายเหตุอื่นๆ"
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition shadow-md disabled:bg-indigo-300 cursor-pointer flex items-center gap-2"
            >
              {loading ? 'กำลังบันทึก...' : 'บันทึกกิจกรรมใหม่'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
