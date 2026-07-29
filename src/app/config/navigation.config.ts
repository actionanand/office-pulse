export type NavigationSection = 'primary' | 'more';

export interface NavigationItem {
  readonly route: string;
  readonly icon: string;
  readonly navLabel: string;
  readonly ariaLabel: string;
  readonly section: NavigationSection;
  readonly home?: {
    readonly title: string;
    readonly description: string;
    readonly color: string;
  };
}

/**
 * Add route names here to hide them from the navbar and Home quick links.
 * Use the route segment without a leading slash. Direct URLs remain available.
 */
export const HIDDEN_NAVIGATION_ROUTES: readonly string[] = ['credit-card-tracker', 'bookmarks'];

export const NAVIGATION_ITEMS: readonly NavigationItem[] = [
  {
    route: 'calendar',
    icon: 'calendar-days',
    navLabel: 'Calendar',
    ariaLabel: 'Calendar View',
    section: 'primary',
    home: {
      title: 'Calendar',
      description: 'View monthly attendance and track your office days',
      color: '#667eea',
    },
  },
  {
    route: 'logger',
    icon: 'notebook-pen',
    navLabel: 'Logger',
    ariaLabel: 'Entry Logger',
    section: 'primary',
    home: {
      title: 'Logger',
      description: 'Log your daily office entries and work hours',
      color: '#f093fb',
    },
  },
  {
    route: 'bandwidth',
    icon: 'gauge',
    navLabel: 'Bandwidth',
    ariaLabel: 'Sprint Bandwidth Calculator',
    section: 'more',
    home: {
      title: 'Bandwidth',
      description: 'Calculate sprint bandwidth and capacity planning',
      color: '#f5576c',
    },
  },
  {
    route: 'holidays',
    icon: 'party-popper',
    navLabel: 'Holidays',
    ariaLabel: 'Office Holidays',
    section: 'more',
    home: {
      title: 'Holidays',
      description: 'Check office holidays and important days',
      color: '#4facfe',
    },
  },
  {
    route: 'rota',
    icon: 'refresh-cw',
    navLabel: 'Rota',
    ariaLabel: 'Rota Schedule',
    section: 'more',
    home: {
      title: 'Rota',
      description: 'View support rotation schedule and assignments',
      color: '#764ba2',
    },
  },
  {
    route: 'achievements',
    icon: 'trophy',
    navLabel: 'Achievements',
    ariaLabel: 'My Achievements',
    section: 'more',
    home: {
      title: 'Achievements',
      description: 'Track and celebrate your accomplishments',
      color: '#43e97b',
    },
  },
  {
    route: 'utilities',
    icon: 'wrench',
    navLabel: 'Utilities',
    ariaLabel: 'Utilities',
    section: 'more',
    home: {
      title: 'Utilities',
      description: 'Stopwatch, checklist, and quick transfer tools',
      color: '#fa709a',
    },
  },
  {
    route: 'my-jira-tickets',
    icon: 'ticket',
    navLabel: 'My Jira Tickets',
    ariaLabel: 'My Jira Tickets',
    section: 'more',
    home: {
      title: 'My Jira Tickets',
      description: 'View and manage all Jira tickets created by me',
      color: '#667eea',
    },
  },
  {
    route: 'ticket-tracking',
    icon: 'target',
    navLabel: 'Ticket Tracking',
    ariaLabel: 'Ticket Tracking',
    section: 'more',
    home: {
      title: 'Ticket Tracking',
      description: 'Track demo, release, spillover, and important tickets',
      color: '#f093fb',
    },
  },
  {
    route: 'memos',
    icon: 'sticky-note',
    navLabel: 'Memos',
    ariaLabel: 'Memos',
    section: 'more',
    home: {
      title: 'Memos',
      description: 'Quick notes and reminders in Google Keep style',
      color: '#4facfe',
    },
  },
  {
    route: 'bookmarks',
    icon: 'bookmark',
    navLabel: 'Bookmarks',
    ariaLabel: 'Bookmarks',
    section: 'more',
    home: {
      title: 'Bookmarks',
      description: 'Manage and access your favorite bookmarks',
      color: '#43e97b',
    },
  },
  {
    route: 'markdown',
    icon: 'file-text',
    navLabel: 'Markdown',
    ariaLabel: 'Markdown Viewer',
    section: 'more',
    home: {
      title: 'Markdown Viewer',
      description: 'View and render markdown files with syntax highlighting',
      color: '#8b5cf6',
    },
  },
  {
    route: 'seating-chart',
    icon: 'armchair',
    navLabel: 'Seating Chart',
    ariaLabel: 'Seating Chart',
    section: 'more',
    home: {
      title: 'Seating Chart',
      description: 'View WFO seat allocations by date or browse booked months',
      color: '#0891b2',
    },
  },
  {
    route: 'irctc-vacant-seats',
    icon: 'train-front',
    navLabel: 'IRCTC Seats',
    ariaLabel: 'IRCTC Vacant Seats',
    section: 'more',
    home: {
      title: 'IRCTC Vacant Seats',
      description: 'Find vacant berths during your train journey for RAC passengers',
      color: '#1565c0',
    },
  },
  {
    route: 'credit-card-tracker',
    icon: 'credit-card',
    navLabel: 'CC Tracker',
    ariaLabel: 'Credit Card Tracker',
    section: 'more',
    home: {
      title: 'CC Tracker',
      description: 'Monitor credit card last usage to avoid accidental closure by bank',
      color: '#00695c',
    },
  },
  {
    route: 'cue-card',
    icon: 'presentation',
    navLabel: 'Cue Card',
    ariaLabel: 'Cue Card',
    section: 'more',
    home: {
      title: 'Cue Card',
      description: 'Create rich quick notes and review sheet or offline cue cards',
      color: '#0f766e',
    },
  },
];

const hiddenRoutes = new Set(HIDDEN_NAVIGATION_ROUTES.map(normalizeRoute));

export function isNavigationRouteVisible(route: string): boolean {
  return normalizeRoute(route) === 'settings' || !hiddenRoutes.has(normalizeRoute(route));
}

export function visibleNavigationItems(section?: NavigationSection): readonly NavigationItem[] {
  return NAVIGATION_ITEMS.filter(
    item => (!section || item.section === section) && isNavigationRouteVisible(item.route),
  );
}

function normalizeRoute(route: string): string {
  return route.replace(/^\/+|\/+$/g, '');
}
