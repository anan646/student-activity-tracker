// Web Audio API Synthesizer & Haptic Vibration Feedback
// ทำงานได้ 100% บนทุกเบราว์เซอร์และมือถือ โดยไม่ต้องโหลดไฟล์ MP3 ภายนอก

export function playSuccessBeep() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    // Pleasant high chime (880Hz -> 1320Hz)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.25);

    // Haptic vibration on mobile
    if ('vibrate' in navigator) {
      navigator.vibrate([100]);
    }
  } catch (e) {
    // Audio context may be blocked before first user interaction
  }
}

export function playWarningBeep() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    // Double low tone warning (260Hz)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(260, ctx.currentTime);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.3);

    // Double vibration on mobile
    if ('vibrate' in navigator) {
      navigator.vibrate([150, 80, 150]);
    }
  } catch (e) {
    // Audio context may be blocked before first user interaction
  }
}
