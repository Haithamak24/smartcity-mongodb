import { useEffect, useState } from "react";
import { fetchStats } from "../api.js";

const COLLECTIONS = [
  { name: "users", icon: "👤", desc: "Registered citizens" },
  { name: "service_requests", icon: "📋", desc: "Citizen reports with embedded status history" },
  { name: "departments", icon: "🏢", desc: "6 city departments with routing rules" },
  { name: "technicians", icon: "🔧", desc: "Field workers with performance tracking" },
  { name: "areas", icon: "🗺", desc: "8 geographic districts with boundary polygons" },
  { name: "categories", icon: "🏷", desc: "Service categories with subcategories" },
  { name: "geopoints", icon: "📍", desc: "Infrastructure points — lamp posts, bins, signals" },
];

const INDEXES = [
  { field: "location: '2dsphere'", col: "service_requests", note: "Powers $near, $geoWithin, $geoIntersects" },
  { field: "status: 1", col: "service_requests", note: "Dashboard filters" },
  { field: "citizenId + createdAt", col: "service_requests", note: '"My reports" — compound index' },
  { field: "assignedDepartmentId + status", col: "service_requests", note: "Department dashboard" },
  { field: "districtId + status + createdAt", col: "service_requests", note: "Analytics pipelines" },
  { field: "category + createdAt", col: "service_requests", note: "Trend reports" },
  { field: "email (unique)", col: "users", note: "Login lookup" },
  { field: "location: '2dsphere'", col: "geopoints", note: "Find nearest infrastructure" },
];

export default function Dashboard({ onNav }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats()
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="page-header">
        <div className="page-title">Dashboard</div>
        <div className="page-sub">Smart City Services Platform — MongoDB + Elasticsearch</div>
      </div>

      <div className="page-content">
        {loading && <div className="loading"><div className="spinner" /><span>Connecting to MongoDB...</span></div>}
        {error && <div className="loading" style={{ color: "var(--red)" }}>⚠ {error} — is the server running?</div>}

        {stats && (
          <>
            <div className="metrics-grid">
              <div className="metric-card metric-blue">
                <div className="metric-label">Service Requests</div>
                <div className="metric-value">{stats.total}</div>
                <div className="metric-sub">total in collection</div>
              </div>
              <div className="metric-card metric-amber">
                <div className="metric-label">Open</div>
                <div className="metric-value">{stats.open}</div>
                <div className="metric-sub">awaiting assignment</div>
              </div>
              <div className="metric-card metric-blue">
                <div className="metric-label">In Progress</div>
                <div className="metric-value">{stats.inProgress}</div>
                <div className="metric-sub">assigned or active</div>
              </div>
              <div className="metric-card metric-green">
                <div className="metric-label">Resolved</div>
                <div className="metric-value">{stats.resolved}</div>
                <div className="metric-sub">resolved or closed</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
              <div className="metric-card metric-purple" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div className="metric-label">Registered Citizens</div>
                  <div className="metric-value">{stats.users}</div>
                </div>
                <span style={{ fontSize: 32 }}>👤</span>
              </div>
              <div className="metric-card metric-teal" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div className="metric-label">City Departments</div>
                  <div className="metric-value">{stats.depts}</div>
                </div>
                <span style={{ fontSize: 32 }}>🏢</span>
              </div>
            </div>
          </>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
          <div className="card">
            <div className="card-title">MongoDB Collections</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {COLLECTIONS.map((c) => (
                <div key={c.name} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 10px", background: "var(--bg-elevated)", borderRadius: "var(--radius)" }}>
                  <span style={{ fontSize: 16 }}>{c.icon}</span>
                  <div>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--blue)" }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{c.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-title">Active Indexes (20 total)</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {INDEXES.map((ix, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", gap: "2px", padding: "8px 10px", background: "var(--bg-elevated)", borderRadius: "var(--radius)" }}>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <code style={{ fontSize: 11, color: "var(--green)", background: "var(--green-dim)", padding: "1px 6px", borderRadius: 4 }}>{ix.field}</code>
                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>on {ix.col}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{ix.note}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-title">Architecture — 4-Database Stack</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
            {[
              { name: "MongoDB", owner: "Haitham", role: "Primary database — citizens, requests, departments", color: "var(--green)", active: true },
              { name: "Redis", owner: "Ahmad", role: "Session management and caching layer", color: "var(--red)", active: false },
              { name: "Neo4j", owner: "Saad", role: "Urban relationship graph — multi-hop queries", color: "var(--blue)", active: false },
              { name: "Elasticsearch", owner: "Haitham", role: "Full-text search — Arabic + English + fuzzy", color: "var(--amber)", active: true },
            ].map((db) => (
              <div key={db.name} style={{ padding: "14px", background: "var(--bg-elevated)", borderRadius: "var(--radius)", border: `1px solid ${db.active ? db.color + "44" : "var(--border)"}` }}>
                <div style={{ fontWeight: 600, color: db.color, marginBottom: 4 }}>{db.name}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>Owner: {db.owner}</div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{db.role}</div>
                {db.active && <div style={{ marginTop: 8, fontSize: 10, color: db.color, display: "flex", alignItems: "center", gap: 4 }}><div className="dot" style={{ background: db.color, boxShadow: `0 0 6px ${db.color}`, width: 6, height: 6 }} /> active in this demo</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
