'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, CheckCircle2, SwitchCamera, AlertCircle, Image as ImageIcon } from 'lucide-react';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (studentId: string) => void;
}

export default function QRScannerModal({ isOpen, onClose, onScanSuccess }: QRScannerModalProps) {
  const [scannedId, setScannedId] = useState<string | null>(null);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const qrCodeRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // เริ่มต้นค้นหากล้องทั้งหมดในเครื่อง
  useEffect(() => {
    if (!isOpen) {
      stopScanning();
      setScannedId(null);
      setErrorMsg(null);
      return;
    }

    const initScanner = async () => {
      try {
        setErrorMsg(null);
        // ค้นหากล้องที่เชื่อมต่ออยู่ทั้งหมด (มือถือ, แท็บเล็ต, เว็บบนคอมพิวเตอร์)
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          setCameras(devices);
          // เลือกกล้องหลัง (Back/Environment Camera) ก่อนถ้าเป็นมือถือ
          const backCam = devices.find(d => 
            d.label.toLowerCase().includes('back') || 
            d.label.toLowerCase().includes('rear') || 
            d.label.toLowerCase().includes('environment')
          );
          const chosenId = backCam ? backCam.id : devices[0].id;
          setSelectedCameraId(chosenId);
          startCamera(chosenId);
        } else {
          // หากเบราว์เซอร์ไม่อนุญาต list devices ให้สั่งเปิดด้วย default facingMode
          startCameraDefault();
        }
      } catch (err: unknown) {
        console.warn('Cannot enumerate cameras, attempting fallback facingMode:', err);
        startCameraDefault();
      }
    };

    const timer = setTimeout(initScanner, 300);
    return () => {
      clearTimeout(timer);
      stopScanning();
    };
  }, [isOpen]);

  const startCamera = async (cameraId: string) => {
    try {
      await stopScanning();
      const html5QrCode = new Html5Qrcode('qr-reader-custom');
      qrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        cameraId,
        {
          fps: 15,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        onQrCodeScanned,
        () => {} // ข้าม frame error
      );
      setIsScanning(true);
    } catch (err: unknown) {
      console.error('Error starting camera by ID:', err);
      // Fallback
      startCameraDefault();
    }
  };

  const startCameraDefault = async () => {
    try {
      await stopScanning();
      const html5QrCode = new Html5Qrcode('qr-reader-custom');
      qrCodeRef.current = html5QrCode;

      // พยายามเปิดกล้องหลัง ถ้าไม่ได้จะเปิดกล้องใดๆ ที่มี
      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 15,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        onQrCodeScanned,
        () => {}
      );
      setIsScanning(true);
    } catch (err: unknown) {
      console.error('Camera fallback failed:', err);
      try {
        // ลองเปิดกล้องหน้า (user facing)
        if (qrCodeRef.current) {
          await qrCodeRef.current.start(
            { facingMode: 'user' },
            { fps: 15, qrbox: { width: 250, height: 250 } },
            onQrCodeScanned,
            () => {}
          );
          setIsScanning(true);
        }
      } catch (finalErr: unknown) {
        const msg = finalErr instanceof Error ? finalErr.message : 'กรุณาอนุญาตให้เบราว์เซอร์เข้าถึงกล้องถ่ายรูป';
        setErrorMsg('ไม่สามารถเปิดกล้องได้: ' + msg);
        setIsScanning(false);
      }
    }
  };

  const stopScanning = async () => {
    if (qrCodeRef.current && isScanning) {
      try {
        await qrCodeRef.current.stop();
        qrCodeRef.current.clear();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      } finally {
        qrCodeRef.current = null;
        setIsScanning(false);
      }
    }
  };

  const onQrCodeScanned = (decodedText: string) => {
    const cleanId = decodedText.trim();
    setScannedId(cleanId);
    onScanSuccess(cleanId);

    // เสียง/สั่นเมื่อสแกนสำเร็จ
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(200);
    }
  };

  // สลับกล้อง (หน้า/หลัง/กล้องอื่น)
  const handleSwitchCamera = async () => {
    if (cameras.length <= 1) return;
    const currentIndex = cameras.findIndex(c => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCamId = cameras[nextIndex].id;
    setSelectedCameraId(nextCamId);
    await startCamera(nextCamId);
  };

  // รองรับการเลือกรูปถ่ายหรืออัปโหลดภาพ QR Code จากแกลเลอรี
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      try {
        const html5QrCode = qrCodeRef.current || new Html5Qrcode('qr-reader-custom');
        const decodedText = await html5QrCode.scanFile(file, true);
        onQrCodeScanned(decodedText);
      } catch (err) {
        setErrorMsg('ไม่พบ QR Code ในรูปภาพที่เลือก กรุณาลองใหม่อีกครั้ง');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2.5 text-indigo-700 font-bold">
            <div className="p-2 bg-indigo-100 rounded-xl">
              <Camera className="w-5 h-5 text-indigo-700" />
            </div>
            <div>
              <span className="text-base block">กล้องสแกน QR Code</span>
              <span className="text-[11px] font-normal text-slate-400">รองรับทุกอุปกรณ์ (มือถือ, แท็บเล็ต, คอมฯ)</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-200 text-slate-500 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {errorMsg ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs flex flex-col gap-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>เกิดข้อผิดพลาดในการเปิดกล้อง</span>
              </div>
              <p>{errorMsg}</p>
              <p className="text-slate-500">
                * กรุณาตรวจสอบว่าได้กดยินยอมให้สิทธิ์เข้าถึงกล้องถ่ายรูป (Camera Permission) ในเบราว์เซอร์แล้ว
              </p>
            </div>
          ) : (
            <>
              {/* กล่องแสดงผลภาพจากกล้อง */}
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-square border-2 border-indigo-500/30 flex items-center justify-center">
                <div id="qr-reader-custom" className="w-full h-full" />
                {!isScanning && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white/70 text-xs gap-2 bg-slate-900/90 p-4 text-center">
                    <span className="inline-block animate-spin text-2xl">⏳</span>
                    <span>กำลังเชื่อมต่อกล้องถ่ายรูป...</span>
                  </div>
                )}
              </div>

              {/* ปุ่มสลับกล้อง (หน้า/หลัง) */}
              {cameras.length > 1 && (
                <div className="mt-3 flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                  <span className="text-slate-500 font-medium">อุปกรณ์มี {cameras.length} กล้อง</span>
                  <button
                    type="button"
                    onClick={handleSwitchCamera}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg font-bold text-indigo-600 transition cursor-pointer shadow-sm"
                  >
                    <SwitchCamera className="w-3.5 h-3.5" />
                    <span>สลับกล้อง (หน้า/หลัง)</span>
                  </button>
                </div>
              )}

              {/* ผลลัพธ์เมื่อสแกนติด */}
              {scannedId && (
                <div className="mt-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-center gap-2.5 text-emerald-800 font-bold text-sm animate-in zoom-in-95">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>บันทึกรหัสสำเร็จ: {scannedId}</span>
                </div>
              )}
            </>
          )}

          {/* ทางเลือกเพิ่มเติม: อัปโหลดรูปภาพ QR จากอัลบั้ม */}
          <div className="mt-4 pt-4 border-t border-slate-100 text-center">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 font-medium py-1 px-2.5 rounded-lg hover:bg-slate-50 transition cursor-pointer"
            >
              <ImageIcon className="w-4 h-4 text-slate-400" />
              <span>หรือเลือกภาพถ่าย QR Code จากคลังภาพในเครื่อง</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t flex justify-between items-center">
          <span className="text-xs text-slate-400">สแกนต่อเนื่องได้ทันที</span>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 active:scale-95 text-white rounded-xl text-sm font-bold transition shadow-sm cursor-pointer"
          >
            เสร็จสิ้น
          </button>
        </div>
      </div>
    </div>
  );
}
