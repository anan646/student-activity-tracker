'use client';

import { useState } from 'react';
import { Search, Award, Calendar, CheckCircle2, AlertCircle, Download, BookOpen, Clock, HeartHandshake, Briefcase } from 'lucide-react';
import { StudentSummary } from '@/types';

export default function StudentPortal() {
  const [studentId, setStudentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<StudentSummary | null>(null);

  const TARGET_HOURS = 60; // เกณฑ์ชั่วโมงสะสมขั้นต่ำตลอดหลักสูตร

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/students?studentId=${encodeURIComponent(studentId.trim())}`);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'เกิดข้อผิดพลาดในการค้นหา');
      }

      setData(json);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ');
      }
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'มหาวิทยาลัย':
        return <Award className="w-5 h-5 text-indigo-500" />;
      case 'คณะ/สาขา':
        return <Briefcase className="w-5 h-5 text-blue-500" />;
      case 'บำเพ็ญประโยชน์/จิตอาสา':
        return <HeartHandshake className="w-5 h-5 text-emerald-500" />;
      case 'ส่งเสริมวิชาการ/วิชาชีพ':
        return <BookOpen className="w-5 h-5 text-amber-500" />;
      default:
        return <Clock className="w-5 h-5 text-slate-500" />;
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* ส่วนหัว Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800">
          ตรวจสอบชั่วโมงกิจกรรมนักศึกษา
        </h1>
        <p className="text-slate-500 mt-2 text-sm sm:text-base">
          กรอกรหัสนักศึกษาเพื่อดูชั่วโมงกิจกรรมสะสม ประวัติการเข้าร่วม และดาวน์โหลดใบสรุปผล
        </p>
      </div>

      {/* กล่องค้นหา */}
      <div className="bg-white rounded-2xl shadow-sm border p-6 mb-8 max-w-xl mx-auto">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="กรอกรหัสนักศึกษา เช่น 6601001"
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 font-medium text-sm sm:text-base"
              required
            />
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition shadow-md disabled:bg-indigo-300 flex items-center gap-2 cursor-pointer"
          >
            {loading ? (
              <span className="inline-block animate-spin">⏳</span>
            ) : (
              'ค้นหา'
            )}
          </button>
        </form>

        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl flex items-center gap-2 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-3 text-xs text-slate-400 text-center">
          * ทดลองค้นหาด้วยรหัสนักศึกษาตัวอย่าง: <span className="text-indigo-600 font-mono cursor-pointer hover:underline" onClick={() => setStudentId('6601001')}>6601001</span> หรือ <span className="text-indigo-600 font-mono cursor-pointer hover:underline" onClick={() => setStudentId('6701001')}>6701001</span>
        </div>
      </div>

      {/* ผลลัพธ์ข้อมูลนักศึกษา */}
      {data && (
        <div className="space-y-6">
          {/* การ์ดข้อมูลส่วนตัวและภาพรวม */}
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
              <div>
                <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 mb-1">
                  รหัสนักศึกษา {data.student.studentId}
                </span>
                <h2 className="text-xl font-bold text-slate-800">{data.student.name}</h2>
                <p className="text-sm text-slate-500">
                  สาขาวิชา{data.student.major} • ชั้นปีที่ {data.student.yearLevel} (ปีการศึกษา {data.student.academicYear})
                </p>
              </div>

              <a
                href={`/api/export?type=student&studentId=${data.student.studentId}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>ดาวน์โหลดใบสรุปผล (Excel)</span>
              </a>
            </div>

            {/* แสดงชั่วโมงสะสมรวม Progress */}
            <div className="mt-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-slate-700">ความคืบหน้าชั่วโมงกิจกรรมสะสม</span>
                <span className="text-sm font-bold text-indigo-600">
                  {data.totalHours} / {TARGET_HOURS} ชั่วโมง ({Math.min(100, Math.round((data.totalHours / TARGET_HOURS) * 100))}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden">
                <div
                  className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (data.totalHours / TARGET_HOURS) * 100)}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span>
                  {data.totalHours >= TARGET_HOURS ? (
                    <span className="text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> ผ่านเกณฑ์ชั่วโมงกิจกรรมขั้นต่ำแล้ว
                    </span>
                  ) : (
                    <span>ยังขาดอีก {TARGET_HOURS - data.totalHours} ชั่วโมง จึงจะครบตามเกณฑ์</span>
                  )}
                </span>
                <span>เกณฑ์บังคับขั้นต่ำ {TARGET_HOURS} ชม.</span>
              </div>
            </div>

            {/* หมวดหมู่กิจกรรมย่อย */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
              {Object.entries(data.hoursByCategory).map(([cat, hrs]) => (
                <div key={cat} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-1.5 mb-1">
                    {getCategoryIcon(cat)}
                    <span className="text-xs text-slate-600 font-medium truncate">{cat}</span>
                  </div>
                  <p className="text-lg font-bold text-slate-800">{hrs} <span className="text-xs font-normal text-slate-500">ชม.</span></p>
                </div>
              ))}
            </div>
          </div>

          {/* รายการประวัติกิจกรรม */}
          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
            <div className="p-5 border-b flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                <span>ประวัติกิจกรรมที่เข้าร่วม ({data.records.length} กิจกรรม)</span>
              </h3>
            </div>

            {data.records.length === 0 ? (
              <div className="p-8 text-center text-slate-400">ยังไม่มีข้อมูลการเข้าร่วมกิจกรรม</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 border-b text-xs font-semibold text-slate-500 uppercase">
                    <tr>
                      <th className="py-3 px-4">วันที่</th>
                      <th className="py-3 px-4">ชื่อกิจกรรม</th>
                      <th className="py-3 px-4">หมวดกิจกรรม</th>
                      <th className="py-3 px-4 text-center">ชั่วโมงที่ได้รับ</th>
                      <th className="py-3 px-4 text-center">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.records.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50/50">
                        <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-500">
                          {rec.dateRecorded}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-800">
                          {rec.activityTitle}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="inline-block px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-600">
                            {rec.category}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-indigo-600 whitespace-nowrap">
                          +{rec.hoursEarned} ชม.
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {rec.status === 'APPROVED' ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3.5 h-3.5" /> อนุมัติแล้ว
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                              รอตรวจสอบ
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
