import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({
  NextResponse: {
    next: vi.fn(() => ({ type: "next" })),
    redirect: vi.fn((url) => ({
      type: "redirect",
      location: url.toString(),
    })),
    json: vi.fn((body, init) => ({
      type: "json",
      status: init?.status ?? 200,
      body,
    })),
  },
}));

vi.mock("jose", () => ({
  jwtVerify: vi.fn(),
}));

vi.mock("@/lib/localDb", () => ({
  getSettings: vi.fn(),
}));

vi.mock("@/shared/utils/machineId", () => ({
  getConsistentMachineId: vi.fn(),
}));

function createRequest(pathname, { token, host = "127.0.0.1:1508" } = {}) {
  return {
    url: `http://${host}${pathname}`,
    nextUrl: { pathname },
    headers: {
      get: vi.fn((name) => {
        if (name === "host") return host;
        return null;
      }),
    },
    cookies: {
      get: vi.fn((name) => {
        if (name === "auth_token" && token) return { value: token };
        return undefined;
      }),
    },
  };
}

describe("dashboardGuard proxy", () => {
  let proxy;
  let getSettings;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ getSettings } = await import("../../src/lib/localDb.js"));
    ({ proxy } = await import("../../src/dashboardGuard.js"));
  });

  it("allows the public home route to render without redirecting to dashboard", async () => {
    vi.mocked(getSettings).mockResolvedValue({ requireLogin: true });

    const response = await proxy(createRequest("/"));

    expect(response).toEqual({ type: "next" });
  });

  it("redirects unauthenticated dashboard requests to login", async () => {
    vi.mocked(getSettings).mockResolvedValue({ requireLogin: true });

    const response = await proxy(createRequest("/dashboard"));

    expect(response.type).toBe("redirect");
    expect(response.location).toBe("http://127.0.0.1:1508/login");
  });
});
