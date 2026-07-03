-- Migration: Create Agente Virtual role and Caleb user account
-- Objective: Map Caleb virtual assistant in database with administrative permissions

DO $$
DECLARE
    default_comp_id UUID;
    agente_virtual_role_id UUID;
    caleb_user_id UUID := 'ca1eb000-0000-0000-0000-000000000000'; -- Deterministic UUID for Caleb
BEGIN
    -- Get default company ID
    SELECT id INTO default_comp_id FROM public.companies WHERE slug = 'default-tenant';

    IF default_comp_id IS NOT NULL THEN
        -- 1. Insert Agente Virtual role if not exists
        INSERT INTO public.roles (company_id, name, description)
        VALUES (default_comp_id, 'Agente Virtual', 'Asistente de inteligencia artificial con permisos de gestión')
        ON CONFLICT (company_id, name) DO NOTHING;

        -- Get role ID
        SELECT id INTO agente_virtual_role_id FROM public.roles WHERE company_id = default_comp_id AND name = 'Agente Virtual';

        -- 2. Insert role permissions template for Agente Virtual
        INSERT INTO public.role_permissions_templates (company_id, role_name, permission_actions)
        VALUES (default_comp_id, 'Agente Virtual', ARRAY['admin:*', 'project:read', 'project:create', 'project:update', 'project:delete', 'inventory:read', 'inventory:use_material', 'client:read', 'client:write', 'client:manage'])
        ON CONFLICT (company_id, role_name) DO UPDATE
        SET permission_actions = EXCLUDED.permission_actions;

        -- 3. Create Caleb in auth.users if not exists
        IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'caleb@solarhub.com') THEN
            INSERT INTO auth.users (
                instance_id,
                id,
                aud,
                role,
                email,
                encrypted_password,
                email_confirmed_at,
                recovery_sent_at,
                last_sign_in_at,
                raw_app_meta_data,
                raw_user_meta_data,
                created_at,
                updated_at,
                confirmation_token,
                email_change,
                email_change_token_new,
                recovery_token
            )
            VALUES (
                '00000000-0000-0000-0000-000000000000',
                caleb_user_id,
                'authenticated',
                'authenticated',
                'caleb@solarhub.com',
                crypt('SolarHub2026*', gen_salt('bf')),
                current_timestamp,
                current_timestamp,
                current_timestamp,
                '{"provider":"email","providers":["email"]}',
                '{"full_name":"Agente Caleb"}',
                current_timestamp,
                current_timestamp,
                '',
                '',
                '',
                ''
            );

            -- Create Identity for login
            INSERT INTO auth.identities (
                id,
                user_id,
                provider_id,
                identity_data,
                provider,
                last_sign_in_at,
                created_at,
                updated_at
            )
            VALUES (
                gen_random_uuid(),
                caleb_user_id,
                caleb_user_id::text,
                format('{"sub":"%s","email":"caleb@solarhub.com"}', caleb_user_id::text)::jsonb,
                'email',
                current_timestamp,
                current_timestamp,
                current_timestamp
            )
            ON CONFLICT (provider_id, provider) DO NOTHING;

            -- Re-map Caleb's role in public.user_roles to 'Agente Virtual'
            -- Trigger handle_new_user() runs automatically and inserts a profile + 'Administrador' mapping
            -- We delete the automatically created role and insert the correct one
            DELETE FROM public.user_roles WHERE user_id = caleb_user_id;
            INSERT INTO public.user_roles (user_id, role_id)
            VALUES (caleb_user_id, agente_virtual_role_id);
        ELSE
            -- Caleb exists, make sure he is mapped to Agente Virtual
            SELECT id INTO caleb_user_id FROM auth.users WHERE email = 'caleb@solarhub.com';
            DELETE FROM public.user_roles WHERE user_id = caleb_user_id;
            INSERT INTO public.user_roles (user_id, role_id)
            VALUES (caleb_user_id, agente_virtual_role_id);
        END IF;
    END IF;
END;
$$;
