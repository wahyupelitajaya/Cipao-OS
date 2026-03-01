// Minimal helper type for Supabase tables used in the app.
// Adjust to match your generated types if you use supabase-codegen.

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

// Partial Database definition for compile-time safety.
// Only the tables referenced in the frontend are modeled here.

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          role: "admin" | "owner";
        };
      };
      cats: {
        Row: {
          id: string;
          cat_id: string;
          name: string;
          owner_id: string;
          dob: string | null;
          status: "sehat" | "membaik" | "memburuk" | "hampir_sembuh" | "observasi" | "sakit" | null;
          location: "rumah" | "toko" | "klinik" | null;
          status_manual: string | null;
          is_active: boolean;
          photo_url: string | null;
          breed_id: string | null;
          /** Catatan perawatan manual (jenis penyakit, yang merawat, dll). */
          treatment_notes: string | null;
          /** Apakah menular: true / false / null (belum ditentukan). */
          is_contagious: boolean | null;
        };
      };
      cat_breeds: {
        Row: {
          id: string;
          name: string;
          sort_order: number;
          created_at: string;
        };
      };
      health_logs: {
        Row: {
          id: string;
          cat_id: string;
          date: string;
          type:
            | "VACCINE"
            | "FLEA"
            | "DEWORM"
            | "ILLNESS"
            | "MEDICATION"
            | "CLINIC"
            | "NOTE";
          title: string;
          details: string | null;
          next_due_date: string | null;
          is_active_treatment: boolean;
          created_at: string;
        };
      };
      weight_logs: {
        Row: {
          id: string;
          cat_id: string;
          date: string;
          weight_kg: number;
        };
      };
      grooming_logs: {
        Row: {
          id: string;
          cat_id: string;
          date: string;
        };
      };
      inventory_categories: {
        Row: {
          id: string;
          slug: string;
          name: string;
          sort_order: number;
          created_at: string;
        };
      };
      inventory_items: {
        Row: {
          id: string;
          category_id: string;
          name: string;
          stock_qty: number;
          unit: string;
          min_stock_qty: number | null;
        };
      };
      inventory_movements: {
        Row: {
          id: string;
          item_id: string;
          date: string;
          change_qty: number;
          reason: "PURCHASE" | "USAGE" | "ADJUSTMENT";
          note: string | null;
        };
      };
      visit_days: {
        Row: {
          id: string;
          date: string;
          visited: boolean;
          note: string | null;
          created_at: string;
          created_by: string | null;
        };
      };
      daily_activities: {
        Row: {
          id: string;
          date: string;
          time_slot: string;
          location: string;
          cat_ids: string[];
          activity_type: string;
          note: string | null;
          created_at: string;
          created_by: string | null;
        };
      };
    };
  };
};
