import { Menu, Moon, Search, Sun, X } from "lucide-react";
import { useRef } from "react";

export default function Topbar({ onOpenMenu, menuOpen, searchQuery, onSearchChange, theme, onToggleTheme }) {
  const searchRef = useRef(null);
  const clearSearch = () => {
    onSearchChange("");
    searchRef.current?.focus();
  };
  return (
    <header className="topbar">
      <button className="icon-button mobile-menu" onClick={onOpenMenu} aria-label="Open menu" aria-expanded={menuOpen} aria-controls="main-sidebar">
        <Menu size={20} />
      </button>

      <form className="search-box" role="search" onSubmit={(event) => event.preventDefault()}>
        <Search size={17} aria-hidden="true" />
        <input
          ref={searchRef}
          type="search"
          aria-label="Search"
          placeholder="Search players, matches or competitions..."
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Escape") clearSearch(); }}
        />
        {searchQuery && <button className="search-clear" type="button" aria-label="Clear search" onClick={clearSearch}><X size={16} /></button>}
      </form>

      <div className="topbar-actions">
        <button
          className="icon-button"
          type="button"
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          title={theme === "dark" ? "Light mode" : "Dark mode"}
          onClick={onToggleTheme}
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <div className="profile">
          <div className="profile-avatar">AD</div>
          <div>
            <strong>Club Admin</strong>
            <span>Organiser</span>
          </div>
        </div>
      </div>
    </header>
  );
}
