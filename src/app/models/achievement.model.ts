export interface Achievement {
  sno: number;
  title: string;
  link: string;        // Jira/reference link - optional
  date: string;        // Reference date - optional
  comments: string;    // Comments/description - optional
  year: number;        // Extracted from date for grouping
}

export interface AchievementsByYear {
  year: number;
  achievements: Achievement[];
}

export interface AchievementFormData {
  title: string;
  link?: string;
  date?: string;
  comments?: string;
}
