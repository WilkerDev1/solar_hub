import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = req.headers.get('x-user-jwt');

    if (!token) {
      return NextResponse.json({ error: 'x-user-jwt header is required' }, { status: 401 });
    }

    const BRIDGE_URL = process.env.CALEB_BRIDGE_URL || 'http://100.122.6.67:5000';
    const SECRET_TOKEN = process.env.CALEB_SECRET_TOKEN || '1130_secret_caleb_bridge_token';

    // Delete physical file from Naski via bridge (best effort)
    const bridgeRes = await fetch(`${BRIDGE_URL}/api/storage/file/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${SECRET_TOKEN}`,
        'x-user-jwt': token,
      },
    }).catch(() => null);

    if (bridgeRes && !bridgeRes.ok && bridgeRes.status !== 404) {
      const errText = await bridgeRes.text();
      console.warn(`Bridge DELETE warning for ${id}:`, errText);
    }

    // Always remove the Supabase index record regardless of bridge result
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const { error } = await supabaseAdmin.from('documents').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { name } = await req.json();

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const { data, error } = await supabaseAdmin
      .from('documents')
      .update({ name })
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ document: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
