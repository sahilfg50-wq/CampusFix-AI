import { STATUS_COLOR, PRIORITY_COLOR } from '../../data/constants';

export const StatusBadge = ({ status }) => (
  <span className="badge" style={{ color: STATUS_COLOR[status] }}>{status}</span>
);

export const PriorityBadge = ({ priority }) => (
  <span className="badge" style={{ color: PRIORITY_COLOR[priority] }}>{priority}</span>
);

// AI-assisted results (Gemini or local AI) use AiBadge.
export const AiBadge = ({ children = 'Gemini AI' }) => (
  <span className="badge text-indigo-500">{children}</span>
);

// Used wherever the built-in rule-based classification is shown, so it is never mistaken for AI.
export const SimBadge = ({ children = 'Auto-classified' }) => (
  <span className="badge text-indigo-500">{children}</span>
);
