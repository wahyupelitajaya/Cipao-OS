export type CatStatus = "baik" | "kurang_baik" | "sakit" | null;
export type CatLocation = "rumah" | "toko" | "klinik" | null;

export interface DashboardCatRecord {
  id: string;
  name: string;
  badge?: string;
  status: CatStatus;
  location: CatLocation;
  photoUrl: string | null;
  preventive: { type: "VACCINE" | "FLEA" | "DEWORM"; nextDueDate: string | null }[];
  weight: { currentKg: number; previousKg?: number };
  hasActiveTreatment: boolean;
  lastGroomingDate: string | null;
}

export interface DashboardGroomingEntry {
  catId: string;
  catName: string;
  lastGroomingDate: string | null;
}

export interface DashboardLowStockItem {
  id: string;
  name: string;
  stockQty: number;
  minStockQty: number;
  unit: string;
}

export interface DashboardData {
  cats: DashboardCatRecord[];
  groomingPanel: DashboardGroomingEntry[];
  lowStockPanel: DashboardLowStockItem[];
}

export type SuggestedStatus = "Needs Attention" | "Monitor" | "Healthy";

export interface CatWithStatus {
  cat: DashboardCatRecord;
  computed: { bucket: SuggestedStatus; reasons: string[] };
}
