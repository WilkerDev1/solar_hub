import { NextRequest } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token') || req.headers.get('x-user-jwt');

    if (!token) {
      return new Response(JSON.stringify({ error: 'Session token is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const BRIDGE_URL = process.env.CALEB_BRIDGE_URL || 'http://100.122.6.67:5000';
    const SECRET_TOKEN = process.env.CALEB_SECRET_TOKEN || '1130_secret_caleb_bridge_token';

    const response = await fetch(`${BRIDGE_URL}/api/storage/file/${id}`, {
      headers: {
        'Authorization': `Bearer ${SECRET_TOKEN}`,
        'x-user-jwt': token
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(errorText, { status: response.status });
    }

    return new Response(response.body, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/octet-stream',
        'Content-Disposition': response.headers.get('Content-Disposition') || 'inline'
      }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
