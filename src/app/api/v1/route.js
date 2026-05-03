const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*"
};

/**
 * Handle CORS preflight
 */
export async function OPTIONS() {
  return new Response(null, { headers: CORS_HEADERS });
}

/**
 * GET /v1 - Return root JSON message
 */
export async function GET() {
  return new Response(JSON.stringify({
    message: "nhìn cc gì ở đây không có models"
  }), {
    headers: { "Content-Type": "application/json", ...CORS_HEADERS }
  });
}

