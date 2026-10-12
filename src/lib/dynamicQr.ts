// ระบบสร้างและตรวจสอบ Dynamic Time-Based QR Code (ป้องกันการแคปหน้าจอส่งต่อ)

const SECRET_SALT = 'FTU_UNIPASS_2026';

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36).substring(0, 4);
}

// สร้าง Dynamic Payload สำหรับ QR Code (หมุนทุก 30 วินาที)
export function generateDynamicQrPayload(studentId: string): {
  payload: string;
  expiresInSeconds: number;
} {
  const now = Math.floor(Date.now() / 1000);
  const timeSlot = Math.floor(now / 30);
  const hash = simpleHash(`${studentId}:${timeSlot}:${SECRET_SALT}`);
  const expiresInSeconds = 30 - (now % 30);

  return {
    payload: `UNIPASS:${studentId}:${timeSlot}:${hash}`,
    expiresInSeconds,
  };
}

// ตรวจสอบความถูกต้องของ QR Code ที่สแกนได้
export function verifyQrPayload(scannedRaw: string): {
  valid: boolean;
  studentId: string;
  error?: string;
  isDynamic: boolean;
} {
  const trimmed = scannedRaw.trim();

  // กรณีเป็น Dynamic QR Code: UNIPASS:<studentId>:<timeSlot>:<hash>
  if (trimmed.startsWith('UNIPASS:')) {
    const parts = trimmed.split(':');
    if (parts.length >= 4) {
      const studentId = parts[1];
      const scannedSlot = parseInt(parts[2], 10);
      const scannedHash = parts[3];

      const currentSlot = Math.floor(Date.now() / 1000 / 30);

      // ยอมรับช่วงเวลาย้อนหลังไม่เกิน 2 slots (ประมาณ 60 วินาที) เพื่อกันดีเลย์
      const slotDiff = Math.abs(currentSlot - scannedSlot);
      if (slotDiff > 2) {
        return {
          valid: false,
          studentId,
          error: '⚠️ QR Code หมดอายุแล้ว (กรุณาแสดงบัตรสดบนหน้าจอ ไม่อนุญาตให้ใช้ภาพแคปเจอร์)',
          isDynamic: true,
        };
      }

      // ตรวจสอบ Checksum
      const expectedHash = simpleHash(`${studentId}:${scannedSlot}:${SECRET_SALT}`);
      if (scannedHash !== expectedHash) {
        return {
          valid: false,
          studentId,
          error: '⚠️ รหัส QR Code ไม่ถูกต้องหรือถูกแก้ไข',
          isDynamic: true,
        };
      }

      return {
        valid: true,
        studentId,
        isDynamic: true,
      };
    }
  }

  // กรณีเป็นรหัสนักศึกษาโดยตรง (Normal Barcode / Manual Input / Legacy ID)
  const cleanId = trimmed.replace(/\D/g, '');
  if (/^\d{7,10}$/.test(cleanId)) {
    return {
      valid: true,
      studentId: cleanId,
      isDynamic: false,
    };
  }

  return {
    valid: false,
    studentId: trimmed,
    error: 'รูปแบบรหัสนักศึกษาไม่ถูกต้อง',
    isDynamic: false,
  };
}
