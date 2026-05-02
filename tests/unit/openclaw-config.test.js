import { describe, expect, it } from "vitest";
import { normalizeOpenClawBaseUrl } from "../../src/lib/cliTools/openclawConfig.js";

describe("OpenClaw config URL normalization", () => {
  it("replaces arouter short domains with direct tunnel API URL", () => {
    const result = normalizeOpenClawBaseUrl("https://r3k3k83.arouter.com/v1", {
      tunnel: { apiUrl: "https://direct.trycloudflare.com" },
    });

    expect(result).toBe("https://direct.trycloudflare.com/v1");
  });

  it("keeps non-short URLs and normalizes the v1 suffix", () => {
    expect(normalizeOpenClawBaseUrl("https://direct.trycloudflare.com")).toBe("https://direct.trycloudflare.com/v1");
    expect(normalizeOpenClawBaseUrl("http://127.0.0.1:1508/v1")).toBe("http://127.0.0.1:1508/v1");
  });
});
