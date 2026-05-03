import { cleanupProviderConnections, getSettings, updateSettings, getApiKeys } from "@/lib/localDb";
import { getMitmStatus, startMitm, loadEncryptedPassword, initDbHooks } from "@/mitm/manager";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync } from "fs";

// Inject correct paths and DB hooks into manager.js (CJS) from ESM context.
// Must run before any MITM function is called.
(function bootstrapMitm() {
  // 1. Resolve server.js path from real ESM __filename (not bundled path)
  if (!process.env.MITM_SERVER_PATH) {
    try {
      const thisFile = fileURLToPath(import.meta.url);
      const appSrc = dirname(dirname(thisFile)); // src/
      const candidate = join(appSrc, "mitm", "server.js");
      if (existsSync(candidate)) {
        process.env.MITM_SERVER_PATH = candidate;
      }
    } catch { /* ignore */ }
  }

  // 2. Inject DB functions so manager.js (CJS) can save/load settings
  //    without dynamic import issues inside webpack bundles
  try {
    initDbHooks(getSettings, updateSettings);
  } catch { /* ignore */ }
})();

// Multiple modules register SIGINT/SIGTERM handlers legitimately
process.setMaxListeners(20);

// Use global to survive Next.js hot reload — prevents duplicate intervals
const g = global.__appSingleton ??= {
  signalHandlersRegistered: false,
  mitmStartInProgress: false,
};

/**
 * Initialize app on startup
 * - Cleanup stale data
 * - Keep the local runtime ready behind Nginx
 */
export async function initializeApp() {
  try {
    await cleanupProviderConnections();

    // Register signal handlers once only.
    if (!g.signalHandlersRegistered) {
      const cleanup = () => {
        process.exit();
      };
      process.on("SIGINT", cleanup);
      process.on("SIGTERM", cleanup);
      g.signalHandlersRegistered = true;
    }

    // Auto-start MITM if it was enabled before restart
    autoStartMitm();
  } catch (error) {
    console.error("[InitApp] Error:", error);
  }
}

/** Auto-start MITM if it was enabled before restart */
async function autoStartMitm() {
  if (g.mitmStartInProgress) return;
  g.mitmStartInProgress = true;
  try {
    const settings = await getSettings();
    if (!settings.mitmEnabled) return;

    const mitmStatus = await getMitmStatus();
    if (mitmStatus.running) return;

    const password = await loadEncryptedPassword();
    if (!password && process.platform !== "win32") {
      console.log("[InitApp] MITM was enabled but no saved password found, skipping auto-start");
      return;
    }

    // Need an active API key
    const keys = await getApiKeys();
    const activeKey = keys.find(k => k.isActive !== false);

    console.log("[InitApp] MITM was enabled, auto-starting...");
    await startMitm(activeKey?.key || "sk_arouter", password);
    console.log("[InitApp] MITM auto-started");
  } catch (err) {
    console.log("[InitApp] MITM auto-start failed:", err.message);
  } finally {
    g.mitmStartInProgress = false;
  }
}

export default initializeApp;
