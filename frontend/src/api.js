const BASE = "/api";

export async function fetchStats() {
  const res = await fetch(`${BASE}/stats`);
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
}

export async function fetchRequests(filters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.category) params.set("category", filters.category);
  if (filters.district) params.set("district", filters.district);
  const res = await fetch(`${BASE}/requests?${params}`);
  if (!res.ok) throw new Error("Failed to fetch requests");
  return res.json();
}

export async function fetchRequest(id) {
  const res = await fetch(`${BASE}/requests/${id}`);
  if (!res.ok) throw new Error("Failed to fetch request");
  return res.json();
}

export async function searchRequests(q, filters = {}) {
  const params = new URLSearchParams({ q });
  if (filters.category) params.set("category", filters.category);
  if (filters.status) params.set("status", filters.status);
  if (filters.district) params.set("district", filters.district);
  const res = await fetch(`${BASE}/search?${params}`);
  if (!res.ok) throw new Error("Search failed");
  return res.json();
}

export async function fetchMapData() {
  const res = await fetch(`${BASE}/map`);
  if (!res.ok) throw new Error("Failed to fetch map data");
  return res.json();
}

export async function fetchAnalytics() {
  const res = await fetch(`${BASE}/analytics`);
  if (!res.ok) throw new Error("Failed to fetch analytics");
  return res.json();
}
