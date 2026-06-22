import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    
    // CALEB_BRIDGE_URL is configured on Naski via Tailscale or local IP.
    const BRIDGE_URL = process.env.CALEB_BRIDGE_URL || 'http://100.122.6.67:5000';
    const SECRET_TOKEN = process.env.CALEB_SECRET_TOKEN || '1130_secret_caleb_bridge_token';
    const userJwt = req.headers.get('x-user-jwt');

    if (!userJwt) {
      return NextResponse.json({ error: 'x-user-jwt header is required' }, { status: 400 });
    }

    const response = await fetch(`${BRIDGE_URL}/api/storage/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SECRET_TOKEN}`,
        'x-user-jwt': userJwt
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: `Bridge Error (${response.status}): ${errorText}` }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 200 });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
