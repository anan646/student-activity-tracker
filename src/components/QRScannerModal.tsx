'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Camera, X, CheckCircle2 } from 'lucide-react';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (studentId: string) => void;
}

export default function QRScannerModal({ isOpen, onClose, onScanSuccess }: QRScannerModalProps) {
  const [scannedId, setScannedId] = useState<string | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (!isOpen) {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
      }
      setScannedId(null);
      return;
    }

    // เริ่มทำงานตัวสแกนกล้อง
    const timer = setTimeout(() => {
      const scanner = new Html5QrcodeScanner(
        'qr-reader',
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          rememberLastUsedCamera: true,
        },
        false
      );

      scanner.render(
        (decodedText) => {
          // ดึงรหัสนักศึกษาจากการสแกน
          const cleanId = decodedText.trim();
          setScannedId(cleanId);
          onScanSuccess(cleanId);
          
          // มีเสียงสแกนสั้นๆ หรือเอฟเฟกต์
          if (navigator.vibrate) {
            navigator.vibrate(200);
          }
        },
        (error) => {
          // ข้าม error ระหว่างค้นหากล้อง
        }
      );

      scannerRef.current = scanner;
    }, 300);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
      }
    };
  }, [isOpen, onScanSuccess]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2 text-indigo-700 font-bold">
            <Camera className="w-5 h-5" />
            <span>สแกน QR Code นักศึกษา</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-200 text-slate-500 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-xs text-slate-500 text-center mb-4">
            หันกล้องมือถือ/แท็บเล็ตไปที่ QR Code รหัสนักศึกษาเพื่อเช็คชื่อเข้างานทันที
          </p>

          <div id="qr-reader" className="overflow-hidden rounded-2xl border" />

          {scannedId && (
            <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-center gap-2 text-emerald-800 font-semibold text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>สแกนสำเร็จ: รหัส {scannedId}</span>
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-50 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-semibold transition"
          >
            เสร็จสิ้น
          </button>
        </div>
      </div>
    </div>
  );
}
