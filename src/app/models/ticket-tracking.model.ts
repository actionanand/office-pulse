// Demo Tickets Model
export interface DemoTicket {
  sno: number;
  title: string;
  url: string;
  status: boolean; // true = Completed, false = Open
}

export interface DemoTicketData {
  tickets: DemoTicket[];
}

// Release Tickets Model
export interface ReleaseTicket {
  sno: number;
  title: string;
  url: string;
  componentName: string;
  deploymentType: string;
  versionNumber: string;
}

export interface ReleaseTicketData {
  tickets: ReleaseTicket[];
}

// Spillover Tickets Model
export interface SpilloverTicket {
  sno: number;
  date: string;
  sprintName: string;
  title: string;
  url: string;
  reasonForSpilling: string;
  solution: string;
  supportTicketsCreated: string;
  impediment: string;
}

export interface SpilloverTicketData {
  tickets: SpilloverTicket[];
}

// Tracked Tickets Model
export interface TrackedTicket {
  sno: number;
  title: string;
  url: string;
  status: boolean; // true = Completed, false = Open
}

export interface TrackedTicketData {
  tickets: TrackedTicket[];
}

// Status overrides for local storage
export interface TicketStatusOverride {
  url: string;
  status: boolean;
  updatedAt: Date;
}
