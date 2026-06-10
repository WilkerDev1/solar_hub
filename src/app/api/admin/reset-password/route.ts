import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Server-side API Route for resetting user passwords.
 * Requires bearer authorization token in headers.
 * Verifies that the requester is an Administrador.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado. Se requiere token de sesión.' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    const body = await request.json();
    const { userId, password } = body;

    if (!userId || !password) {
      return NextResponse.json(
        { error: 'ID de usuario y contraseña son campos obligatorios.' },
        { status: 450 } // or 400
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !serviceRoleKey || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Configuración del servidor incompleta. Contacte al soporte técnico.' },
        { status: 500 }
      );
    }

    // 1. Validate the user session using the Bearer token
    const supabaseUserClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    const { data: { user }, error: authError } = await supabaseUserClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Sesión no válida o expirada.' }, { status: 401 });
    }

    // Initialize admin client to bypass RLS for administrative operations
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 2. Verify requester is an Administrador
    const { data: userRoleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('roles(name)')
      .eq('user_id', user.id)
      .single();

    if (roleError || !userRoleData) {
      console.error('Error verifying admin permissions:', roleError);
      return NextResponse.json({ error: 'No se pudieron verificar los permisos del solicitante.' }, { status: 403 });
    }

    const roleName = (userRoleData as any)?.roles?.name;
    if (roleName !== 'Administrador') {
      return NextResponse.json({ error: 'Operación denegada. Se requiere rol de Administrador.' }, { status: 403 });
    }

    // 3. Reset the target user password via Admin API
    const { error: resetError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: password,
    });

    if (resetError) {
      console.error('Error resetting password via auth admin API:', resetError);
      return NextResponse.json({ error: resetError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Contraseña restablecida exitosamente.',
    });
  } catch (error: any) {
    console.error('Unhandled error in reset-password API Route:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}
