import { useState } from "react";
import Dashboard from "./pages/Dashboard.jsx";
import Requests from "./pages/Requests.jsx";
import Search from "./pages/Search.jsx";
import MapView from "./pages/MapView.jsx";
import Analytics from "./pages/Analytics.jsx";

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: "⊞" },
  { id: "requests", label: "Service Requests", icon: "≡" },
  { id: "search", label: "Search", icon: "⌕" },
  { id: "map", label: "Map View", icon: "◎" },
  { id: "analytics", label: "Analytics", icon: "▲" },
];

export default function App() {
  const [page, setPage] = useState("dashboard");

  const pages = {
    dashboard: <Dashboard onNav={setPage} />,
    requests: <Requests />,
    search: <Search />,
    map: <MapView />,
    analytics: <Analytics />,
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-title">🏙 SmartCity PS</div>
          <div className="sidebar-logo-sub">Services Platform</div>
        </div>

        <nav className="sidebar-nav">
          {NAV.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${page === item.id ? "active" : ""}`}
              onClick={() => setPage(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-status">
          <div className="status-dot">
            <div className="dot dot-green" />
            MongoDB connected
          </div>
          <div className="status-dot">
            <div className="dot dot-blue" />
            Elasticsearch ready
          </div>
          <div className="status-dot">
            <div className="dot dot-gray" />
            smartcity · 7 collections
          </div>
        </div>
      </aside>

      <main className="main">{pages[page]}</main>
    </div>
  );
}
