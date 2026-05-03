import { describe, expect, it } from "vitest";
import { appendV1Path, isPublicBaseUrl, resolvePreferredBaseUrl } from "../../src/shared/utils/publicBaseUrl.js";

describe("public base URL helpers", () => {
  it("prefers configured public base URLs over the browser origin", () => {
    expect(resolvePreferredBaseUrl("http://localhost:1508", "https://api.example.com/")).toBe("https://api.example.com");
  });

  it("falls back to the current origin when no configured base URL exists", () => {
    expect(resolvePreferredBaseUrl("https://router.example.com", "")).toBe("https://router.example.com");
  });

  it("detects local URLs as non-public and domains as public", () => {
    expect(isPublicBaseUrl("http://localhost:1508")).toBe(false);
    expect(isPublicBaseUrl("http://127.0.0.1:1508")).toBe(false);
    expect(isPublicBaseUrl("https://router.example.com")).toBe(true);
  });

  it("adds the /v1 suffix exactly once", () => {
    expect(appendV1Path("https://router.example.com")).toBe("https://router.example.com/v1");
    expect(appendV1Path("https://router.example.com/v1")).toBe("https://router.example.com/v1");
  });
});
