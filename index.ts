import fs from "fs";
console.log("INJECTED CRASH CAPTURE");
process.on('uncaughtException', (e) => { fs.writeFileSync('/tmp/crash.txt', e.stack || e.message); });
process.on('unhandledRejection', (e: any) => { fs.writeFileSync('/tmp/crash.txt', e.stack || e.message); });
const GeminiSwitcherPlugin = async () => ({ provider: { id: "google", models: async () => [] } });
(GeminiSwitcherPlugin as any).default = GeminiSwitcherPlugin;
module.exports = GeminiSwitcherPlugin;
