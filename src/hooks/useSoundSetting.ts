import { useEffect, useState } from "react";

const soundSettingKey = "settings.soundEnabled";

export function useSoundSetting() {
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return window.localStorage.getItem(soundSettingKey) === "true";
  });

  useEffect(() => {
    window.localStorage.setItem(soundSettingKey, String(soundEnabled));
  }, [soundEnabled]);

  return [soundEnabled, setSoundEnabled] as const;
}
