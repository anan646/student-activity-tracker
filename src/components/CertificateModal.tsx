'use client';

import { useRef } from 'react';
import QRCode from 'react-qr-code';
import { Award, Printer, X, CheckCircle2, ShieldCheck, Download } from 'lucide-react';
import { Student } from '@/types';

interface CertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student;
  totalHours: number;
}

export default function CertificateModal({
  isOpen,
  onClose,
  student,
  totalHours,
}: CertificateModalProps) {
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const currentDate = new Date().toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const certNumber = `FTU-ACT-${student.academicYear}-${student.studentId.slice(-4)}`;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full border border-slate-100 overflow-hidden my-auto animate-in zoom-in-95">
        {/* Header Action Bar (ไม่แสดงตอนพิมพ์) */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center print:hidden">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
            <Award className="w-5 h-5 text-amber-500" />
            <span>ใบรับรองกิจกรรมอิเล็กทรอนิกส์ (E-Certificate)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#0070f3] hover:bg-[#0060df] text-white font-bold text-xs rounded-xl transition shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์ / บันทึกเป็น PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Certificate Body (พิมพ์ได้สวยงามตามมาตรฐาน) */}
        <div
          ref={printAreaRef}
          className="p-8 sm:p-12 bg-gradient-to-b from-amber-50/20 via-white to-amber-50/10 relative text-center select-none"
        >
          {/* Decorative Outer Border */}
          <div className="border-4 border-double border-amber-600/30 rounded-2xl p-6 sm:p-10 relative bg-white/80">
            {/* Watermark / Logo Top */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full bg-gradient-to-tr from-amber-500 via-amber-600 to-yellow-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/20 mb-4">
              <Award className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>

            <p className="text-xs sm:text-sm font-bold tracking-widest text-amber-800 uppercase">
              คณะศึกษาศาสตร์ มหาวิทยาลัยฟาฏอนี • FACULTY OF EDUCATION, FTU
            </p>
            <p className="text-[11px] text-slate-400 font-medium">ฝ่ายพัฒนานักศึกษาและกิจกรรมเสริมหลักสูตร</p>

            <h1 className="text-xl sm:text-3xl font-black text-slate-900 mt-4 mb-2 tracking-tight">
              ใบประกาศนียบัตรรับรองชั่วโมงกิจกรรม
            </h1>

            <p className="text-xs text-slate-500 mb-6 font-medium">
              เอกสารรับรองการเข้าร่วมกิจกรรมพัฒนานักศึกษาตามเกณฑ์มาตรฐานคณะศึกษาศาสตร์
            </p>

            <div className="my-6 py-4 border-y border-amber-200/60 max-w-lg mx-auto">
              <p className="text-xs text-slate-500 mb-1">ขอมอบประกาศนียบัตรฉบับนี้ไว้เพื่อแสดงว่า</p>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-normal mb-1">
                {student.name}
              </h2>
              <p className="text-sm font-bold text-slate-700">
                รหัสนักศึกษา: <span className="font-mono text-[#0070f3]">{student.studentId}</span>
              </p>
              <p className="text-xs text-slate-600 mt-1">
                สาขาวิชา{student.major} • ชั้นปีที่ {student.yearLevel} (ปีการศึกษา {student.academicYear})
              </p>
            </div>

            <p className="text-xs sm:text-sm text-slate-700 max-w-xl mx-auto leading-relaxed mb-8">
              ได้เข้าร่วมกิจกรรมพัฒนานักศึกษาและสะสมชั่วโมงกิจกรรมครบถ้วนรวมทั้งสิ้น{' '}
              <strong className="text-amber-700 text-base font-black font-mono">{totalHours}</strong>{' '}
              ชั่วโมง {totalHours >= 60 ? '(ครบถ้วนตามเกณฑ์บังคับขั้นต่ำของคณะศึกษาศาสตร์)' : ''}
              <br />
              มีความมุ่งมั่น มีจิตสาธารณะ และร่วมสร้างสรรค์คุณประโยชน์แก่สังคม
            </p>

            {/* Signature & Verification Block */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-6 pt-6 border-t border-slate-100 text-xs">
              {/* QR Verification */}
              <div className="flex items-center gap-3 text-left">
                <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-sm">
                  <QRCode value={`https://edupass.ftu.ac.th/verify?id=${student.studentId}`} size={64} />
                </div>
                <div>
                  <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>e-Certificate Verified</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono">No: {certNumber}</p>
                  <p className="text-[10px] text-slate-400">ออกให้ ณ วันที่ {currentDate}</p>
                </div>
              </div>

              {/* Official Seal / Signature */}
              <div className="text-center sm:text-right">
                <div className="w-28 border-b border-slate-400 pb-1 mx-auto sm:ml-auto mb-1">
                  <span className="font-serif italic font-bold text-slate-800 text-sm">EDU Pass FTU</span>
                </div>
                <p className="text-[11px] font-bold text-slate-800">ฝ่ายพัฒนานักศึกษา คณะศึกษาศาสตร์</p>
                <p className="text-[10px] text-slate-400">Faculty of Education, Fatoni University</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
