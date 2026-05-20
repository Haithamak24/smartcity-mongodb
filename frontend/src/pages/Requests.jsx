import { useEffect, useState } from "react";
import { fetchRequests } from "../api.js";

const STATUS_OPTIONS = ["ALL", "OPEN", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED", "REJECTED"];
const CATEGORY_OPTIONS = ["ALL", "street_lighting", "waste", "traffic", "water", "infrastructure", "emergency"];
const DISTRICT_OPTIONS = ["ALL", "district_1", "district_2", "district_3", "district_4", "district_5", "district_6", "district_7", "district_8"];

function statusBadge(s) {
  const key = s?.toLowerCase().replace(" ", "_");
  return <span className={`badge badge-${key}`}>{s?.replace("_", " ")}</span>;
}

function priorityBadge(p) {
  return <span className={`badge badge-p${p}`}>P{p}</span>;
}

function catBadge(c) {
  return <span className="badge badge-cat">{c?.replace(/_/g, " ")}</span>;
}

function tlDotClass(s) {
  if (["RESOLVED", "CLOSED"].includes(s)) return "tl-dot tl-dot-done";
  if (["IN_PROGRESS", "ASSIGNED"].includes(s)) return "tl-dot tl-dot-active";
  if (s === "REJECTED") return "tl-dot tl-dot-reject";
  return "tl-dot";
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function DetailPanel({ request, onClose }) {
  if (!request) return null;
  return (
    <div className={`detail-panel ${request ? "open" : ""}`}>
      <button className="detail-close" onClick={onClose}>×</button>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>{request.requestId}</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 10 }}>{request.subcategory?.replace(/_/g, " ")}</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
          {statusBadge(request.status)}
          {priorityBadge(request.priority)}
          {catBadge(request.category)}
        </div>
      </div>

      <div className="divider" />

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Description (EN)</div>
        <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>{request.descriptionEn || "—"}</div>
      </div>

      {request.descriptionAr && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Description (AR)</div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7, direction: "rtl", textAlign: "right" }}>{request.descriptionAr}</div>
        </div>
      )}

      <div className="divider" />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: 16, fontSize: 12 }}>
        {[
          ["Citizen", request.citizenName],
          ["District", request.districtName],
          ["Department", request.assignedDepartmentName || "Unassigned"],
          ["Technician", request.assignedTechnicianName || "Unassigned"],
          ["Submitted", fmtDate(request.createdAt)],
          ["Resolved", fmtDate(request.resolvedAt)],
        ].map(([label, value]) => (
          <div key={label}>
            <div style={{ color: "var(--text-muted)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>{label}</div>
            <div style={{ color: "var(--text-primary)" }}>{value || "—"}</div>
          </div>
        ))}
      </div>

      {request.citizenRating && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>Citizen Rating</div>
          <div style={{ color: "var(--amber)", fontSize: 18 }}>{"★".repeat(request.citizenRating)}{"☆".repeat(5 - request.citizenRating)}</div>
        </div>
      )}

      <div className="divider" />

      <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>Status Timeline</div>
      <div className="timeline">
        {(request.statusHistory || []).map((h, i) => (
          <div key={i} className="tl-item">
            <div className={tlDotClass(h.status)} />
            <div>
              <span className="tl-status">{h.status}</span>
              <span className="tl-time">{fmtDate(h.timestamp)}</span>
            </div>
            <div className="tl-comment">{h.commentAr || h.comment || "—"}</div>
          </div>
        ))}
      </div>

      {request.location?.coordinates && (
        <>
          <div className="divider" />
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>Coordinates (GeoJSON)</div>
          <code style={{ fontSize: 11, color: "var(--green)", display: "block", background: "var(--bg-elevated)", padding: "8px 10px", borderRadius: "var(--radius)", lineHeight: 1.7 }}>
            {`{ "type": "Point",\n  "coordinates": [${request.location.coordinates.join(", ")}] }`}
          </code>
        </>
      )}
    </div>
  );
}

export default function Requests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: "ALL", category: "ALL", district: "ALL" });
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetchRequests(filters)
      .then(setRequests)
      .finally(() => setLoading(false));
  }, [filters]);

  const setFilter = (key, val) => setFilters((f) => ({ ...f, [key]: val }));

  return (
    <>
      <div className="page-header">
        <div className="page-title">Service Requests</div>
        <div className="page-sub">Embedded status history · 2dsphere geospatial · UC-02, UC-03, UC-07</div>
      </div>

      <div className="page-content">
        <div className="filters" style={{ marginBottom: 16 }}>
          <select value={filters.status} onChange={(e) => setFilter("status", e.target.value)}>
            {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select value={filters.category} onChange={(e) => setFilter("category", e.target.value)}>
            {CATEGORY_OPTIONS.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select value={filters.district} onChange={(e) => setFilter("district", e.target.value)}>
            {DISTRICT_OPTIONS.map((d) => <option key={d}>{d}</option>)}
          </select>
          <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 4 }}>
            {loading ? "Loading…" : `${requests.length} result${requests.length !== 1 ? "s" : ""}`}
          </span>
        </div>

        {loading ? (
          <div className="loading"><div className="spinner" /></div>
        ) : requests.length === 0 ? (
          <div className="empty"><div className="empty-icon">📭</div><div>No requests match these filters</div></div>
        ) : (
          <div className="card" style={{ padding: 0 }}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Request ID</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>District</th>
                    <th>Citizen</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => (
                    <tr key={r.requestId} onClick={() => setSelected(r)}>
                      <td className="td-mono">{r.requestId}</td>
                      <td>{catBadge(r.category)}</td>
                      <td className="td-desc">{r.descriptionEn || r.descriptionAr}</td>
                      <td>{statusBadge(r.status)}</td>
                      <td>{priorityBadge(r.priority)}</td>
                      <td><span className="badge badge-district">{r.districtName}</span></td>
                      <td style={{ fontSize: 12, color: "var(--text-secondary)" }}>{r.citizenName}</td>
                      <td style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--mono)" }}>
                        {new Date(r.createdAt).toLocaleDateString("en-GB")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <DetailPanel request={selected} onClose={() => setSelected(null)} />
    </>
  );
}
