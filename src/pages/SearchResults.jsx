import { ArrowRight, Search } from "lucide-react";

export default function SearchResults({ query, groups, onOpen }) {
  const count = groups.reduce((total, group) => total + group.items.length, 0);

  return (
    <div className="page search-page">
      <div className="page-heading">
        <span className="eyebrow">SEARCH</span>
        <h1>Search results</h1>
        <p role="status">{count} {count === 1 ? "result" : "results"} for “{query.trim()}”</p>
      </div>

      {count === 0 && (
        <section className="panel empty-panel">
          <Search size={28} aria-hidden="true" />
          <h2>No results found</h2>
          <p>Try a player name, competition, match date or round.</p>
        </section>
      )}

      {groups.filter((group) => group.items.length > 0).map((group) => (
        <section className="panel search-group" key={group.kind} aria-labelledby={`search-${group.kind}`}>
          <div className="panel-header">
            <h2 id={`search-${group.kind}`}>{group.title}</h2>
            <span className="search-count">{group.items.length}</span>
          </div>
          <ul className="search-result-list">
            {group.items.map((item) => (
              <li key={item.id}>
                <button className="search-result" data-kind={group.kind} onClick={() => onOpen(item)}>
                  <span>
                    <strong>{item.title}</strong>
                    <span className="search-result-detail">{item.detail}</span>
                  </span>
                  <ArrowRight size={18} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
