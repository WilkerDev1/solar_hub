-- Core Schema Migration for Solar Hub: Multi-tenant RBAC & RLS

-- 1. Create Companies (Tenants) Table
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on companies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- 2. Create Profiles Table (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  full_name TEXT,
  email TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 3. Create Permissions Table (actions catalog)
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT UNIQUE NOT NULL, -- e.g., 'project:create', 'project:delete', 'inventory:read'
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on permissions (mostly read-only for authenticated users)
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

-- 4. Create Roles Table (Scoped to a specific company/tenant)
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL, -- e.g., 'Admin', 'Técnico de Campo', 'Legal'
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (company_id, name)
);

-- Enable RLS on roles
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- 5. Create Role Permissions Table (Join table)
CREATE TABLE role_permissions (
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE NOT NULL,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (role_id, permission_id)
);

-- Enable RLS on role_permissions
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- 6. Create User Roles Table (Join table mapping users/profiles to roles)
CREATE TABLE user_roles (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (user_id, role_id)
);

-- Enable RLS on user_roles
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;


--------------------------------------------------------------------------------
-- Helper Authorization functions for RLS & App Logic
--------------------------------------------------------------------------------

-- Helper to check if a user has access to a specific company
CREATE OR REPLACE FUNCTION get_user_active_company()
RETURNS UUID AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper to check if a user has a specific permission in their active company
CREATE OR REPLACE FUNCTION user_has_permission(required_action TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  has_perm BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
      AND r.company_id = get_user_active_company()
      AND (p.action = required_action OR p.action = 'admin:*')
  ) INTO has_perm;
  
  RETURN COALESCE(has_perm, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


--------------------------------------------------------------------------------
-- Row Level Security (RLS) Policies
--------------------------------------------------------------------------------

-- Companies Policies
CREATE POLICY "Users can view their own company" ON companies
  FOR SELECT USING (id = get_user_active_company());

CREATE POLICY "Admins can update their own company details" ON companies
  FOR UPDATE USING (id = get_user_active_company() AND user_has_permission('company:write'));

-- Profiles Policies
CREATE POLICY "Users can view other profiles in the same company" ON profiles
  FOR SELECT USING (id = auth.uid() OR company_id = get_user_active_company());

CREATE POLICY "Users can update their own profile details" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- Permissions Policies
CREATE POLICY "Authenticated users can read permissions catalog" ON permissions
  FOR SELECT TO authenticated USING (true);

-- Roles Policies
CREATE POLICY "Users can view roles in their company" ON roles
  FOR SELECT USING (company_id = get_user_active_company());

CREATE POLICY "Admins can manage roles in their company" ON roles
  FOR ALL USING (company_id = get_user_active_company() AND user_has_permission('role:manage'));

-- Role Permissions Policies
CREATE POLICY "Users can view permissions mapped to roles in their company" ON role_permissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM roles r 
      WHERE r.id = role_permissions.role_id 
        AND r.company_id = get_user_active_company()
    )
  );

-- User Roles Policies
CREATE POLICY "Users can view role mappings in their company" ON user_roles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM roles r 
      WHERE r.id = user_roles.role_id 
        AND r.company_id = get_user_active_company()
    )
  );
