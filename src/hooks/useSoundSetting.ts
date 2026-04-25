import { useEffect, useState } from "react";

const soundSettingKey = "settings.soundEnabled";

export function useSoundSetting() {
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const storedValue = window.localStorage.getItem(soundSettingKey);
    return storedValue === null ? true : storedValue === "true";
  });

  useEffect(() => {
    window.localStorage.setItem(soundSettingKey, String(soundEnabled));
  }, [soundEnabled]);

  return [soundEnabled, setSoundEnabled] as const;
}
