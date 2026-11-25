// Who receives complaint emails. These are DEMO addresses.
// Replace them with the real college addresses before going live, or override any of them
// without editing code via functions/.env.local (for example DEPT_EMAIL_IT=it@college.edu).

export const DEPARTMENT_EMAILS = {
  'IT & Network Cell': process.env.DEPT_EMAIL_IT || 'it-cell@campusfix.demo',
  'Electrical Dept': process.env.DEPT_EMAIL_ELECTRICAL || 'electrical@campusfix.demo',
  'Civil & Plumbing': process.env.DEPT_EMAIL_PLUMBING || 'civil-plumbing@campusfix.demo',
  'Sanitation Services': process.env.DEPT_EMAIL_SANITATION || 'sanitation@campusfix.demo',
  'Campus Security': process.env.DEPT_EMAIL_SECURITY || 'security@campusfix.demo',
  'Mess Committee': process.env.DEPT_EMAIL_MESS || 'mess-committee@campusfix.demo',
  'Estate & Furniture': process.env.DEPT_EMAIL_ESTATE || 'estate@campusfix.demo',
};

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'campus-admin@campusfix.demo';

export function departmentEmail(department) {
  return DEPARTMENT_EMAILS[department] || ADMIN_EMAIL;
}
