const RANK = {
  priority: { Critical: 0, High: 1, Medium: 2, Low: 3 },
  status: { Pending: 0, 'In Progress': 1, Resolved: 2 },
};

// dir: 1 = ascending, -1 = descending. Returns a new array.
export function sortComplaints(list, key, dir) {
  const val = (c) => (RANK[key] ? RANK[key][c[key]] : c[key]);
  return [...list].sort((a, b) => (val(a) > val(b) ? 1 : val(a) < val(b) ? -1 : 0) * dir);
}
