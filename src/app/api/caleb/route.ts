import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { prompt, userJwt, history } = await req.json();

    if (!prompt || !userJwt) {
      return new Response(JSON.stringify({ error: 'Prompt y userJwt son requeridos.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // CALEB_BRIDGE_URL: en producción (naski) = http://127.0.0.1:5000
    // En desarrollo local = http://caleb.ishiro-art.com (o tunnel si se usa)
    const BRIDGE_URL = process.env.CALEB_BRIDGE_URL || 'http://caleb.ishiro-art.com';
    const SECRET_TOKEN = process.env.CALEB_SECRET_TOKEN || '1130_secret_caleb_bridge_token';

    const response = await fetch(`${BRIDGE_URL}/api/caleb`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SECRET_TOKEN}`
      },
      body: JSON.stringify({ prompt, userJwt, history })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(JSON.stringify({ error: `Bridge Error (${response.status}): ${errorText}` }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Stream the response back to the browser
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked'
      }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
