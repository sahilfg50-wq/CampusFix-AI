import { STATUS_COLOR, PRIORITY_COLOR } from '../../data/constants';

export const StatusBadge = ({ status }) => (
  <span className="badge" style={{ color: STATUS_COLOR[status] }}>{status}</span>
);

export const PriorityBadge = ({ priority }) => (
  <span className="badge" style={{ color: PRIORITY_COLOR[priority] }}>{priority}</span>
);

// Gemini-powered results use AiBadge; rule-based results keep the "Simulated" label.
export const AiBadge = ({ children = 'Gemini AI' }) => (
  <span className="badge text-indigo-500">{children}</span>
);

// Used wherever the rule-based (non-Gemini) triage is shown, so it is always labelled as simulated.
export const SimBadge = ({ children = 'Simulated AI' }) => (
  <span className="badge text-indigo-500">{children}</span>
);
