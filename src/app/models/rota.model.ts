export interface Rota {
  sNo: number;
  month?: number; // 1-12
  date?: string; // YYYY-MM-DD
  dateRange?: string; // e.g., "Jan 19 - Feb 10"
  category?: string; // e.g., "Prod support", "Snapshot support"
  othersInvolved?: string; // e.g., "Govind, Sai Namballa, Param & Pranav"
  comments?: string;
}

export interface RotaMeta {
  title: string;
  notes: string[];
}

export interface RotaResponse {
  rotas: Rota[];
  meta: RotaMeta;
}
