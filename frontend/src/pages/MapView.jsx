import { useEffect, useState } from "react";
import { fetchMapData } from "../api.js";

const STATUS_COLOR = {
  OPEN: "#f5a623",
  ASSIGNED: "#4f8ef7",
  IN_PROGRESS: "#4f8ef7",
  RESOLVED: "#34c47c",
  CLOSED: "#555a72",
  REJECTED: "#f05252",
};

const CAT_ICON = {
  street_lighting: "💡",
  waste: "🗑",
  traffic: "🚦",
  water: "💧",
  infrastructure: "🏗",
  emergency: "🚨",
};

// Lazy-load Leaflet only when needed
let L = null;

export default function MapView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("ALL");
  const [mapReady, setMapReady] = useState(false);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetchMapData()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!data || mapReady) return;

    // Dynamic import of Leaflet
    import("leaflet").then((leaflet) => {
      L = leaflet.default;

      // Fix default icon paths for Vite
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      const mapEl = document.getElementById("leaflet-map");
      if (!mapEl || mapEl._leaflet_id) return;

      const map = L.map("leaflet-map", {
        center: [31.9026, 35.2034],
        zoom: 14,
        zoomControl: true,
      });

      // Dark tile layer
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: "© OpenStreetMap © CARTO",
        maxZoom: 19,
      }).addTo(map);

      // Add service request markers
      const markers = [];
      data.requests.forEach((r) => {
        if (!r.location?.coordinates) return;
        const [lng, lat] = r.location.coordinates;
        const color = STATUS_COLOR[r.status] || "#888";

        const icon = L.divIcon({
          className: "",
          html: `<div style="
            width: 28px; height: 28px; border-radius: 50%;
            background: ${color}22; border: 2px solid ${color};
            display: flex; align-items: center; justify-content: center;
            font-size: 13px; cursor: pointer;
            box-shadow: 0 0 8px ${color}44;
          ">${CAT_ICON[r.category] || "📍"}</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const marker = L.marker([lat, lng], { icon }).addTo(map);
        marker.on("click", () => setSelected(r));
        markers.push(marker);
      });

      // Add geopoints (infrastructure)
      data.geopoints.forEach((g) => {
        if (!g.location?.coordinates) return;
        const [lng, lat] = g.location.coordinates;
        const icon = L.divIcon({
          className: "",
          html: `<div style="width:10px;height:10px;border-radius:50%;background:#2e3348;border:1.5px solid #555a72;"></div>`,
          iconSize: [10, 10],
          iconAnchor: [5, 5],
        });
        L.marker([lat, lng], { icon }).addTo(map).bindTooltip(g.nameAr, { className: "leaflet-tooltip-dark" });
      });

      // 500m radius circle around central market
      L.circle([31.9010, 35.2050], {
        radius: 500,
        color: "#f05252",
        weight: 1.5,
        opacity: 0.6,
        fillColor: "#f05252",
        fillOpacity: 0.04,
        dashArray: "5, 5",
      }).addTo(map).bindTooltip("500m hotspot radius — central market", { permanent: false });

      setMapReady(true);
    });
  }, [data]);

  const filtered = data?.requests.filter((r) => filter === "ALL" || r.status === filter) || [];

  return (
    <>
      <div className="page-header">
        <div className="page-title">Map View</div>
        <div className="page-sub">2dsphere geospatial index · $near · $geoWithin · UC-08 hotspot detection</div>
      </div>

      <div className="page-content" style={{ padding: "16px 28px" }}>
        {loading && <div className="loading"><div className="spinner" /><span>Loading map data...</span></div>}
        {error && <div style={{ color: "var(--red)", padding: 16 }}>⚠ {error}</div>}

        {data && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16 }}>
            <div>
              <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                {["ALL", "OPEN", "IN_PROGRESS", "RESOLVED", "REJECTED"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilter(s)}
                    style={{
                      padding: "5px 12px", borderRadius: 20, fontSize: 11, cursor: "pointer",
                      background: filter === s ? "var(--blue-dim)" : "var(--bg-elevated)",
                      border: `1px solid ${filter === s ? "var(--blue)" : "var(--border)"}`,
                      color: filter === s ? "var(--blue)" : "var(--text-secondary)",
                    }}
                  >
                    {s === "ALL" ? `All (${data.requests.length})` : s.replace("_", " ")}
                  </button>
                ))}
              </div>

              <div id="leaflet-map" className="map-container" style={{ height: "calc(100vh - 220px)" }} />

              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
                {Object.entries(STATUS_COLOR).map(([s, c]) => (
                  <div key={s} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--text-secondary)" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: c }} />
                    {s.replace("_", " ")}
                  </div>
                ))}
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--text-secondary)" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#2e3348", border: "1.5px solid #555" }} />
                  Infrastructure point
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Selected request */}
              {selected ? (
                <div className="card" style={{ fontSize: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--text-muted)" }}>{selected.requestId}</div>
                    <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 16 }}>×</button>
                  </div>
                  <div style={{ fontWeight: 500, marginBottom: 8 }}>{selected.subcategory?.replace(/_/g, " ")}</div>
                  <div style={{ color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 10 }}>{selected.descriptionEn?.substring(0, 120)}...</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span className={`badge badge-${selected.status?.toLowerCase()}`}>{selected.status?.replace("_", " ")}</span>
                    <span className="badge badge-district">{selected.districtName}</span>
                  </div>
                  {selected.location?.coordinates && (
                    <div style={{ marginTop: 10, fontFamily: "var(--mono)", fontSize: 10, color: "var(--text-muted)" }}>
                      [{selected.location.coordinates[1].toFixed(4)}, {selected.location.coordinates[0].toFixed(4)}]
                    </div>
                  )}
                </div>
              ) : (
                <div className="card" style={{ textAlign: "center", fontSize: 12, color: "var(--text-muted)", padding: "24px 16px" }}>
                  Click a marker to see request details
                </div>
              )}

              {/* Geospatial query info */}
              <div className="card">
                <div className="card-title">Active geo queries</div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.8 }}>
                  <div style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                    <div style={{ color: "var(--green)", fontFamily: "var(--mono)", fontSize: 11 }}>$near</div>
                    <div style={{ color: "var(--text-muted)", fontSize: 11 }}>500m radius · central market</div>
                  </div>
                  <div style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                    <div style={{ color: "var(--green)", fontFamily: "var(--mono)", fontSize: 11 }}>$geoWithin</div>
                    <div style={{ color: "var(--text-muted)", fontSize: 11 }}>District boundary polygons</div>
                  </div>
                  <div style={{ padding: "8px 0" }}>
                    <div style={{ color: "var(--green)", fontFamily: "var(--mono)", fontSize: 11 }}>2dsphere index</div>
                    <div style={{ color: "var(--text-muted)", fontSize: 11 }}>on service_requests.location</div>
                  </div>
                </div>
              </div>

              {/* Request list */}
              <div className="card" style={{ flex: 1, overflow: "hidden" }}>
                <div className="card-title">Requests on map ({data.requests.length})</div>
                <div style={{ overflowY: "auto", maxHeight: 300 }}>
                  {data.requests.map((r) => (
                    <div
                      key={r.requestId}
                      onClick={() => setSelected(r)}
                      style={{
                        padding: "8px 0", borderBottom: "1px solid var(--border)", cursor: "pointer",
                        display: "flex", gap: 8, alignItems: "flex-start",
                      }}
                    >
                      <span style={{ fontSize: 14, flexShrink: 0 }}>{CAT_ICON[r.category] || "📍"}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--text-muted)" }}>{r.requestId}</div>
                        <div style={{ fontSize: 12, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {r.subcategory?.replace(/_/g, " ")}
                        </div>
                      </div>
                      <span className={`badge badge-${r.status?.toLowerCase()}`} style={{ flexShrink: 0, fontSize: 10 }}>{r.status?.replace("_", " ")}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
