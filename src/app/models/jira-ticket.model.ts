export interface JiraTicket {
  sno: number;
  url: string;
  title: string;
  team: string;
  comments: string;
  status: boolean; // true = Completed, false = Open
}

export interface JiraTicketData {
  tickets: JiraTicket[];
}

export interface JiraTicketStatusOverride {
  url: string;
  status: boolean;
  updatedAt: Date;
}
