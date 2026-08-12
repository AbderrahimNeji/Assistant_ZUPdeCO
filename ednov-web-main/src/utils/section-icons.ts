export const getSectionIcon = (sectionType: string): string => {
  const iconMap: Record<string, string> = {
    stats: 'BarChart3',
    postits: 'StickyNote',
    sessions: 'Calendar',
    pairs: 'Users',
    calendar: 'CalendarDays',
    'sessions-chart': 'LineChart',
    'resources-chart': 'PieChart',
    establishments: 'Building2',
    tutors: 'GraduationCap',
    students: 'Users',
    volunteers: 'Heart',
    admins: 'Shield',
    reports: 'FileText',
    'vsc-reports': 'FileBarChart',
    subjects: 'BookOpen',
    levels: 'Layers',
    programs: 'FolderTree',
    'school-years': 'CalendarRange',
    'activity-types': 'Tag',
    activities: 'Activity',
    holidays: 'Palmtree',
  };

  return iconMap[sectionType] || 'HelpCircle';
};
