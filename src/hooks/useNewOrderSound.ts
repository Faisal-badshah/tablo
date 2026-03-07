import { useEffect, useRef } from 'react';

// Generate a simple notification beep using Web Audio API
const playBeep = () => {
  try {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.frequency.value = 880;
    oscillator.type = 'sine';
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.5);
  } catch {
    // Audio not supported
  }
};

export const useNewOrderSound = (orderCount: number) => {
  const prevCount = useRef(orderCount);

  useEffect(() => {
    if (orderCount > prevCount.current) {
      playBeep();
    }
    prevCount.current = orderCount;
  }, [orderCount]);
};
