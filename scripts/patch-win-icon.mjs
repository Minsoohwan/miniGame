import { rcedit } from "rcedit";

const exePath = "release/win-unpacked/3D Mini Games.exe";
const iconPath = "src/assets/icon/icon.ico";

await rcedit(exePath, { icon: iconPath });
console.log(`Patched Windows executable icon: ${exePath}`);
