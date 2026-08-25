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
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
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
      accounts: {
        Row: {
          created_at: string | null
          created_by: string | null
          email: string | null
          id: string
          is_personal_account: boolean
          name: string
          picture_url: string | null
          primary_owner_user_id: string
          public_data: Json
          slug: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          is_personal_account?: boolean
          name: string
          picture_url?: string | null
          primary_owner_user_id?: string
          public_data?: Json
          slug?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          is_personal_account?: boolean
          name?: string
          picture_url?: string | null
          primary_owner_user_id?: string
          public_data?: Json
          slug?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      accounts_memberships: {
        Row: {
          account_id: string
          account_role: string
          created_at: string
          created_by: string | null
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          account_id: string
          account_role: string
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          account_id?: string
          account_role?: string
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_memberships_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_memberships_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "user_account_workspace"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_memberships_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_memberships_account_role_fkey"
            columns: ["account_role"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["name"]
          },
        ]
      }
      atlassian_config: {
        Row: {
          access_token: string
          access_token_expires_at: string
          atlassian_account_id: string
          atlassian_base_url: string
          atlassian_cloud_id: string
          atlassian_display_name: string | null
          atlassian_email: string | null
          created_at: string
          id: string
          is_syncing: boolean
          last_synced_at: string | null
          refresh_token: string
          refresh_token_expires_at: string
          refresh_token_inactivity_expires_at: string
          selected_confluence_spaces: Json
          selected_jira_boards: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          access_token_expires_at: string
          atlassian_account_id: string
          atlassian_base_url: string
          atlassian_cloud_id: string
          atlassian_display_name?: string | null
          atlassian_email?: string | null
          created_at?: string
          id?: string
          is_syncing?: boolean
          last_synced_at?: string | null
          refresh_token: string
          refresh_token_expires_at: string
          refresh_token_inactivity_expires_at: string
          selected_confluence_spaces?: Json
          selected_jira_boards?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          access_token_expires_at?: string
          atlassian_account_id?: string
          atlassian_base_url?: string
          atlassian_cloud_id?: string
          atlassian_display_name?: string | null
          atlassian_email?: string | null
          created_at?: string
          id?: string
          is_syncing?: boolean
          last_synced_at?: string | null
          refresh_token?: string
          refresh_token_expires_at?: string
          refresh_token_inactivity_expires_at?: string
          selected_confluence_spaces?: Json
          selected_jira_boards?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      autojoin_emails: {
        Row: {
          created_at: string
          deleted_at: string | null
          email_handle: string
          id: string
          is_deleted: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          email_handle: string
          id?: string
          is_deleted?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          email_handle?: string
          id?: string
          is_deleted?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      billing_customers: {
        Row: {
          account_id: string
          customer_id: string
          email: string | null
          id: number
          provider: Database["public"]["Enums"]["billing_provider"]
        }
        Insert: {
          account_id: string
          customer_id: string
          email?: string | null
          id?: number
          provider: Database["public"]["Enums"]["billing_provider"]
        }
        Update: {
          account_id?: string
          customer_id?: string
          email?: string | null
          id?: number
          provider?: Database["public"]["Enums"]["billing_provider"]
        }
        Relationships: [
          {
            foreignKeyName: "billing_customers_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_customers_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "user_account_workspace"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_customers_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      config: {
        Row: {
          billing_provider: Database["public"]["Enums"]["billing_provider"]
          enable_account_billing: boolean
          enable_team_account_billing: boolean
          enable_team_accounts: boolean
        }
        Insert: {
          billing_provider?: Database["public"]["Enums"]["billing_provider"]
          enable_account_billing?: boolean
          enable_team_account_billing?: boolean
          enable_team_accounts?: boolean
        }
        Update: {
          billing_provider?: Database["public"]["Enums"]["billing_provider"]
          enable_account_billing?: boolean
          enable_team_account_billing?: boolean
          enable_team_accounts?: boolean
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          favourite: boolean
          id: string
          shared_with_team: boolean
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          favourite?: boolean
          id?: string
          shared_with_team?: boolean
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          favourite?: boolean
          id?: string
          shared_with_team?: boolean
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      document_action_item_relations: {
        Row: {
          action_item_id: number
          created_at: string
          document_id: number
          id: number
        }
        Insert: {
          action_item_id: number
          created_at?: string
          document_id: number
          id?: number
        }
        Update: {
          action_item_id?: number
          created_at?: string
          document_id?: number
          id?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_action_item_relations_action_item_id_fkey"
            columns: ["action_item_id"]
            isOneToOne: false
            referencedRelation: "document_action_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_action_item_relations_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_action_items: {
        Row: {
          created_at: string
          id: number
          status: Database["public"]["Enums"]["action_item_status_enum"]
          summary: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          status?: Database["public"]["Enums"]["action_item_status_enum"]
          summary?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: number
          status?: Database["public"]["Enums"]["action_item_status_enum"]
          summary?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      document_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string
          document_id: number | null
          embedding: string
          id: number
          max_chunk_index: number
          updated_at: string
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string
          document_id?: number | null
          embedding: string
          id?: number
          max_chunk_index: number
          updated_at?: string
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string
          document_id?: number | null
          embedding?: string
          id?: number
          max_chunk_index?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_quality_flag_relations: {
        Row: {
          created_at: string
          flag_id: number
          id: number
          related_document_id: number
        }
        Insert: {
          created_at?: string
          flag_id: number
          id?: number
          related_document_id: number
        }
        Update: {
          created_at?: string
          flag_id?: number
          id?: number
          related_document_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_quality_flag_relations_flag_id_fkey"
            columns: ["flag_id"]
            isOneToOne: false
            referencedRelation: "document_quality_flags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_quality_flag_relations_related_document_id_fkey"
            columns: ["related_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_quality_flags: {
        Row: {
          created_at: string
          details: string
          document_id: number
          flag_type: Database["public"]["Enums"]["flag_type_enum"]
          id: number
          recommended_action: Database["public"]["Enums"]["recommended_action_enum"]
          relevancy: number
          status: Database["public"]["Enums"]["flag_status_enum"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          details: string
          document_id: number
          flag_type: Database["public"]["Enums"]["flag_type_enum"]
          id?: number
          recommended_action: Database["public"]["Enums"]["recommended_action_enum"]
          relevancy: number
          status?: Database["public"]["Enums"]["flag_status_enum"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          details?: string
          document_id?: number
          flag_type?: Database["public"]["Enums"]["flag_type_enum"]
          id?: number
          recommended_action?: Database["public"]["Enums"]["recommended_action_enum"]
          relevancy?: number
          status?: Database["public"]["Enums"]["flag_status_enum"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_quality_flags_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_updates: {
        Row: {
          action_type:
            | Database["public"]["Enums"]["document_update_action_type"]
            | null
          content_after: string | null
          content_before: string | null
          created_at: string
          executed_at: string | null
          execution_data: Json | null
          id: string
          meeting_id: string
          source: Database["public"]["Enums"]["document_source"]
          source_id: string | null
          status: Database["public"]["Enums"]["document_update_action_status"]
          title: string | null
          update_summary: string | null
          updated_at: string
          url: string | null
          user_id: string
        }
        Insert: {
          action_type?:
            | Database["public"]["Enums"]["document_update_action_type"]
            | null
          content_after?: string | null
          content_before?: string | null
          created_at?: string
          executed_at?: string | null
          execution_data?: Json | null
          id?: string
          meeting_id: string
          source: Database["public"]["Enums"]["document_source"]
          source_id?: string | null
          status?: Database["public"]["Enums"]["document_update_action_status"]
          title?: string | null
          update_summary?: string | null
          updated_at?: string
          url?: string | null
          user_id: string
        }
        Update: {
          action_type?:
            | Database["public"]["Enums"]["document_update_action_type"]
            | null
          content_after?: string | null
          content_before?: string | null
          created_at?: string
          executed_at?: string | null
          execution_data?: Json | null
          id?: string
          meeting_id?: string
          source?: Database["public"]["Enums"]["document_source"]
          source_id?: string | null
          status?: Database["public"]["Enums"]["document_update_action_status"]
          title?: string | null
          update_summary?: string | null
          updated_at?: string
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_updates_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      document_user_access: {
        Row: {
          created_at: string
          document_id: number
          id: number
          user_id: string
        }
        Insert: {
          created_at?: string
          document_id: number
          id?: number
          user_id: string
        }
        Update: {
          created_at?: string
          document_id?: number
          id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_user_access_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          content: string
          created_at: string
          hierarchy_path: string | null
          id: number
          last_updated_source_user_id: string | null
          metadata: Json | null
          source: Database["public"]["Enums"]["document_source"]
          source_author_id: string | null
          source_id: string
          source_mentioned_user_ids: string[] | null
          source_parent_id: string | null
          source_updated_at: string
          summary: string
          summary_embedding: string
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          hierarchy_path?: string | null
          id?: number
          last_updated_source_user_id?: string | null
          metadata?: Json | null
          source: Database["public"]["Enums"]["document_source"]
          source_author_id?: string | null
          source_id: string
          source_mentioned_user_ids?: string[] | null
          source_parent_id?: string | null
          source_updated_at: string
          summary: string
          summary_embedding: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          hierarchy_path?: string | null
          id?: number
          last_updated_source_user_id?: string | null
          metadata?: Json | null
          source?: Database["public"]["Enums"]["document_source"]
          source_author_id?: string | null
          source_id?: string
          source_mentioned_user_ids?: string[] | null
          source_parent_id?: string | null
          source_updated_at?: string
          summary?: string
          summary_embedding?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      google_config: {
        Row: {
          access_token: string
          change_page_token: string | null
          created_at: string
          drive_root_folder_id: string | null
          email: string | null
          granted_scopes: string[] | null
          id: string
          is_syncing: boolean
          last_synced_at: string | null
          name: string | null
          picture: string | null
          refresh_token: string
          selected_folders: Json
          token_expiry: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          change_page_token?: string | null
          created_at?: string
          drive_root_folder_id?: string | null
          email?: string | null
          granted_scopes?: string[] | null
          id?: string
          is_syncing?: boolean
          last_synced_at?: string | null
          name?: string | null
          picture?: string | null
          refresh_token: string
          selected_folders?: Json
          token_expiry?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          change_page_token?: string | null
          created_at?: string
          drive_root_folder_id?: string | null
          email?: string | null
          granted_scopes?: string[] | null
          id?: string
          is_syncing?: boolean
          last_synced_at?: string | null
          name?: string | null
          picture?: string | null
          refresh_token?: string
          selected_folders?: Json
          token_expiry?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      invitations: {
        Row: {
          account_id: string
          created_at: string
          email: string
          expires_at: string
          id: number
          invite_token: string
          invited_by: string
          role: string
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          email: string
          expires_at?: string
          id?: number
          invite_token: string
          invited_by: string
          role: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: number
          invite_token?: string
          invited_by?: string
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "user_account_workspace"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_role_fkey"
            columns: ["role"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["name"]
          },
        ]
      }
      meetings: {
        Row: {
          bot_id: string | null
          created_at: string
          id: string
          is_scheduled: boolean
          meeting_url: string | null
          scheduled_at: string | null
          status: Database["public"]["Enums"]["meeting_status"]
          time_end: string | null
          time_start: string | null
          title: string | null
          transcript: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bot_id?: string | null
          created_at?: string
          id?: string
          is_scheduled?: boolean
          meeting_url?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["meeting_status"]
          time_end?: string | null
          time_start?: string | null
          title?: string | null
          transcript?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bot_id?: string | null
          created_at?: string
          id?: string
          is_scheduled?: boolean
          meeting_url?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["meeting_status"]
          time_end?: string | null
          time_start?: string | null
          title?: string | null
          transcript?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          feedback: Database["public"]["Enums"]["message_feedback"] | null
          id: number
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          feedback?: Database["public"]["Enums"]["message_feedback"] | null
          id?: number
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          feedback?: Database["public"]["Enums"]["message_feedback"] | null
          id?: number
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      microsoft_config: {
        Row: {
          access_token: string
          access_token_expires_at: string
          created_at: string
          id: string
          is_syncing: boolean
          last_synced_at: string | null
          microsoft_account_id: string | null
          microsoft_display_name: string | null
          microsoft_email: string | null
          refresh_token: string
          refresh_token_expires_at: string
          refresh_token_inactivity_expires_at: string
          selected_sharepoint_sites: Json
          sharepoint_base_url: string | null
          sharepoint_root_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          access_token_expires_at: string
          created_at?: string
          id?: string
          is_syncing?: boolean
          last_synced_at?: string | null
          microsoft_account_id?: string | null
          microsoft_display_name?: string | null
          microsoft_email?: string | null
          refresh_token: string
          refresh_token_expires_at: string
          refresh_token_inactivity_expires_at: string
          selected_sharepoint_sites?: Json
          sharepoint_base_url?: string | null
          sharepoint_root_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          access_token_expires_at?: string
          created_at?: string
          id?: string
          is_syncing?: boolean
          last_synced_at?: string | null
          microsoft_account_id?: string | null
          microsoft_display_name?: string | null
          microsoft_email?: string | null
          refresh_token?: string
          refresh_token_expires_at?: string
          refresh_token_inactivity_expires_at?: string
          selected_sharepoint_sites?: Json
          sharepoint_base_url?: string | null
          sharepoint_root_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          account_id: string
          body: string
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          dismissed: boolean
          expires_at: string | null
          id: number
          link: string | null
          type: Database["public"]["Enums"]["notification_type"]
        }
        Insert: {
          account_id: string
          body: string
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          dismissed?: boolean
          expires_at?: string | null
          id?: never
          link?: string | null
          type?: Database["public"]["Enums"]["notification_type"]
        }
        Update: {
          account_id?: string
          body?: string
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          dismissed?: boolean
          expires_at?: string | null
          id?: never
          link?: string | null
          type?: Database["public"]["Enums"]["notification_type"]
        }
        Relationships: [
          {
            foreignKeyName: "notifications_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "user_account_workspace"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      notion_config: {
        Row: {
          access_token: string
          bot_id: string
          created_at: string
          id: string
          is_syncing: boolean
          last_synced_at: string | null
          owner_email: string | null
          owner_id: string | null
          owner_name: string | null
          updated_at: string
          user_id: string
          workspace_icon: string | null
          workspace_id: string
          workspace_name: string | null
        }
        Insert: {
          access_token: string
          bot_id: string
          created_at?: string
          id?: string
          is_syncing?: boolean
          last_synced_at?: string | null
          owner_email?: string | null
          owner_id?: string | null
          owner_name?: string | null
          updated_at?: string
          user_id: string
          workspace_icon?: string | null
          workspace_id: string
          workspace_name?: string | null
        }
        Update: {
          access_token?: string
          bot_id?: string
          created_at?: string
          id?: string
          is_syncing?: boolean
          last_synced_at?: string | null
          owner_email?: string | null
          owner_id?: string | null
          owner_name?: string | null
          updated_at?: string
          user_id?: string
          workspace_icon?: string | null
          workspace_id?: string
          workspace_name?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          price_amount: number | null
          product_id: string
          quantity: number
          updated_at: string
          variant_id: string
        }
        Insert: {
          created_at?: string
          id: string
          order_id: string
          price_amount?: number | null
          product_id: string
          quantity?: number
          updated_at?: string
          variant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          price_amount?: number | null
          product_id?: string
          quantity?: number
          updated_at?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          account_id: string
          billing_customer_id: number
          billing_provider: Database["public"]["Enums"]["billing_provider"]
          created_at: string
          currency: string
          id: string
          status: Database["public"]["Enums"]["payment_status"]
          total_amount: number
          updated_at: string
        }
        Insert: {
          account_id: string
          billing_customer_id: number
          billing_provider: Database["public"]["Enums"]["billing_provider"]
          created_at?: string
          currency: string
          id: string
          status: Database["public"]["Enums"]["payment_status"]
          total_amount: number
          updated_at?: string
        }
        Update: {
          account_id?: string
          billing_customer_id?: number
          billing_provider?: Database["public"]["Enums"]["billing_provider"]
          created_at?: string
          currency?: string
          id?: string
          status?: Database["public"]["Enums"]["payment_status"]
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "user_account_workspace"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_billing_customer_id_fkey"
            columns: ["billing_customer_id"]
            isOneToOne: false
            referencedRelation: "billing_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          id: number
          permission: Database["public"]["Enums"]["app_permissions"]
          role: string
        }
        Insert: {
          id?: number
          permission: Database["public"]["Enums"]["app_permissions"]
          role: string
        }
        Update: {
          id?: number
          permission?: Database["public"]["Enums"]["app_permissions"]
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_role_fkey"
            columns: ["role"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["name"]
          },
        ]
      }
      roles: {
        Row: {
          hierarchy_level: number
          name: string
        }
        Insert: {
          hierarchy_level: number
          name: string
        }
        Update: {
          hierarchy_level?: number
          name?: string
        }
        Relationships: []
      }
      subscription_items: {
        Row: {
          created_at: string
          id: string
          interval: string
          interval_count: number
          price_amount: number | null
          product_id: string
          quantity: number
          subscription_id: string
          type: Database["public"]["Enums"]["subscription_item_type"]
          updated_at: string
          variant_id: string
        }
        Insert: {
          created_at?: string
          id: string
          interval: string
          interval_count: number
          price_amount?: number | null
          product_id: string
          quantity?: number
          subscription_id: string
          type: Database["public"]["Enums"]["subscription_item_type"]
          updated_at?: string
          variant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          interval?: string
          interval_count?: number
          price_amount?: number | null
          product_id?: string
          quantity?: number
          subscription_id?: string
          type?: Database["public"]["Enums"]["subscription_item_type"]
          updated_at?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_items_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          account_id: string
          active: boolean
          billing_customer_id: number
          billing_provider: Database["public"]["Enums"]["billing_provider"]
          cancel_at_period_end: boolean
          created_at: string
          currency: string
          id: string
          period_ends_at: string
          period_starts_at: string
          status: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at: string | null
          trial_starts_at: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          active: boolean
          billing_customer_id: number
          billing_provider: Database["public"]["Enums"]["billing_provider"]
          cancel_at_period_end: boolean
          created_at?: string
          currency: string
          id: string
          period_ends_at: string
          period_starts_at: string
          status: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string | null
          trial_starts_at?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          active?: boolean
          billing_customer_id?: number
          billing_provider?: Database["public"]["Enums"]["billing_provider"]
          cancel_at_period_end?: boolean
          created_at?: string
          currency?: string
          id?: string
          period_ends_at?: string
          period_starts_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string | null
          trial_starts_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "user_account_workspace"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_billing_customer_id_fkey"
            columns: ["billing_customer_id"]
            isOneToOne: false
            referencedRelation: "billing_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      update_preferences: {
        Row: {
          created_at: string
          document_auto_update: boolean
          document_generation_enabled: boolean
          id: string
          preferred_document_source:
            | Database["public"]["Enums"]["document_source"]
            | null
          preferred_ticket_source:
            | Database["public"]["Enums"]["document_source"]
            | null
          ticket_auto_update: boolean
          ticket_generation_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_auto_update?: boolean
          document_generation_enabled?: boolean
          id?: string
          preferred_document_source?:
            | Database["public"]["Enums"]["document_source"]
            | null
          preferred_ticket_source?:
            | Database["public"]["Enums"]["document_source"]
            | null
          ticket_auto_update?: boolean
          ticket_generation_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          document_auto_update?: boolean
          document_generation_enabled?: boolean
          id?: string
          preferred_document_source?:
            | Database["public"]["Enums"]["document_source"]
            | null
          preferred_ticket_source?:
            | Database["public"]["Enums"]["document_source"]
            | null
          ticket_auto_update?: boolean
          ticket_generation_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      user_account_workspace: {
        Row: {
          id: string | null
          name: string | null
          picture_url: string | null
          subscription_status:
            | Database["public"]["Enums"]["subscription_status"]
            | null
        }
        Relationships: []
      }
      user_accounts: {
        Row: {
          id: string | null
          name: string | null
          picture_url: string | null
          role: string | null
          slug: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_memberships_account_role_fkey"
            columns: ["role"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["name"]
          },
        ]
      }
    }
    Functions: {
      accept_invitation: {
        Args: {
          token: string
          user_id: string
        }
        Returns: string
      }
      add_invitations_to_account: {
        Args: {
          account_slug: string
          invitations: Database["public"]["CompositeTypes"]["invitation"][]
        }
        Returns: Database["public"]["Tables"]["invitations"]["Row"][]
      }
      binary_quantize:
        | {
            Args: {
              "": string
            }
            Returns: unknown
          }
        | {
            Args: {
              "": unknown
            }
            Returns: unknown
          }
      can_action_account_member: {
        Args: {
          target_team_account_id: string
          target_user_id: string
        }
        Returns: boolean
      }
      cleanup_orphaned_docs: {
        Args: {
          cutoff_date: string
        }
        Returns: {
          deleted_chunks: number
          deleted_docs: number
        }[]
      }
      count_documents_by_source: {
        Args: {
          source_input?: Database["public"]["Enums"]["document_source"]
          filter_object?: Json
        }
        Returns: number
      }
      count_documents_by_source_type: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      create_invitation: {
        Args: {
          account_id: string
          email: string
          role: string
        }
        Returns: {
          account_id: string
          created_at: string
          email: string
          expires_at: string
          id: number
          invite_token: string
          invited_by: string
          role: string
          updated_at: string
        }
      }
      create_team_account: {
        Args: {
          account_name: string
        }
        Returns: {
          created_at: string | null
          created_by: string | null
          email: string | null
          id: string
          is_personal_account: boolean
          name: string
          picture_url: string | null
          primary_owner_user_id: string
          public_data: Json
          slug: string | null
          updated_at: string | null
          updated_by: string | null
        }
      }
      delete_document_by_source: {
        Args: {
          source_id_input: string
          source_type_input: Database["public"]["Enums"]["document_source"]
          user_id_input: string
        }
        Returns: Record<string, unknown>
      }
      find_action_item_documents: {
        Args: {
          p_user_id: string
          mentions: string[]
          source_ids: string[]
          p_days_interval?: number
        }
        Returns: {
          document_id: number
        }[]
      }
      generate_unique_email_handle: {
        Args: {
          user_id: string
        }
        Returns: string
      }
      get_account_invitations: {
        Args: {
          account_slug: string
        }
        Returns: {
          id: number
          email: string
          account_id: string
          invited_by: string
          role: string
          created_at: string
          updated_at: string
          expires_at: string
          inviter_name: string
          inviter_email: string
        }[]
      }
      get_account_members: {
        Args: {
          account_slug: string
        }
        Returns: {
          id: string
          user_id: string
          account_id: string
          role: string
          role_hierarchy_level: number
          primary_owner_user_id: string
          name: string
          email: string
          picture_url: string
          created_at: string
          updated_at: string
        }[]
      }
      get_config: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_documents_by_source_id: {
        Args: {
          source_ids_input: string[]
          source_type_input: string
          metadata_filters?: Json
        }
        Returns: {
          source_id: string
          metadata: Json
          user_ids_access: string[]
          source_updated_at: string
        }[]
      }
      get_upper_system_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_picture_url_by_source_user_id: {
        Args: {
          source_user_id: string
          source: Database["public"]["Enums"]["document_source"]
        }
        Returns: string
      }
      halfvec_avg: {
        Args: {
          "": number[]
        }
        Returns: unknown
      }
      halfvec_out: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      halfvec_send: {
        Args: {
          "": unknown
        }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: {
          "": unknown[]
        }
        Returns: number
      }
      has_active_subscription: {
        Args: {
          target_account_id: string
        }
        Returns: boolean
      }
      has_more_elevated_role: {
        Args: {
          target_user_id: string
          target_account_id: string
          role_name: string
        }
        Returns: boolean
      }
      has_permission: {
        Args: {
          user_id: string
          account_id: string
          permission_name: Database["public"]["Enums"]["app_permissions"]
        }
        Returns: boolean
      }
      has_role_on_account: {
        Args: {
          account_id: string
          account_role?: string
        }
        Returns: boolean
      }
      has_same_role_hierarchy_level: {
        Args: {
          target_user_id: string
          target_account_id: string
          role_name: string
        }
        Returns: boolean
      }
      hnsw_bit_support: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      hnswhandler: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      is_account_owner: {
        Args: {
          account_id: string
        }
        Returns: boolean
      }
      is_account_team_member: {
        Args: {
          target_account_id: string
        }
        Returns: boolean
      }
      is_set: {
        Args: {
          field_name: string
        }
        Returns: boolean
      }
      is_team_member: {
        Args: {
          account_id: string
          user_id: string
        }
        Returns: boolean
      }
      ivfflat_bit_support: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      ivfflathandler: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      l2_norm:
        | {
            Args: {
              "": unknown
            }
            Returns: number
          }
        | {
            Args: {
              "": unknown
            }
            Returns: number
          }
      l2_normalize:
        | {
            Args: {
              "": string
            }
            Returns: string
          }
        | {
            Args: {
              "": unknown
            }
            Returns: unknown
          }
        | {
            Args: {
              "": unknown
            }
            Returns: unknown
          }
      manage_document_user_access: {
        Args: {
          source_input: Database["public"]["Enums"]["document_source"]
          target_user_id: string
          operation: string
          metadata_filter?: Json
          source_ids?: string[]
        }
        Returns: undefined
      }
      match_documents_hierarchical: {
        Args: {
          query_embedding: string
          hyde_embedding: string
          query_text: string
          target_user_id: string
          source_types?: Database["public"]["Enums"]["document_source"][]
          keyword_weight?: number
          semantic_weight?: number
          doc_search_limit?: number
          chunk_search_limit?: number
          start_date?: string
          end_date?: string
          similarity_threshold?: number
          exclude_document_ids?: number[]
          metadata_filter?: Json
          strict_metadata_matching?: boolean
        }
        Returns: {
          id: number
          content: string
          title: string
          metadata: Json
          source: Database["public"]["Enums"]["document_source"]
          similarity: number
          document_id: number
          chunk_index: number
          max_chunk_index: number
          source_id: string
          source_parent_id: string
          hierarchy_path: string
          source_updated_at: string
        }[]
      }
      pgroonga_command:
        | {
            Args: {
              groongacommand: string
            }
            Returns: string
          }
        | {
            Args: {
              groongacommand: string
              arguments: string[]
            }
            Returns: string
          }
      pgroonga_command_escape_value: {
        Args: {
          value: string
        }
        Returns: string
      }
      pgroonga_condition: {
        Args: {
          query?: string
          weights?: number[]
          scorers?: string[]
          schema_name?: string
          index_name?: string
          column_name?: string
          fuzzy_max_distance_ratio?: number
        }
        Returns: Database["public"]["CompositeTypes"]["pgroonga_condition"]
      }
      pgroonga_equal_query_text_array: {
        Args: {
          targets: string[]
          query: string
        }
        Returns: boolean
      }
      pgroonga_equal_query_text_array_condition:
        | {
            Args: {
              targets: string[]
              condition: Database["public"]["CompositeTypes"]["pgroonga_condition"]
            }
            Returns: boolean
          }
        | {
            Args: {
              targets: string[]
              condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition"]
            }
            Returns: boolean
          }
      pgroonga_equal_query_varchar_array: {
        Args: {
          targets: string[]
          query: string
        }
        Returns: boolean
      }
      pgroonga_equal_query_varchar_array_condition:
        | {
            Args: {
              targets: string[]
              condition: Database["public"]["CompositeTypes"]["pgroonga_condition"]
            }
            Returns: boolean
          }
        | {
            Args: {
              targets: string[]
              condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition"]
            }
            Returns: boolean
          }
      pgroonga_equal_text: {
        Args: {
          target: string
          other: string
        }
        Returns: boolean
      }
      pgroonga_equal_text_condition:
        | {
            Args: {
              target: string
              condition: Database["public"]["CompositeTypes"]["pgroonga_condition"]
            }
            Returns: boolean
          }
        | {
            Args: {
              target: string
              condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition"]
            }
            Returns: boolean
          }
      pgroonga_equal_varchar: {
        Args: {
          target: string
          other: string
        }
        Returns: boolean
      }
      pgroonga_equal_varchar_condition:
        | {
            Args: {
              target: string
              condition: Database["public"]["CompositeTypes"]["pgroonga_condition"]
            }
            Returns: boolean
          }
        | {
            Args: {
              target: string
              condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition"]
            }
            Returns: boolean
          }
      pgroonga_escape:
        | {
            Args: {
              value: boolean
            }
            Returns: string
          }
        | {
            Args: {
              value: number
            }
            Returns: string
          }
        | {
            Args: {
              value: number
            }
            Returns: string
          }
        | {
            Args: {
              value: number
            }
            Returns: string
          }
        | {
            Args: {
              value: number
            }
            Returns: string
          }
        | {
            Args: {
              value: number
            }
            Returns: string
          }
        | {
            Args: {
              value: string
            }
            Returns: string
          }
        | {
            Args: {
              value: string
            }
            Returns: string
          }
        | {
            Args: {
              value: string
            }
            Returns: string
          }
        | {
            Args: {
              value: string
              special_characters: string
            }
            Returns: string
          }
      pgroonga_flush: {
        Args: {
          indexname: unknown
        }
        Returns: boolean
      }
      pgroonga_handler: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      pgroonga_highlight_html:
        | {
            Args: {
              target: string
              keywords: string[]
            }
            Returns: string
          }
        | {
            Args: {
              target: string
              keywords: string[]
              indexname: unknown
            }
            Returns: string
          }
        | {
            Args: {
              targets: string[]
              keywords: string[]
            }
            Returns: string[]
          }
        | {
            Args: {
              targets: string[]
              keywords: string[]
              indexname: unknown
            }
            Returns: string[]
          }
      pgroonga_index_column_name:
        | {
            Args: {
              indexname: unknown
              columnindex: number
            }
            Returns: string
          }
        | {
            Args: {
              indexname: unknown
              columnname: string
            }
            Returns: string
          }
      pgroonga_is_writable: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      pgroonga_list_broken_indexes: {
        Args: Record<PropertyKey, never>
        Returns: string[]
      }
      pgroonga_list_lagged_indexes: {
        Args: Record<PropertyKey, never>
        Returns: string[]
      }
      pgroonga_match_positions_byte:
        | {
            Args: {
              target: string
              keywords: string[]
            }
            Returns: number[]
          }
        | {
            Args: {
              target: string
              keywords: string[]
              indexname: unknown
            }
            Returns: number[]
          }
      pgroonga_match_positions_character:
        | {
            Args: {
              target: string
              keywords: string[]
            }
            Returns: number[]
          }
        | {
            Args: {
              target: string
              keywords: string[]
              indexname: unknown
            }
            Returns: number[]
          }
      pgroonga_match_term:
        | {
            Args: {
              target: string[]
              term: string
            }
            Returns: boolean
          }
        | {
            Args: {
              target: string[]
              term: string
            }
            Returns: boolean
          }
        | {
            Args: {
              target: string
              term: string
            }
            Returns: boolean
          }
        | {
            Args: {
              target: string
              term: string
            }
            Returns: boolean
          }
      pgroonga_match_text_array_condition:
        | {
            Args: {
              target: string[]
              condition: Database["public"]["CompositeTypes"]["pgroonga_condition"]
            }
            Returns: boolean
          }
        | {
            Args: {
              target: string[]
              condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition"]
            }
            Returns: boolean
          }
      pgroonga_match_text_array_condition_with_scorers: {
        Args: {
          target: string[]
          condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition_with_scorers"]
        }
        Returns: boolean
      }
      pgroonga_match_text_condition:
        | {
            Args: {
              target: string
              condition: Database["public"]["CompositeTypes"]["pgroonga_condition"]
            }
            Returns: boolean
          }
        | {
            Args: {
              target: string
              condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition"]
            }
            Returns: boolean
          }
      pgroonga_match_text_condition_with_scorers: {
        Args: {
          target: string
          condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition_with_scorers"]
        }
        Returns: boolean
      }
      pgroonga_match_varchar_condition:
        | {
            Args: {
              target: string
              condition: Database["public"]["CompositeTypes"]["pgroonga_condition"]
            }
            Returns: boolean
          }
        | {
            Args: {
              target: string
              condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition"]
            }
            Returns: boolean
          }
      pgroonga_match_varchar_condition_with_scorers: {
        Args: {
          target: string
          condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition_with_scorers"]
        }
        Returns: boolean
      }
      pgroonga_normalize:
        | {
            Args: {
              target: string
            }
            Returns: string
          }
        | {
            Args: {
              target: string
              normalizername: string
            }
            Returns: string
          }
      pgroonga_prefix_varchar_condition:
        | {
            Args: {
              target: string
              conditoin: Database["public"]["CompositeTypes"]["pgroonga_condition"]
            }
            Returns: boolean
          }
        | {
            Args: {
              target: string
              conditoin: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition"]
            }
            Returns: boolean
          }
      pgroonga_query_escape: {
        Args: {
          query: string
        }
        Returns: string
      }
      pgroonga_query_expand: {
        Args: {
          tablename: unknown
          termcolumnname: string
          synonymscolumnname: string
          query: string
        }
        Returns: string
      }
      pgroonga_query_extract_keywords: {
        Args: {
          query: string
          index_name?: string
        }
        Returns: string[]
      }
      pgroonga_query_text_array_condition:
        | {
            Args: {
              targets: string[]
              condition: Database["public"]["CompositeTypes"]["pgroonga_condition"]
            }
            Returns: boolean
          }
        | {
            Args: {
              targets: string[]
              condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition"]
            }
            Returns: boolean
          }
      pgroonga_query_text_array_condition_with_scorers: {
        Args: {
          targets: string[]
          condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition_with_scorers"]
        }
        Returns: boolean
      }
      pgroonga_query_text_condition:
        | {
            Args: {
              target: string
              condition: Database["public"]["CompositeTypes"]["pgroonga_condition"]
            }
            Returns: boolean
          }
        | {
            Args: {
              target: string
              condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition"]
            }
            Returns: boolean
          }
      pgroonga_query_text_condition_with_scorers: {
        Args: {
          target: string
          condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition_with_scorers"]
        }
        Returns: boolean
      }
      pgroonga_query_varchar_condition:
        | {
            Args: {
              target: string
              condition: Database["public"]["CompositeTypes"]["pgroonga_condition"]
            }
            Returns: boolean
          }
        | {
            Args: {
              target: string
              condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition"]
            }
            Returns: boolean
          }
      pgroonga_query_varchar_condition_with_scorers: {
        Args: {
          target: string
          condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition_with_scorers"]
        }
        Returns: boolean
      }
      pgroonga_regexp_text_array: {
        Args: {
          targets: string[]
          pattern: string
        }
        Returns: boolean
      }
      pgroonga_regexp_text_array_condition: {
        Args: {
          targets: string[]
          pattern: Database["public"]["CompositeTypes"]["pgroonga_condition"]
        }
        Returns: boolean
      }
      pgroonga_result_to_jsonb_objects: {
        Args: {
          result: Json
        }
        Returns: Json
      }
      pgroonga_result_to_recordset: {
        Args: {
          result: Json
        }
        Returns: Record<string, unknown>[]
      }
      pgroonga_score:
        | {
            Args: {
              row: Record<string, unknown>
            }
            Returns: number
          }
        | {
            Args: {
              tableoid: unknown
              ctid: unknown
            }
            Returns: number
          }
      pgroonga_set_writable: {
        Args: {
          newwritable: boolean
        }
        Returns: boolean
      }
      pgroonga_snippet_html: {
        Args: {
          target: string
          keywords: string[]
          width?: number
        }
        Returns: string[]
      }
      pgroonga_table_name: {
        Args: {
          indexname: unknown
        }
        Returns: string
      }
      pgroonga_tokenize: {
        Args: {
          target: string
        }
        Returns: Json[]
      }
      pgroonga_vacuum: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      pgroonga_wal_apply:
        | {
            Args: Record<PropertyKey, never>
            Returns: number
          }
        | {
            Args: {
              indexname: unknown
            }
            Returns: number
          }
      pgroonga_wal_set_applied_position:
        | {
            Args: Record<PropertyKey, never>
            Returns: boolean
          }
        | {
            Args: {
              block: number
              offset: number
            }
            Returns: boolean
          }
        | {
            Args: {
              indexname: unknown
            }
            Returns: boolean
          }
        | {
            Args: {
              indexname: unknown
              block: number
              offset: number
            }
            Returns: boolean
          }
      pgroonga_wal_status: {
        Args: Record<PropertyKey, never>
        Returns: {
          name: string
          oid: unknown
          current_block: number
          current_offset: number
          current_size: number
          last_block: number
          last_offset: number
          last_size: number
        }[]
      }
      pgroonga_wal_truncate:
        | {
            Args: Record<PropertyKey, never>
            Returns: number
          }
        | {
            Args: {
              indexname: unknown
            }
            Returns: number
          }
      sparsevec_out: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      sparsevec_send: {
        Args: {
          "": unknown
        }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: {
          "": unknown[]
        }
        Returns: number
      }
      team_account_workspace: {
        Args: {
          account_slug: string
        }
        Returns: {
          id: string
          name: string
          picture_url: string
          slug: string
          role: string
          role_hierarchy_level: number
          primary_owner_user_id: string
          subscription_status: Database["public"]["Enums"]["subscription_status"]
          permissions: Database["public"]["Enums"]["app_permissions"][]
        }[]
      }
      transfer_team_account_ownership: {
        Args: {
          target_account_id: string
          new_owner_id: string
        }
        Returns: undefined
      }
      update_message_feedback_by_content: {
        Args: {
          conversation_id: string
          message_content: string
          feedback_value?: Database["public"]["Enums"]["message_feedback"]
        }
        Returns: boolean
      }
      upsert_document_with_access: {
        Args: {
          title: string
          content: string
          summary: string
          summary_embedding: string
          source: Database["public"]["Enums"]["document_source"]
          source_updated_at: string
          source_id: string
          user_ids_access: string[]
          hierarchy_path?: string
          metadata?: Json
          last_updated_source_user_id?: string
          source_author_id?: string
          source_mentioned_user_ids?: string[]
          source_parent_id?: string
        }
        Returns: Record<string, unknown>
      }
      upsert_order: {
        Args: {
          target_account_id: string
          target_customer_id: string
          target_order_id: string
          status: Database["public"]["Enums"]["payment_status"]
          billing_provider: Database["public"]["Enums"]["billing_provider"]
          total_amount: number
          currency: string
          line_items: Json
        }
        Returns: {
          account_id: string
          billing_customer_id: number
          billing_provider: Database["public"]["Enums"]["billing_provider"]
          created_at: string
          currency: string
          id: string
          status: Database["public"]["Enums"]["payment_status"]
          total_amount: number
          updated_at: string
        }
      }
      upsert_subscription: {
        Args: {
          target_account_id: string
          target_customer_id: string
          target_subscription_id: string
          active: boolean
          status: Database["public"]["Enums"]["subscription_status"]
          billing_provider: Database["public"]["Enums"]["billing_provider"]
          cancel_at_period_end: boolean
          currency: string
          period_starts_at: string
          period_ends_at: string
          line_items: Json
          trial_starts_at?: string
          trial_ends_at?: string
        }
        Returns: {
          account_id: string
          active: boolean
          billing_customer_id: number
          billing_provider: Database["public"]["Enums"]["billing_provider"]
          cancel_at_period_end: boolean
          created_at: string
          currency: string
          id: string
          period_ends_at: string
          period_starts_at: string
          status: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at: string | null
          trial_starts_at: string | null
          updated_at: string
        }
      }
      vector_avg: {
        Args: {
          "": number[]
        }
        Returns: string
      }
      vector_dims:
        | {
            Args: {
              "": string
            }
            Returns: number
          }
        | {
            Args: {
              "": unknown
            }
            Returns: number
          }
      vector_norm: {
        Args: {
          "": string
        }
        Returns: number
      }
      vector_out: {
        Args: {
          "": string
        }
        Returns: unknown
      }
      vector_send: {
        Args: {
          "": string
        }
        Returns: string
      }
      vector_typmod_in: {
        Args: {
          "": unknown[]
        }
        Returns: number
      }
    }
    Enums: {
      action_item_status_enum:
        | "backlog"
        | "todo"
        | "in_progress"
        | "blocked"
        | "done"
        | "ignored"
      app_permissions:
        | "roles.manage"
        | "billing.manage"
        | "settings.manage"
        | "members.manage"
        | "invites.manage"
      billing_provider: "stripe" | "lemon-squeezy" | "paddle" | "manual"
      document_source:
        | "confluence"
        | "jira"
        | "sharepoint"
        | "notion"
        | "google_drive"
        | "gmail"
        | "pdf"
      document_update_action_status: "pending" | "executed" | "dismissed"
      document_update_action_type:
        | "document_create"
        | "document_update"
        | "ticket_create"
      flag_status_enum: "open" | "in_progress" | "resolved" | "ignored"
      flag_type_enum:
        | "outdated"
        | "inconsistent"
        | "redundant"
        | "quality"
        | "factual"
      meeting_status:
        | "pending"
        | "scheduled"
        | "cancelled"
        | "joining_call"
        | "in_waiting_room"
        | "in_call_not_recording"
        | "in_call_recording"
        | "call_ended"
        | "completed"
        | "failed"
        | "meeting_error"
      message_feedback: "up" | "down"
      notification_channel: "in_app" | "email"
      notification_type: "info" | "warning" | "error"
      payment_status: "pending" | "succeeded" | "failed"
      recommended_action_enum: "update" | "merge" | "archive" | "restructure"
      subscription_item_type: "flat" | "per_seat" | "metered"
      subscription_status:
        | "active"
        | "trialing"
        | "past_due"
        | "canceled"
        | "unpaid"
        | "incomplete"
        | "incomplete_expired"
        | "paused"
    }
    CompositeTypes: {
      invitation: {
        email: string | null
        role: string | null
      }
      pgroonga_condition: {
        query: string | null
        weigths: number[] | null
        scorers: string[] | null
        schema_name: string | null
        index_name: string | null
        column_name: string | null
        fuzzy_max_distance_ratio: number | null
      }
      pgroonga_full_text_search_condition: {
        query: string | null
        weigths: number[] | null
        indexname: string | null
      }
      pgroonga_full_text_search_condition_with_scorers: {
        query: string | null
        weigths: number[] | null
        scorers: string[] | null
        indexname: string | null
      }
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          level: number | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          level?: number | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          level?: number | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      prefixes: {
        Row: {
          bucket_id: string
          created_at: string | null
          level: number
          name: string
          updated_at: string | null
        }
        Insert: {
          bucket_id: string
          created_at?: string | null
          level?: number
          name: string
          updated_at?: string | null
        }
        Update: {
          bucket_id?: string
          created_at?: string | null
          level?: number
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prefixes_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_prefixes: {
        Args: {
          _bucket_id: string
          _name: string
        }
        Returns: undefined
      }
      can_insert_object: {
        Args: {
          bucketid: string
          name: string
          owner: string
          metadata: Json
        }
        Returns: undefined
      }
      delete_prefix: {
        Args: {
          _bucket_id: string
          _name: string
        }
        Returns: boolean
      }
      extension: {
        Args: {
          name: string
        }
        Returns: string
      }
      filename: {
        Args: {
          name: string
        }
        Returns: string
      }
      foldername: {
        Args: {
          name: string
        }
        Returns: string[]
      }
      get_level: {
        Args: {
          name: string
        }
        Returns: number
      }
      get_prefix: {
        Args: {
          name: string
        }
        Returns: string
      }
      get_prefixes: {
        Args: {
          name: string
        }
        Returns: string[]
      }
      get_size_by_bucket: {
        Args: Record<PropertyKey, never>
        Returns: {
          size: number
          bucket_id: string
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          prefix_param: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
        }
        Returns: {
          key: string
          id: string
          created_at: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          bucket_id: string
          prefix_param: string
          delimiter_param: string
          max_keys?: number
          start_after?: string
          next_token?: string
        }
        Returns: {
          name: string
          id: string
          metadata: Json
          updated_at: string
        }[]
      }
      operation: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      search: {
        Args: {
          prefix: string
          bucketname: string
          limits?: number
          levels?: number
          offsets?: number
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          name: string
          id: string
          updated_at: string
          created_at: string
          last_accessed_at: string
          metadata: Json
        }[]
      }
      search_legacy_v1: {
        Args: {
          prefix: string
          bucketname: string
          limits?: number
          levels?: number
          offsets?: number
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          name: string
          id: string
          updated_at: string
          created_at: string
          last_accessed_at: string
          metadata: Json
        }[]
      }
      search_v1_optimised: {
        Args: {
          prefix: string
          bucketname: string
          limits?: number
          levels?: number
          offsets?: number
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          name: string
          id: string
          updated_at: string
          created_at: string
          last_accessed_at: string
          metadata: Json
        }[]
      }
      search_v2: {
        Args: {
          prefix: string
          bucket_name: string
          limits?: number
          levels?: number
          start_after?: string
        }
        Returns: {
          key: string
          name: string
          id: string
          updated_at: string
          created_at: string
          metadata: Json
        }[]
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

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

