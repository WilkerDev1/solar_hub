import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

/** GET /api/storage/folders?parent_id=&project_id= */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const parentId = searchParams.get('parent_id');
    const projectId = searchParams.get('project_id');

    const supabase = getAdminClient();
    let query = supabase.from('folders').select('*').order('name', { ascending: true });

    if (parentId === 'null' || parentId === '') {
      query = query.is('parent_id', null);
    } else if (parentId) {
      query = query.eq('parent_id', parentId);
    }

    if (projectId === 'null' || projectId === '') {
      query = query.is('project_id', null);
    } else if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ folders: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** POST /api/storage/folders — create folder */
export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('x-user-jwt');
    if (!token) return NextResponse.json({ error: 'x-user-jwt required' }, { status: 401 });

    const body = await req.json();
    const { name, parent_id, project_id, department_id } = body;

    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });

    // Resolve company_id from JWT using user-scoped client
    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { data: profile } = await userClient
      .from('profiles')
      .select('company_id')
      .single();

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'Company not found' }, { status: 403 });
    }

    const { data, error } = await userClient
      .from('folders')
      .insert({
        name,
        company_id: profile.company_id,
        parent_id: parent_id || null,
        project_id: project_id || null,
        department_id: department_id || null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ folder: data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
