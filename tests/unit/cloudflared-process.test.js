import { describe, expect, it } from "vitest";
import {
  commandTargetsLocalPort,
  extractConfigPath,
  isExpectedCloudflaredCommand
} from "../../src/lib/tunnel/cloudflaredProcess.js";

describe("cloudflared process detection", () => {
  it("matches the exact local tunnel port without matching longer ports", () => {
    const command = "cloudflared.exe tunnel --url http://localhost:1508 --no-autoupdate";

    expect(commandTargetsLocalPort(command, 1508)).toBe(true);
    expect(commandTargetsLocalPort(command.replace(":1508", ":15080"), 1508)).toBe(false);
    expect(commandTargetsLocalPort(command.replace(":1508", ":20128"), 1508)).toBe(false);
  });

  it("extracts quoted and unquoted config paths from command line args", () => {
    expect(extractConfigPath("cloudflared tunnel --config C:\\Temp\\quick\\config.yml")).toBe("C:\\Temp\\quick\\config.yml");
    expect(extractConfigPath("cloudflared tunnel --config \"C:\\Temp With Space\\quick\\config.yml\"")).toBe("C:\\Temp With Space\\quick\\config.yml");
  });

  it("rejects stale commands with the wrong port or a missing config file", () => {
    const command = "cloudflared.exe tunnel --url http://localhost:20128 --config C:\\Temp\\missing\\config.yml";

    expect(isExpectedCloudflaredCommand(command, 1508, () => true)).toBe(false);
    expect(isExpectedCloudflaredCommand(command.replace(":20128", ":1508"), 1508, () => false)).toBe(false);
    expect(isExpectedCloudflaredCommand(command.replace(":20128", ":1508"), 1508, () => true)).toBe(true);
  });
});
