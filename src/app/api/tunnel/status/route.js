import { NextResponse } from "next/server";

export async function GET() {
  try {
    return NextResponse.json({
      tunnel: {
        enabled: false,
        provider: "nginx",
        tunnelUrl: "",
        apiUrl: "",
        publicUrl: "",
        message: "Cloudflare tunnel is disabled. Publish the app through Nginx instead.",
      },
      tailscale: {
        enabled: false,
        tunnelUrl: "",
      },
      download: {
        downloading: false,
        progress: 0,
        disabled: true,
      },
    });
  } catch (error) {
    console.error("Tunnel status error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
