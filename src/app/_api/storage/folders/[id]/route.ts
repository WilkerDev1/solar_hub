import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getUserClient(token: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
}

/** PATCH /api/storage/folders/[id] — rename folder */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = req.headers.get('x-user-jwt');
    if (!token) return NextResponse.json({ error: 'x-user-jwt required' }, { status: 401 });

    const { name } = await req.json();
    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });

    const { data, error } = await getUserClient(token)
      .from('folders')
      .update({ name })
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ folder: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** DELETE /api/storage/folders/[id] — delete folder + cascade documents */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = req.headers.get('x-user-jwt');
    if (!token) return NextResponse.json({ error: 'x-user-jwt required' }, { status: 401 });

    const userClient = getUserClient(token);

    // First collect all descendant folder IDs (recursive)
    const allFolderIds: string[] = [id];
    const queue = [id];
    while (queue.length > 0) {
      const current = queue.shift()!;
      const { data: children } = await userClient
        .from('folders')
        .select('id')
        .eq('parent_id', current);
      if (children) {
        children.forEach(c => {
          allFolderIds.push(c.id);
          queue.push(c.id);
        });
      }
    }

    // Delete all documents inside these folders
    // (physical files: best-effort delete via bridge for each document)
    const BRIDGE_URL = process.env.CALEB_BRIDGE_URL || 'http://100.122.6.67:5000';
    const SECRET_TOKEN = process.env.CALEB_SECRET_TOKEN || '1130_secret_caleb_bridge_token';

    const { data: docs } = await userClient
      .from('documents')
      .select('id')
      .in('folder_id', allFolderIds);

    if (docs && docs.length > 0) {
      await Promise.allSettled(
        docs.map(doc =>
          fetch(`${BRIDGE_URL}/api/storage/file/${doc.id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${SECRET_TOKEN}`,
              'x-user-jwt': token,
            },
          })
        )
      );
      // Remove all document records
      await userClient.from('documents').delete().in('folder_id', allFolderIds);
    }

    // Delete all descendant folders (deepest first via reverse order)
    for (const fid of allFolderIds.reverse()) {
      await userClient.from('folders').delete().eq('id', fid);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
