import { useEffect, useRef } from "react";

type MusicKind = "runner" | "western";

type WebKitAudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

const runnerBass = [55, 55, 65.41, 55, 73.42, 65.41, 55, 49];
const westernLeadPhrase = [
  329.63, 0, 392, 0,
  440, 392, 329.63, 293.66,
  261.63, 0, 293.66, 329.63,
  392, 329.63, 293.66, 0,
];
const westernBass = [82.41, 82.41, 110, 98];
const westernChordRoots = [164.81, 164.81, 220, 196];
let sharedAudioContext: AudioContext | null = null;

function createAudioContext() {
  const AudioContextClass =
    window.AudioContext ?? (window as WebKitAudioWindow).webkitAudioContext;
  return AudioContextClass ? new AudioContextClass() : null;
}

function getAudioContext() {
  if (sharedAudioContext && sharedAudioContext.state !== "closed") {
    return sharedAudioContext;
  }

  sharedAudioContext = createAudioContext();
  return sharedAudioContext;
}

export function unlockBackgroundMusic() {
  const context = getAudioContext();
  if (!context) return false;

  if (context.state === "suspended") {
    void context.resume();
  }

  const now = context.currentTime;
  const osc = context.createOscillator();
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
  osc.connect(gain);
  gain.connect(context.destination);
  osc.start(now);
  osc.stop(now + 0.05);

  return true;
}

function playTone(
  context: AudioContext,
  output: AudioNode,
  frequency: number,
  startTime: number,
  duration: number,
  options: {
    type?: OscillatorType;
    peak?: number;
    endFrequency?: number;
  } = {},
) {
  const osc = context.createOscillator();
  const gain = context.createGain();
  const type = options.type ?? "sine";
  const peak = options.peak ?? 0.12;

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, startTime);
  if (options.endFrequency) {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(1, options.endFrequency),
      startTime + duration,
    );
  }

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(peak, startTime + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  osc.connect(gain);
  gain.connect(output);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
}

function playNoise(
  context: AudioContext,
  output: AudioNode,
  startTime: number,
  duration: number,
  peak: number,
) {
  const sampleCount = Math.max(1, Math.floor(context.sampleRate * duration));
  const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < sampleCount; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();

  filter.type = "highpass";
  filter.frequency.setValueAtTime(4200, startTime);
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(peak, startTime + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  source.buffer = buffer;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(output);
  source.start(startTime);
  source.stop(startTime + duration + 0.01);
}

function scheduleRunnerStep(context: AudioContext, output: AudioNode, step: number, time: number) {
  if (step % 4 === 0) {
    playTone(context, output, 95, time, 0.16, {
      peak: 0.28,
      endFrequency: 42,
    });
  }

  if (step % 4 === 2) {
    playNoise(context, output, time, 0.07, 0.06);
  }

  if (step % 2 === 0) {
    playTone(context, output, runnerBass[step % runnerBass.length], time, 0.12, {
      type: "sawtooth",
      peak: 0.075,
    });
  }

  playNoise(context, output, time + 0.01, 0.035, step % 2 === 0 ? 0.035 : 0.02);
}

function scheduleWesternStep(context: AudioContext, output: AudioNode, step: number, time: number) {
  if (step % 4 === 0) {
    playTone(context, output, westernBass[Math.floor(step / 4) % westernBass.length], time, 0.34, {
      type: "triangle",
      peak: 0.16,
    });
  }

  // Horse-hoof rhythm under the melody.
  if (step % 4 === 0 || step % 4 === 1) {
    playNoise(context, output, time + 0.018, 0.045, step % 4 === 0 ? 0.05 : 0.032);
    playTone(context, output, 120, time + 0.012, 0.06, {
      peak: 0.06,
      endFrequency: 80,
    });
  }

  if (step % 4 === 0) {
    const root = westernChordRoots[Math.floor(step / 4) % westernChordRoots.length];
    for (const [i, note] of [root, root * 1.5, root * 2].entries()) {
      playTone(context, output, note, time + 0.025 + i * 0.018, 0.12, {
        type: "sawtooth",
        peak: 0.032,
      });
    }
  }

  const note = westernLeadPhrase[step % westernLeadPhrase.length];
  if (note > 0) {
    playTone(context, output, note, time + 0.02, 0.13, {
      type: "triangle",
      peak: 0.075,
    });
    playTone(context, output, note * 2, time + 0.026, 0.085, {
      type: "sine",
      peak: 0.03,
    });
  }

  if (step % 4 === 2) {
    playNoise(context, output, time + 0.02, 0.07, 0.04);
  }
}

export function playItemPickupSound(kind: "speed" | "shield") {
  const context = getAudioContext();
  if (!context) return;
  if (context.state === "suspended") {
    void context.resume();
  }

  const now = context.currentTime;
  const output = context.createGain();
  output.gain.setValueAtTime(1.8, now);
  output.connect(context.destination);

  if (kind === "speed") {
    playTone(context, output, 440, now, 0.08, { type: "square", peak: 0.16 });
    playTone(context, output, 660, now + 0.055, 0.09, { type: "square", peak: 0.14 });
    playTone(context, output, 880, now + 0.115, 0.12, { type: "triangle", peak: 0.12 });
  } else {
    playTone(context, output, 523.25, now, 0.16, { type: "sine", peak: 0.12 });
    playTone(context, output, 659.25, now + 0.025, 0.18, { type: "sine", peak: 0.1 });
    playTone(context, output, 783.99, now + 0.05, 0.2, { type: "triangle", peak: 0.09 });
    playNoise(context, output, now + 0.02, 0.08, 0.035);
  }

  window.setTimeout(() => {
    output.disconnect();
  }, 450);
}

export function playCrashSound() {
  const context = getAudioContext();
  if (!context) return;
  if (context.state === "suspended") {
    void context.resume();
  }

  const now = context.currentTime;
  const output = context.createGain();
  output.gain.setValueAtTime(2.4, now);
  output.connect(context.destination);

  playTone(context, output, 130, now, 0.18, {
    type: "sawtooth",
    peak: 0.24,
    endFrequency: 36,
  });
  playTone(context, output, 82, now + 0.02, 0.24, {
    type: "square",
    peak: 0.18,
    endFrequency: 28,
  });
  playNoise(context, output, now, 0.22, 0.18);
  playNoise(context, output, now + 0.08, 0.18, 0.1);

  window.setTimeout(() => {
    output.disconnect();
  }, 520);
}

export function playShieldBreakSound() {
  const context = getAudioContext();
  if (!context) return;
  if (context.state === "suspended") {
    void context.resume();
  }

  const now = context.currentTime;
  const output = context.createGain();
  output.gain.setValueAtTime(2, now);
  output.connect(context.destination);

  playTone(context, output, 880, now, 0.08, {
    type: "triangle",
    peak: 0.12,
    endFrequency: 620,
  });
  playTone(context, output, 660, now + 0.045, 0.11, {
    type: "sine",
    peak: 0.1,
    endFrequency: 440,
  });
  playTone(context, output, 330, now + 0.08, 0.16, {
    type: "sawtooth",
    peak: 0.08,
    endFrequency: 180,
  });
  playNoise(context, output, now + 0.02, 0.14, 0.09);

  window.setTimeout(() => {
    output.disconnect();
  }, 460);
}

export function useBackgroundMusic(
  kind: MusicKind,
  shouldPlay: boolean,
  isPaused = false,
) {
  const contextRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const timerRef = useRef<number | null>(null);
  const pausedRef = useRef(isPaused);
  const stepRef = useRef(0);
  const nextStepTimeRef = useRef(0);

  useEffect(() => {
    pausedRef.current = isPaused;
    const context = contextRef.current;
    const gain = gainRef.current;
    if (!context || !gain) return;

    const now = context.currentTime;
    gain.gain.cancelScheduledValues(now);
    if (isPaused) {
      gain.gain.setTargetAtTime(0.0001, now, 0.035);
      nextStepTimeRef.current = now + 0.05;
    } else {
      gain.gain.setTargetAtTime(kind === "runner" ? 5.5 : 4.5, now, 0.035);
    }
  }, [isPaused, kind]);

  useEffect(() => {
    const stopMusic = () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }

      const context = contextRef.current;
      const gain = gainRef.current;
      if (context && gain) {
        const now = context.currentTime;
        gain.gain.cancelScheduledValues(now);
        gain.gain.setTargetAtTime(0.0001, now, 0.04);
        window.setTimeout(() => {
          gain.disconnect();
        }, 120);
      }

      contextRef.current = null;
      gainRef.current = null;
      stepRef.current = 0;
      nextStepTimeRef.current = 0;
    };

    if (!shouldPlay) {
      stopMusic();
      return stopMusic;
    }

    const context = getAudioContext();
    if (!context) return stopMusic;

    const masterGain = context.createGain();
    masterGain.gain.setValueAtTime(
      pausedRef.current ? 0.0001 : kind === "runner" ? 5.5 : 4.5,
      context.currentTime,
    );
    masterGain.connect(context.destination);

    contextRef.current = context;
    gainRef.current = masterGain;

    const resume = () => {
      if (context.state === "suspended") {
        void context.resume();
      }
    };
    resume();
    window.addEventListener("pointerdown", resume, { once: true });
    window.addEventListener("keydown", resume, { once: true });

    const bpm = kind === "runner" ? 156 : 108;
    const stepDuration = 60 / bpm / 2;
    nextStepTimeRef.current = context.currentTime + 0.05;
    stepRef.current = 0;

    const schedule = () => {
      if (pausedRef.current) {
        nextStepTimeRef.current = context.currentTime + 0.05;
        return;
      }

      const scheduleUntil = context.currentTime + 0.22;
      while (nextStepTimeRef.current < scheduleUntil) {
        if (kind === "runner") {
          scheduleRunnerStep(context, masterGain, stepRef.current, nextStepTimeRef.current);
        } else {
          scheduleWesternStep(context, masterGain, stepRef.current, nextStepTimeRef.current);
        }
        nextStepTimeRef.current += stepDuration;
        stepRef.current = (stepRef.current + 1) % 16;
      }
    };

    schedule();
    timerRef.current = window.setInterval(schedule, 80);

    return () => {
      window.removeEventListener("pointerdown", resume);
      window.removeEventListener("keydown", resume);
      stopMusic();
    };
  }, [kind, shouldPlay]);
}
