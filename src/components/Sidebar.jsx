import { LayoutDashboard, Trophy, Users, MenuSquare, Settings, X } from "lucide-react";

const nav = [
  ["overview", "Overview", LayoutDashboard],
  ["league", "League", Trophy],
  ["friendly", "Friendly Group", Users],
  ["matches", "Matches", MenuSquare],
  ["settings", "Settings", Settings]
];

export default function Sidebar({ page, onNavigate, open, onClose }) {
  return (
    <>
      {open && <button className="overlay" onClick={onClose} aria-label="Close menu" />}
      <aside id="main-sidebar" className={`sidebar ${open ? "is-open" : ""}`} onKeyDown={(event) => { if (event.key === "Escape") onClose(); }}>
        <div className="sidebar-header">
          <div className="brand">
            <div className="brand-mark">MP</div>
            <div>
              <strong>Match Point</strong>
              <span>LEAGUES</span>
            </div>
          </div>
          <button className="icon-button sidebar-close" onClick={onClose} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <div className="club-label">RIVERSIDE PADEL CLUB</div>

        <nav className="sidebar-nav">
          {nav.map(([key, label, Icon]) => (
            <button
              key={key}
              className={page === key ? "active" : ""}
              aria-current={page === key ? "page" : undefined}
              onClick={() => onNavigate(key)}
            >
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-help">
          <span className="status-dot" />
          <div>
            <strong>Friendly points live</strong>
            <span>Manual matches now update standings.</span>
          </div>
        </div>
      </aside>
    </>
  );
}
