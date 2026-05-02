import { describe, expect, it } from "vitest";
import { buildTunnelApiUrl, buildTunnelPublicUrl, getPreferredTunnelApiUrl } from "../../src/lib/tunnel/tunnelUrls.js";

describe("tunnel URL selection", () => {
  it("keeps the stable public browser URL separate from the direct API URL", () => {
    expect(buildTunnelPublicUrl("3k3k83")).toBe("https://r3k3k83.arouter.com");
    expect(buildTunnelApiUrl("https://direct.trycloudflare.com/")).toBe("https://direct.trycloudflare.com");
  });

  it("prefers direct tunnel URLs for API clients to avoid public-domain WAF blocks", () => {
    expect(getPreferredTunnelApiUrl({
      publicUrl: "https://r3k3k83.arouter.com",
      tunnelUrl: "https://direct.trycloudflare.com",
    })).toBe("https://direct.trycloudflare.com");
  });
});
