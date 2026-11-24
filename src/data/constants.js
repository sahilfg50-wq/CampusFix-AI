
export const CATEGORIES = ['Wi-Fi & IT', 'Electrical', 'Plumbing', 'Furniture & Infrastructure', 'Housekeeping', 'Security & Safety', 'Mess & Dining', 'Other'];

export const BUILDINGS = ['Aryabhatta Hostel', 'Gargi Hostel', 'Tagore Hostel', 'Academic Block A', 'Academic Block B', 'Central Library', 'Innovation & CS Block', 'Main Mess Hall', 'Sports Complex'];

export const DEPARTMENTS = ['IT & Network Cell', 'Electrical Dept', 'Civil & Plumbing', 'Sanitation Services', 'Campus Security', 'Mess Committee', 'Estate & Furniture'];

export const STATUSES = ['Pending', 'In Progress', 'Resolved'];
export const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];

export const STATUS_COLOR = {
  Pending: '#d97706',
  'In Progress': '#3b82f6',
  Resolved: '#059669',
};

export const PRIORITY_COLOR = {
  Critical: '#e11d48',
  High: '#ea580c',
  Medium: '#6366f1',
  Low: '#64748b',
};

export const NAV = {
  student: [
    ['dash', 'Dashboard'],
    ['submit', 'Submit complaint'],
    ['mine', 'My complaints'],
    ['track', 'Track complaint'],
    ['prof', 'Profile'],
    ['menu', 'Mess Menu'],
  ],

  admin: [
    ['ov', 'Overview'],
    ['all', 'All complaints'],
    ['ana', 'Analytics'],
    ['mess', 'Mess Management'],
    ['food', 'Food Waste Dashboard'],
  ],
};
