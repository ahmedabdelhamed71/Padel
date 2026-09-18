import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import AddMatchModal from "./components/AddMatchModal";
import AddPlayerModal from "./components/AddPlayerModal";
import ClearMatchesModal from "./components/ClearMatchesModal";
import Overview from "./pages/Overview";
import League from "./pages/League";
import Friendly from "./pages/Friendly";
import SearchResults from "./pages/SearchResults";
import { searchClub } from "./search";
import { leagueFixtures, players as starterPlayers, starterFriendlyMatches } from "./data";
import { buildFriendlyStandings } from "./utils";
import { loadPlayers, loadMatches, loadScoring, loadLeaguePlayers, loadLeagueTeams, loadLeagueMatches, saveStorage, PLAYERS_KEY, MATCHES_KEY, SCORING_KEY, LEAGUE_PLAYERS_KEY, LEAGUE_TEAMS_KEY, LEAGUE_MATCHES_KEY } from "./storage";

export default function App() {
  const [page, setPage] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [friendlyTab, setFriendlyTab] = useState("standings");
  const [searchTarget, setSearchTarget] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [matchModalOpen, setMatchModalOpen] = useState(false);
  const [playerModalOpen, setPlayerModalOpen] = useState(false);
  const [clearMatchesOpen, setClearMatchesOpen] = useState(false);
  const [storageFailed, setStorageFailed] = useState(false);
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("mp-theme") === "dark" ? "dark" : "light";
    } catch {
      return "light";
    }
  });
  const [players, setPlayers] = useState(() => loadPlayers([]));
  const [matches, setMatches] = useState(() =>
    loadMatches(players, [])
  );
  const [scoring, setScoring] = useState(() => loadScoring());
  const [leaguePlayers, setLeaguePlayers] = useState(() => loadLeaguePlayers());
  const [leagueTeams, setLeagueTeams] = useState(() => loadLeagueTeams(loadLeaguePlayers()));
  const [leagueMatches, setLeagueMatches] = useState(() =>
    loadLeagueMatches(loadLeagueTeams(loadLeaguePlayers()))
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("mp-theme", theme);
    } catch {
      // Theme still works for the current session if storage is unavailable.
    }
  }, [theme]);

  useEffect(() => {
    const playersSaved = saveStorage(PLAYERS_KEY, players);
    const matchesSaved = playersSaved && saveStorage(MATCHES_KEY, matches);
    const scoringSaved = saveStorage(SCORING_KEY, scoring);
    const leaguePlayersSaved = saveStorage(LEAGUE_PLAYERS_KEY, leaguePlayers);
    const leagueTeamsSaved = saveStorage(LEAGUE_TEAMS_KEY, leagueTeams);
    const leagueMatchesSaved = saveStorage(LEAGUE_MATCHES_KEY, leagueMatches);
    setStorageFailed(
      !playersSaved ||
      !matchesSaved ||
      !scoringSaved ||
      !leaguePlayersSaved ||
      !leagueTeamsSaved ||
      !leagueMatchesSaved
    );
  }, [players, matches, scoring, leaguePlayers, leagueTeams, leagueMatches]);

  const standings = useMemo(
    () => buildFriendlyStandings(players, matches, scoring),
    [players, matches, scoring]
  );

  const searchGroups = useMemo(
    () => searchClub(searchQuery, standings, matches, players, leagueFixtures),
    [searchQuery, standings, matches, players]
  );
  const searching = searchQuery.trim().length > 0;

  useEffect(() => {
    if (!searchTarget || searching) return;
    const target = document.getElementById(searchTarget);
    target?.focus({ preventScroll: true });
    target?.scrollIntoView({ block: "center" });
    setSearchTarget(null);
  }, [searchTarget, searching, page, friendlyTab]);

  const navigate = (nextPage) => {
    setPage(nextPage);
    setSearchQuery("");
    setSearchTarget(null);
    setFriendlyTab(nextPage === "matches" ? "matches" : nextPage === "settings" ? "settings" : "standings");
    setMenuOpen(false);
  };

  const openSearchResult = (result) => {
    navigate(result.page);
    setFriendlyTab(result.tab ?? "standings");
    setSearchTarget(result.targetId ?? null);
  };

  let content;

  if (page === "overview") {
    content = (
      <Overview
        rows={standings}
        matches={matches}
        scoring={scoring}
        fixtures={leagueFixtures}
        onLeague={() => navigate("league")}
        onFriendly={() => navigate("friendly")}
      />
    );
  } else if (page === "league") {
    content = (
      <League
        players={leaguePlayers}
        teams={leagueTeams}
        matches={leagueMatches}
        scoring={scoring}
        onPlayersChange={setLeaguePlayers}
        onTeamsChange={setLeagueTeams}
        onMatchesChange={setLeagueMatches}
      />
    );
  } else {
    content = (
      <Friendly
        key={page}
        tab={friendlyTab}
        onTabChange={setFriendlyTab}
        rows={standings}
        matches={matches}
        players={players}
        scoring={scoring}
        setScoring={setScoring}
        onAddMatch={() => setMatchModalOpen(true)}
        onAddPlayer={() => setPlayerModalOpen(true)}
        onClearMatches={() => setClearMatchesOpen(true)}
        onDeletePlayer={(playerId) => {
          setPlayers((current) => current.filter((player) => player.id !== playerId));
          setMatches((current) =>
            current.filter(
              (match) =>
                !match.teamA.includes(playerId) &&
                !match.teamB.includes(playerId)
            )
          );
        }}
      />
    );
  }

  return (
    <div className="app-shell">
      <Sidebar
        page={page}
        onNavigate={navigate}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />

      <div className="content-shell">
        <Topbar
          menuOpen={menuOpen}
          onOpenMenu={() => setMenuOpen(true)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          theme={theme}
          onToggleTheme={() =>
            setTheme((current) => current === "dark" ? "light" : "dark")
          }
        />
        <main>
          {storageFailed && (
            <div className="storage-warning" role="alert">
              Changes could not be saved on this device. Keep this page open to avoid losing players, results or settings.
            </div>
          )}
          <div hidden={searching}>{content}</div>
          {searching && <SearchResults query={searchQuery} groups={searchGroups} onOpen={openSearchResult} />}
        </main>
      </div>

      {matchModalOpen && (
        <AddMatchModal
          players={players}
          onClose={() => setMatchModalOpen(false)}
          onSave={(match) => {
            setMatches((current) => [...current, match]);
            setFriendlyTab("matches");
          }}
        />
      )}
      {playerModalOpen && (
        <AddPlayerModal
          players={players}
          onClose={() => setPlayerModalOpen(false)}
          onSave={(player) => setPlayers((current) => [...current, player])}
        />
      )}
      {clearMatchesOpen && (
        <ClearMatchesModal
          count={matches.length}
          onClose={() => setClearMatchesOpen(false)}
          onConfirm={() => {
            setMatches([]);
            setClearMatchesOpen(false);
          }}
        />
      )}
    </div>
  );
}
