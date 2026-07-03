import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Server-side API Route for creating employee accounts.
 * Uses the service_role_key to bypass RLS and create auth users programmatically.
 * This key NEVER reaches the client — it's only accessible server-side.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado. Se requiere token de sesión.' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    const body = await request.json();
    const { email, full_name, password, occupation } = body;

    if (!email || !full_name) {
      return NextResponse.json(
        { error: 'Email y Nombre son campos obligatorios.' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !serviceRoleKey || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Configuración de servidor incompleta. Contacte al administrador.' },
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

    // Create an admin client with the service_role_key (bypasses RLS)
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

    // 1. Create the auth user
    const { data: authData, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: password || `SolarHub_${Date.now()}`,
      email_confirm: true,
      user_metadata: {
        full_name,
      },
    });

    if (createAuthError) {
      console.error('Error creating auth user:', createAuthError);
      return NextResponse.json(
        { error: createAuthError.message },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'No se pudo crear la cuenta de usuario.' },
        { status: 500 }
      );
    }

    // 2. The trigger `on_auth_user_created` will auto-create the profile,
    //    but we need to update the occupation if provided
    if (occupation && occupation.length > 0) {
      // Small delay to allow the trigger to execute
      await new Promise(resolve => setTimeout(resolve, 500));

      const { error: updateErr } = await supabaseAdmin
        .from('profiles')
        .update({ occupation })
        .eq('id', authData.user.id);

      if (updateErr) {
        console.error('Error updating occupation:', updateErr);
        // Non-fatal — profile was still created
      }
    }

    return NextResponse.json({
      success: true,
      message: `Empleado ${full_name} creado exitosamente.`,
      profileId: authData.user.id,
    });
  } catch (error: any) {
    console.error('Unhandled error in create-employee:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}
