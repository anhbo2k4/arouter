import fs from "fs";
import path from "path";
import https from "https";
import os from "os";
import { execFileSync, execSync, spawn } from "child_process";
import { savePid, loadPid, clearPid } from "./state.js";
import { DATA_DIR } from "@/lib/dataDir.js";
import { isExpectedCloudflaredCommand } from "./cloudflaredProcess.js";

const BIN_DIR = path.join(DATA_DIR, "bin");
const TUNNEL_DIR = path.join(DATA_DIR, "tunnel");
const QUICK_TUNNEL_CONFIG_DIR = path.join(TUNNEL_DIR, "cloudflared-quick");
const QUICK_TUNNEL_CONFIG_PATH = path.join(QUICK_TUNNEL_CONFIG_DIR, "config.yml");
const BINARY_NAME = "cloudflared";
const IS_WINDOWS = os.platform() === "win32";
const BIN_NAME = IS_WINDOWS ? `${BINARY_NAME}.exe` : BINARY_NAME;
const BIN_PATH = path.join(BIN_DIR, BIN_NAME);

const GITHUB_BASE_URL = "https://github.com/cloudflare/cloudflared/releases/latest/download";

const PLATFORM_MAPPINGS = {
  darwin: {
    x64: "cloudflared-darwin-amd64.tgz",
    arm64: "cloudflared-darwin-arm64.tgz"
  },
  win32: {
    x64: "cloudflared-windows-amd64.exe",
    ia32: "cloudflared-windows-386.exe",
    arm64: "cloudflared-windows-386.exe"
  },
  linux: {
    x64: "cloudflared-linux-amd64",
    arm64: "cloudflared-linux-arm64"
  }
};

// Fallback order: prefer smallest/most-compatible binary per platform
const PLATFORM_FALLBACK = {
  darwin: "cloudflared-darwin-amd64.tgz",
  win32: "cloudflared-windows-386.exe",
  linux: "cloudflared-linux-amd64"
};

function getDownloadUrl() {
  const platform = os.platform();
  const arch = os.arch();

  const platformMapping = PLATFORM_MAPPINGS[platform];
  if (!platformMapping) {
    throw new Error(`Unsupported platform: ${platform}`);
  }

  const binaryName = platformMapping[arch] || PLATFORM_FALLBACK[platform];
  return `${GITHUB_BASE_URL}/${binaryName}`;
}

// Download state — shared so status API can read it
const dlState = { downloading: false, progress: 0 };

export function getDownloadStatus() {
  return { downloading: dlState.downloading, progress: dlState.progress };
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);

    https.get(url, (response) => {
      if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
        file.close();
        fs.unlinkSync(dest);
        downloadFile(response.headers.location, dest).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        reject(new Error(`Download failed with status ${response.statusCode}`));
        return;
      }

      const totalBytes = parseInt(response.headers["content-length"], 10) || 0;
      let receivedBytes = 0;
      dlState.downloading = true;
      dlState.progress = 0;

      response.on("data", (chunk) => {
        receivedBytes += chunk.length;
        if (totalBytes > 0) dlState.progress = Math.round((receivedBytes / totalBytes) * 100);
      });

      response.pipe(file);

      file.on("finish", () => {
        dlState.downloading = false;
        dlState.progress = 100;
        file.close(() => resolve(dest));
      });

      file.on("error", (err) => {
        dlState.downloading = false;
        dlState.progress = 0;
        file.close();
        fs.unlinkSync(dest);
        reject(err);
      });
    }).on("error", (err) => {
      dlState.downloading = false;
      dlState.progress = 0;
      file.close();
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      reject(err);
    });
  });
}

const MIN_BINARY_SIZE = 1024 * 1024; // 1MB - cloudflared is ~30MB+

// Validate binary is executable on current platform and not truncated
function isValidBinary(filePath) {
  try {
    const stat = fs.statSync(filePath);
    if (stat.size < MIN_BINARY_SIZE) return false;
    const fd = fs.openSync(filePath, "r");
    const buf = Buffer.alloc(4);
    fs.readSync(fd, buf, 0, 4, 0);
    fs.closeSync(fd);
    const magic = buf.toString("hex");
    if (IS_WINDOWS) return magic.startsWith("4d5a"); // PE (MZ)
    if (os.platform() === "darwin") return magic.startsWith("cffaedfe") || magic.startsWith("cefaedfe");
    return magic.startsWith("7f454c46"); // ELF (Linux)
  } catch {
    return false;
  }
}

let downloadPromise = null;

export async function ensureCloudflared() {
  if (downloadPromise) return downloadPromise;
  downloadPromise = _ensureCloudflared().finally(() => { downloadPromise = null; });
  return downloadPromise;
}

async function _ensureCloudflared() {
  if (!fs.existsSync(BIN_DIR)) {
    fs.mkdirSync(BIN_DIR, { recursive: true });
  }

  // Clean up incomplete downloads from previous runs
  const tmpPath = `${BIN_PATH}.tmp`;
  if (fs.existsSync(tmpPath)) {
    try { fs.unlinkSync(tmpPath); } catch { /* ignore */ }
  }

  if (fs.existsSync(BIN_PATH)) {
    if (!isValidBinary(BIN_PATH)) {
      console.log("[cloudflared] Invalid binary detected, re-downloading...");
      fs.unlinkSync(BIN_PATH);
    } else {
      if (!IS_WINDOWS) fs.chmodSync(BIN_PATH, "755");
      return BIN_PATH;
    }
  }

  const url = getDownloadUrl();
  const isArchive = url.endsWith(".tgz");
  const downloadDest = isArchive ? path.join(BIN_DIR, "cloudflared.tgz.tmp") : tmpPath;

  await downloadFile(url, downloadDest);

  if (isArchive) {
    execSync(`tar -xzf "${downloadDest}" -C "${BIN_DIR}"`, { stdio: "pipe", windowsHide: true });
    fs.unlinkSync(downloadDest);
  } else {
    fs.renameSync(downloadDest, BIN_PATH);
  }

  if (!IS_WINDOWS) {
    fs.chmodSync(BIN_PATH, "755");
  }

  return BIN_PATH;
}

let cloudflaredProcess = null;
let unexpectedExitHandler = null;

function runPowerShell(command, options = {}) {
  return execFileSync("powershell", ["-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-Command", command], {
    windowsHide: true,
    ...options
  });
}

function psQuote(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function getProcessCommandLine(pid) {
  if (!pid) return "";
  try {
    if (IS_WINDOWS) {
      return runPowerShell(`Get-CimInstance Win32_Process -Filter "ProcessId=${pid}" | Select-Object -ExpandProperty CommandLine`, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"]
      }).trim();
    }

    return execSync(`ps -p ${pid} -o command=`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
}

function isProcessAlive(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/** Register a callback to be called when cloudflared exits unexpectedly after connecting */
export function setUnexpectedExitHandler(handler) {
  unexpectedExitHandler = handler;
}

export async function spawnCloudflared(tunnelToken) {
  const binaryPath = await ensureCloudflared();

  const child = spawn(binaryPath, ["tunnel", "run", "--dns-resolver-addrs", "1.1.1.1:53", "--token", tunnelToken], {
    detached: false,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"]
  });

  cloudflaredProcess = child;
  savePid(child.pid);

  return new Promise((resolve, reject) => {
    let connectionCount = 0;
    let resolved = false;
    const timeout = setTimeout(() => {
      resolved = true;
      resolve(child);
    }, 90000);

    const handleLog = (data) => {
      const msg = data.toString();
      // Count exact occurrences in this chunk (each chunk may contain multiple lines)
      const matches = msg.match(/Registered tunnel connection/g);
      if (matches) {
        connectionCount += matches.length;
        if (connectionCount >= 4 && !resolved) {
          resolved = true;
          clearTimeout(timeout);
          resolve(child);
        }
      }
    };

    child.stdout.on("data", handleLog);
    child.stderr.on("data", handleLog);

    child.on("error", (err) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        reject(err);
      }
    });

    child.on("exit", (code) => {
      cloudflaredProcess = null;
      clearPid();
      const wasConnected = resolved; // true = already connected successfully
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        if (connectionCount === 0) {
          reject(new Error(`cloudflared exited with code ${code}`));
          return;
        }
      }
      // Only notify on unexpected exit AFTER successful connection
      if (wasConnected && unexpectedExitHandler) {
        unexpectedExitHandler();
      }
    });
  });
}

/**
 * Spawn cloudflared quick tunnel (no account needed)
 * Returns the generated trycloudflare.com URL
 */
export async function spawnQuickTunnel(localPort, onUrlUpdate) {
  const binaryPath = await ensureCloudflared();

  fs.mkdirSync(QUICK_TUNNEL_CONFIG_DIR, { recursive: true });
  // Avoid using default ~/.cloudflared/config.yml, which can conflict with quick tunnel behavior.
  fs.writeFileSync(QUICK_TUNNEL_CONFIG_PATH, "# quick-tunnel config placeholder\n", "utf8");

  const child = spawn(binaryPath, ["tunnel", "--url", `http://localhost:${localPort}`, "--config", QUICK_TUNNEL_CONFIG_PATH, "--no-autoupdate"], {
    detached: false,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"]
  });

  cloudflaredProcess = child;
  savePid(child.pid);

  return new Promise((resolve, reject) => {
    let resolved = false;
    let lastOutput = "";

    function appendOutput(message) {
      lastOutput = `${lastOutput}${message}`.slice(-2000);
    }

    function formatExitError(code) {
      const detail = lastOutput.trim().split(/\r?\n/).slice(-4).join(" | ");
      return detail ? `cloudflared exited with code ${code}: ${detail}` : `cloudflared exited with code ${code}`;
    }

    function getQuickTunnelUrlFromLog(message) {
      // cloudflared logs may contain "api.trycloudflare.com" as well,
      // but that is NOT the quick-tunnel endpoint we need.
      const regex = /https:\/\/([a-z0-9-]+)\.trycloudflare\.com/gi;
      const candidates = [];

      for (const match of message.matchAll(regex)) {
        const host = match[1];
        if (host === "api") continue;
        candidates.push(`https://${host}.trycloudflare.com`);
      }

      if (!candidates.length) return null;
      return candidates[candidates.length - 1];
    }

    const timeout = setTimeout(() => {
      if (resolved) return;
      resolved = true;
      try { child.kill(); } catch { /* ignore */ }
      reject(new Error("Quick tunnel timed out"));
    }, 90000);

    let lastUrl = null;

    const handleLog = (data) => {
      const msg = data.toString();
      appendOutput(msg);
      const tunnelUrl = getQuickTunnelUrlFromLog(msg);
      if (!tunnelUrl) return;

      if (!resolved) {
        // First URL — resolve the promise, do NOT call onUrlUpdate (caller handles initial register)
        resolved = true;
        lastUrl = tunnelUrl;
        clearTimeout(timeout);
        resolve({ child, tunnelUrl });
        return;
      }

      // URL changed after initial connect — notify caller to re-register
      if (tunnelUrl !== lastUrl) {
        lastUrl = tunnelUrl;
        if (onUrlUpdate) onUrlUpdate(tunnelUrl);
      }
    };

    child.stdout.on("data", handleLog);
    child.stderr.on("data", handleLog);

    child.on("error", (err) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);
      reject(err);
    });

    child.on("exit", (code) => {
      cloudflaredProcess = null;
      clearPid();
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        reject(new Error(formatExitError(code)));
        return;
      }
      if (unexpectedExitHandler) unexpectedExitHandler();
    });
  });
}

// Kill cloudflared processes whose command line targets the given port (any host).
// Boundary check ensures :1508 doesn't match :15080 or :202128.
function killCloudflaredByPort(port) {
  if (!port) return;
  try {
    if (IS_WINDOWS) {
      const psCmd = `Get-CimInstance Win32_Process -Filter "Name='cloudflared.exe'" | Where-Object { $_.CommandLine -match ':${port}(\\D|$)' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }`;
      runPowerShell(psCmd, { stdio: "ignore" });
    } else {
      execSync(`pkill -f "cloudflared.*:${port}([^0-9]|$)" 2>/dev/null || true`, { stdio: "ignore", windowsHide: true });
    }
  } catch (e) { /* ignore */ }
}

function killProjectCloudflaredProcesses() {
  try {
    if (IS_WINDOWS) {
      const binPath = psQuote(BIN_PATH);
      const psCmd = `$bin = ${binPath}; Get-CimInstance Win32_Process -Filter "Name='cloudflared.exe'" | Where-Object { $_.ExecutablePath -eq $bin -or $_.CommandLine -like "*$bin*" } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }`;
      runPowerShell(psCmd, { stdio: "ignore" });
    } else {
      execSync(`pkill -f "${BIN_PATH.replace(/"/g, "\\\"")}" 2>/dev/null || true`, { stdio: "ignore", windowsHide: true });
    }
  } catch { /* ignore */ }
}

export function killCloudflared(localPort = 1508) {
  if (cloudflaredProcess) {
    try {
      cloudflaredProcess.kill();
    } catch (e) { /* ignore */ }
    cloudflaredProcess = null;
  }

  const pid = loadPid();
  if (pid) {
    try {
      process.kill(pid);
    } catch (e) { /* ignore */ }
    clearPid();
  }

  killCloudflaredByPort(localPort);
  killProjectCloudflaredProcesses();
}

export function isCloudflaredRunning(localPort = 1508) {
  const pid = loadPid();
  if (!pid) return false;

  if (!isProcessAlive(pid)) {
    clearPid();
    return false;
  }

  const commandLine = getProcessCommandLine(pid);
  if (commandLine && !isExpectedCloudflaredCommand(commandLine, localPort, fs.existsSync)) {
    clearPid();
    return false;
  }

  return true;
}
