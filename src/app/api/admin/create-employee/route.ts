import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Server-side API Route for creating employee accounts.
 * Uses the service_role_key to bypass RLS and create auth users programmatically.
 * This key NEVER reaches the client — it's only accessible server-side.
 */
export async function POST(request: NextRequest) {
  try {
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

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Configuración de servidor incompleta. Contacte al administrador.' },
        { status: 500 }
      );
    }

    // Create an admin client with the service_role_key (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 1. Create the auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: password || `SolarHub_${Date.now()}`,
      email_confirm: true,
      user_metadata: {
        full_name,
      },
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      return NextResponse.json(
        { error: authError.message },
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
