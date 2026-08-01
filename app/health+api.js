export function GET() {
  return Response.json({ ok: true, method: 'GET', ts: Date.now() });
}

export function POST(request) {
  return Response.json({ ok: true, method: 'POST' });
}
