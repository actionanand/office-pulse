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
    icon: '\u{1F4C5}',
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
    icon: '\u{1F4DD}',
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
    icon: '\u26A1',
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
    icon: '\u{1F389}',
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
    icon: '\u{1F504}',
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
    icon: '\u{1F3C6}',
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
    icon: '\u{1F6E0}\uFE0F',
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
    icon: '\u{1F3AB}',
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
    icon: '\u{1F3AF}',
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
    icon: '\u{1F4DD}',
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
    icon: '\u{1F516}',
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
    icon: '\u{1F4C4}',
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
    icon: '\u{1FA91}',
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
    icon: '\u{1F686}',
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
    icon: '\u{1F4B3}',
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
    icon: 'CC',
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
