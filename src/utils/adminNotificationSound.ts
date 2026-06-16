let audioContext: AudioContext | null = null;
let lastPlayedAt = 0;

const getAudioContext = () => {
  if (typeof window === 'undefined') return null;
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) return null;

  if (!audioContext) {
    audioContext = new AudioContextCtor();
  }

  return audioContext;
};

export const unlockAdminNotificationSound = () => {
  const context = getAudioContext();
  if (!context || context.state !== 'suspended') return;
  context.resume().catch(() => undefined);
};

const playTone = (context: AudioContext, startAt: number, frequency: number, duration: number, volume: number) => {
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = 'triangle';
  oscillator.frequency.setValueAtTime(frequency, startAt);
  oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.18, startAt + duration * 0.55);

  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.03);
};

export const playAdminNewOrderSound = () => {
  const context = getAudioContext();
  if (!context) return;

  const nowMs = Date.now();
  if (nowMs - lastPlayedAt < 900) return;
  lastPlayedAt = nowMs;

  if (context.state === 'suspended') {
    context.resume().catch(() => undefined);
    return;
  }

  const now = context.currentTime;
  playTone(context, now, 880, 0.13, 0.12);
  playTone(context, now + 0.1, 1320, 0.12, 0.11);
  playTone(context, now + 0.2, 1760, 0.18, 0.09);
};

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
