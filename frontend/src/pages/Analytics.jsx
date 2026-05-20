import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid,
} from "recharts";
import { fetchAnalytics } from "../api.js";

const COLORS = ["#4f8ef7", "#34c47c", "#f5a623", "#f05252", "#9c71f0", "#2ec4b6", "#e879a0"];
const CAT_COLOR = { street_lighting: "#f5a623", waste: "#34c47c", traffic: "#4f8ef7", water: "#2ec4b6", infrastructure: "#9c71f0", emergency: "#f05252" };

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 14px", fontSize: 12 }}>
      <div style={{ color: "var(--text-secondary)", marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></div>
      ))}
    </div>
  );
};

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAnalytics()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="page-header">
        <div className="page-title">Analytics</div>
        <div className="page-sub">MongoDB Aggregation Pipelines — UC-05 · $match · $group · $sort · $project</div>
      </div>

      <div className="page-content">
        {loading && <div className="loading"><div className="spinner" /><span>Running aggregation pipelines...</span></div>}
        {error && <div style={{ color: "var(--red)", padding: 16 }}>⚠ {error}</div>}

        {data && (
          <>
            {/* Pipeline 1: Categories + Pipeline 3: Dept workload */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>

              <div className="card">
                <div className="card-title">Pipeline 1 — Top categories (last 30 days)</div>
                <div style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.categories.map(c => ({ name: c._id?.replace(/_/g, " "), count: c.count }))} layout="vertical" margin={{ left: 10, right: 20 }}>
                      <XAxis type="number" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" tick={{ fill: "var(--text-secondary)", fontSize: 11 }} width={100} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {data.categories.map((c, i) => <Cell key={i} fill={CAT_COLOR[c._id] || COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="card">
                <div className="card-title">Pipeline 3 — Department workload (open vs resolved)</div>
                {data.deptStats.length === 0 ? (
                  <div className="empty" style={{ padding: 24 }}>No department data yet</div>
                ) : (
                  <div style={{ height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.deptStats.map(d => ({ name: d.dept?.split(" ")[0] || d.dept, open: d.open, resolved: d.resolved }))} margin={{ left: -10 }}>
                        <XAxis dataKey="name" tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="open" name="Open" fill="#f5a623" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="resolved" name="Resolved" fill="#34c47c" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>

            {/* Pipeline 4: Heatmap + Pipeline 5: Resolution time */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>

              <div className="card">
                <div className="card-title">Pipeline 4 — Unresolved request clusters (heatmap)</div>
                {data.heatmap.length === 0 ? (
                  <div className="empty" style={{ padding: 24 }}>No unresolved requests</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {data.heatmap.slice(0, 6).map((h, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "var(--bg-elevated)", borderRadius: "var(--radius)" }}>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: `rgba(240,82,82,${0.15 + (h.count * 0.15)})`, border: "1.5px solid #f05252", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: "#f05252", flexShrink: 0 }}>{h.count}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--text-muted)" }}>[{h.lat}, {h.lng}]</div>
                          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{h.district}</div>
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {h.categories?.map(c => <span key={c} className="badge badge-cat" style={{ fontSize: 10 }}>{c?.replace(/_/g, " ")}</span>)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="card">
                <div className="card-title">Pipeline 2 — Avg resolution time per department</div>
                {data.resolutionTime.length === 0 ? (
                  <div className="empty" style={{ padding: 24 }}>No resolved requests yet</div>
                ) : (
                  <div style={{ height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.resolutionTime.map(d => ({ name: d.dept?.split(" ").slice(0, 2).join(" ") || d.dept, hours: d.avgHours, count: d.count }))} margin={{ left: -10 }}>
                        <XAxis dataKey="name" tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} unit="h" />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="hours" name="Avg hours" fill="#4f8ef7" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>

            {/* Pipeline 6: Hourly submissions */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-title">Pipeline 6 — Submissions by hour of day</div>
              {data.hourlyStats.length === 0 ? (
                <div className="empty" style={{ padding: 24 }}>No data</div>
              ) : (
                <div style={{ height: 180 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={Array.from({ length: 24 }, (_, h) => ({ hour: `${String(h).padStart(2, "0")}:00`, count: data.hourlyStats.find(s => s.hour === h)?.count || 0 }))} margin={{ left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="hour" tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} interval={3} />
                      <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="count" name="Submissions" stroke="#4f8ef7" strokeWidth={2} dot={{ fill: "#4f8ef7", r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Pipeline info */}
            <div className="card">
              <div className="card-title">Aggregation pipeline code — MongoDB driver</div>
              <div style={{ overflowX: "auto" }}>
                <pre style={{ fontSize: 11, color: "var(--green)", fontFamily: "var(--mono)", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{`// Pipeline 1: Top categories (last 30 days)
db.collection("service_requests").aggregate([
  { $match: { createdAt: { $gte: new Date(Date.now() - 30 * 86400000) } } },
  { $group: { _id: "$category", count: { $sum: 1 } } },
  { $sort: { count: -1 } },
])

// Pipeline 2: Avg resolution time per department  
db.collection("service_requests").aggregate([
  { $match: { status: { $in: ["RESOLVED", "CLOSED"] }, resolvedAt: { $ne: null } } },
  { $project: { dept: "$assignedDepartmentName",
      resolutionHours: { $divide: [{ $subtract: ["$resolvedAt", "$createdAt"] }, 3600000] } } },
  { $group: { _id: "$dept", avgHours: { $avg: "$resolutionHours" } } },
  { $sort: { avgHours: 1 } },
])`}</pre>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
