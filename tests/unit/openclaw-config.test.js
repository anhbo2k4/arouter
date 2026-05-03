import { describe, expect, it } from "vitest";
import { normalizeOpenClawBaseUrl } from "../../src/lib/cliTools/openclawConfig.js";

describe("OpenClaw config URL normalization", () => {
  it("keeps configured public domains unchanged apart from the /v1 suffix", () => {
    const result = normalizeOpenClawBaseUrl("https://api.example.com");
    expect(result).toBe("https://api.example.com/v1");
  });

  it("keeps non-short URLs and normalizes the v1 suffix", () => {
    expect(normalizeOpenClawBaseUrl("https://router.example.com/v1")).toBe("https://router.example.com/v1");
    expect(normalizeOpenClawBaseUrl("http://127.0.0.1:1508/v1")).toBe("http://127.0.0.1:1508/v1");
  });
});
