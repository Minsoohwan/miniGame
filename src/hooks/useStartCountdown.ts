import { useEffect, useState } from "react";

const countdownLabels = ["3", "2", "1", "START!"] as const;

export function useStartCountdown(resetKey: number) {
  const [step, setStep] = useState(0);
  const [isCountingDown, setIsCountingDown] = useState(true);

  useEffect(() => {
    const timers = [
      window.setTimeout(() => {
        setStep(0);
        setIsCountingDown(true);
      }, 0),
      window.setTimeout(() => setStep(1), 1000),
      window.setTimeout(() => setStep(2), 2000),
      window.setTimeout(() => setStep(3), 3000),
      window.setTimeout(() => setIsCountingDown(false), 3600),
    ];

    return () => {
      for (const timer of timers) {
        window.clearTimeout(timer);
      }
    };
  }, [resetKey]);

  return {
    countdownLabel: isCountingDown ? countdownLabels[step] : null,
    isCountingDown,
  };
}
