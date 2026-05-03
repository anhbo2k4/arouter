import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Cloudflare tunnel support has been removed. Publish the app through Nginx instead." },
    { status: 410 }
  );
}
