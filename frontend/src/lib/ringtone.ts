const RING_ON_MS = 1500;
const RING_OFF_MS = 2500;
const RAMP_MS = 15;

interface RingHandle {
  stop: () => void;
}

function startPattern(freqs: number[], volume: number): RingHandle {
  const ctx = new AudioContext();
  const gainNode = ctx.createGain();
  gainNode.gain.value = 0;
  gainNode.connect(ctx.destination);

  const oscillators = freqs.map((freq) => {
    const osc = ctx.createOscillator();
    osc.frequency.value = freq;
    osc.connect(gainNode);
    osc.start();
    return osc;
  });

  let stopped = false;
  let timer: ReturnType<typeof setTimeout>;

  function scheduleCycle() {
    if (stopped) return;
    const now = ctx.currentTime;
    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(volume, now + RAMP_MS / 1000);
    gainNode.gain.setValueAtTime(volume, now + (RING_ON_MS - RAMP_MS) / 1000);
    gainNode.gain.linearRampToValueAtTime(0, now + RING_ON_MS / 1000);
    timer = setTimeout(scheduleCycle, RING_ON_MS + RING_OFF_MS);
  }
  scheduleCycle();

  return {
    stop() {
      stopped = true;
      clearTimeout(timer);
      oscillators.forEach((osc) => {
        try {
          osc.stop();
        } catch {
          // already stopped
        }
      });
      ctx.close().catch(() => {});
    },
  };
}

let active: RingHandle | null = null;

// Incoming uses a classic dual-tone phone ring; outgoing uses a single lower
// ringback tone, so callers can tell "it's ringing for them" from "someone
// is calling me" without looking at the screen.
export function startRingtone(kind: "incoming" | "outgoing"): void {
  stopRingtone();
  active =
    kind === "incoming" ? startPattern([440, 480], 0.15) : startPattern([420], 0.08);
}

export function stopRingtone(): void {
  active?.stop();
  active = null;
}
