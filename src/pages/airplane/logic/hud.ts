type AirplaneHudArgs = {
  shieldCharges: number;
  speedBuffLeft: number;
  speed: number;
  distance: number;
};

export function getAirplaneHudLabel({
  shieldCharges,
  speedBuffLeft,
  speed,
  distance,
}: AirplaneHudArgs): string {
  const speedText = speed > 0 ? `${speed.toFixed(1)}` : "-";
  const boostText = speedBuffLeft > 0 ? `${speedBuffLeft.toFixed(1)}s` : "없음";
  return `협곡 비행 | 거리 ${distance.toFixed(
    1
  )}m | 속도 ${speedText} | 보호막 ${shieldCharges} | 속도증가 ${boostText}`;
}
