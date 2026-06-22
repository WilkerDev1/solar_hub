export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      clients: {
        Row: {
          address: string | null
          avg_kwh_consumption: number | null
          category: string | null
          company_id: string
          created_at: string
          created_by: string | null
          document_id: string | null
          id: string
          name: string
          phone: string | null
          status: string
        }
        Insert: {
          address?: string | null
          avg_kwh_consumption?: number | null
          category?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          document_id?: string | null
          id?: string
          name: string
          phone?: string | null
          status?: string
        }
        Update: {
          address?: string | null
          avg_kwh_consumption?: number | null
          category?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          document_id?: string | null
          id?: string
          name?: string
          phone?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      global_tasks: {
        Row: {
          area: string | null
          assigned_to: string
          assigned_to_ids: string[] | null
          audit_comments: string | null
          audit_status: string | null
          company_id: string
          created_at: string
          created_by: string | null
          delivery_date: string | null
          description: string | null
          due_date: string | null
          evidence_urls: string[] | null
          id: string
          origin: string
          priority: string | null
          project_id: string | null
          requires_audit: boolean
          status: string
          subtasks: Json | null
          tags: string[] | null
          task_activities: Json | null
          task_comments: Json | null
          task_materials: Json | null
          task_type: string
          title: string
        }
        Insert: {
          area?: string | null
          assigned_to: string
          assigned_to_ids?: string[] | null
          audit_comments?: string | null
          audit_status?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          delivery_date?: string | null
          description?: string | null
          due_date?: string | null
          evidence_urls?: string[] | null
          id?: string
          origin: string
          priority?: string | null
          project_id?: string | null
          requires_audit?: boolean
          status?: string
          subtasks?: Json | null
          tags?: string[] | null
          task_activities?: Json | null
          task_comments?: Json | null
          task_materials?: Json | null
          task_type?: string
          title: string
        }
        Update: {
          area?: string | null
          assigned_to?: string
          assigned_to_ids?: string[] | null
          audit_comments?: string | null
          audit_status?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          delivery_date?: string | null
          description?: string | null
          due_date?: string | null
          evidence_urls?: string[] | null
          id?: string
          origin?: string
          priority?: string | null
          project_id?: string | null
          requires_audit?: boolean
          status?: string
          subtasks?: Json | null
          tags?: string[] | null
          task_activities?: Json | null
          task_comments?: Json | null
          task_materials?: Json | null
          task_type?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "global_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "global_tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "global_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_categories: {
        Row: {
          company_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          category_id: string | null
          company_id: string
          cost: number
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          image_urls: string[]
          length: number | null
          min_stock: number
          name: string
          packaging: string | null
          providers: string[]
          sku: string
          stock: number
          tags: string[]
          unit: string
          updated_at: string
          usage_count: number
          weight: number | null
        }
        Insert: {
          category_id?: string | null
          company_id: string
          cost?: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          image_urls?: string[]
          length?: number | null
          min_stock?: number
          name: string
          packaging?: string | null
          providers?: string[]
          sku: string
          stock?: number
          tags?: string[]
          unit?: string
          updated_at?: string
          usage_count?: number
          weight?: number | null
        }
        Update: {
          category_id?: string | null
          company_id?: string
          cost?: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          image_urls?: string[]
          length?: number | null
          min_stock?: number
          name?: string
          packaging?: string | null
          providers?: string[]
          sku?: string
          stock?: number
          tags?: string[]
          unit?: string
          updated_at?: string
          usage_count?: number
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "inventory_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_tags: {
        Row: {
          company_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_tags_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transactions: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          item_id: string
          project_id: string | null
          quantity: number
          reason: string
          transaction_type: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          item_id: string
          project_id?: string | null
          quantity: number
          reason: string
          transaction_type: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          item_id?: string
          project_id?: string | null
          quantity?: number
          reason?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          action: string
          created_at: string
          description: string | null
          id: string
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          id?: string
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_active: boolean | null
          occupation: string[] | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean | null
          occupation?: string[] | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          occupation?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      project_materials: {
        Row: {
          company_id: string
          created_at: string
          id: string
          item_id: string
          project_id: string
          quantity: number
          required_quantity: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          item_id: string
          project_id: string
          quantity?: number
          required_quantity?: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          item_id?: string
          project_id?: string
          quantity?: number
          required_quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_materials_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_materials_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          profile_id: string
          project_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          profile_id: string
          project_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          profile_id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_messages_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          banner_url: string | null
          capacity: string | null
          client_id: string
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          gps_coordinates: string | null
          id: string
          location: string | null
          member_ids: string[] | null
          name: string
          phase: string
          status: string
        }
        Insert: {
          banner_url?: string | null
          capacity?: string | null
          client_id: string
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          gps_coordinates?: string | null
          id?: string
          location?: string | null
          member_ids?: string[] | null
          name: string
          phase?: string
          status?: string
        }
        Update: {
          banner_url?: string | null
          capacity?: string | null
          client_id?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          gps_coordinates?: string | null
          id?: string
          location?: string | null
          member_ids?: string[] | null
          name?: string
          phase?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          permission_id: string
          role_id: string
        }
        Insert: {
          created_at?: string
          permission_id: string
          role_id: string
        }
        Update: {
          created_at?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions_templates: {
        Row: {
          company_id: string
          created_at: string
          id: string
          permission_actions: string[]
          role_name: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          permission_actions?: string[]
          role_name: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          permission_actions?: string[]
          role_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          role_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          id: string
          company_id: string
          folder_id: string | null
          name: string
          physical_path: string
          file_size: number
          mime_type: string
          uploaded_by: string | null
          task_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          folder_id?: string | null
          name: string
          physical_path: string
          file_size: number
          mime_type: string
          uploaded_by?: string | null
          task_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          folder_id?: string | null
          name?: string
          physical_path?: string
          file_size?: number
          mime_type?: string
          uploaded_by?: string | null
          task_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      folders: {
        Row: {
          id: string
          company_id: string
          parent_id: string | null
          project_id: string | null
          department_id: string | null
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          parent_id?: string | null
          project_id?: string | null
          department_id?: string | null
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          parent_id?: string | null
          project_id?: string | null
          department_id?: string | null
          name?: string
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      dispatch_material_to_project: {
        Args: { it_id: string; proj_id: string; qty: number; reason: string }
        Returns: undefined
      }
      get_user_active_company: { Args: never; Returns: string }
      process_inventory_transactions: {
        Args: { adjustments: Json }
        Returns: undefined
      }
      user_has_permission: {
        Args: { required_action: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

