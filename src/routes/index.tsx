import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { useAuction } from "@/hooks/use-auction";
import { TEAM_SEEDS, BID_INCREMENT, BASE_PRICE, STARTING_PURSE } from "@/data/teams";
import { PlayerPhoto } from "@/components/PlayerPhoto";
import { PLAYERS, getPlayerWithEdits } from "@/data/players";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Udaan Khelotsav — Cricket Auction" },
      { name: "description", content: "Live player auction for Udaan Khelotsav cricket tournament." },
    ],
  }),
  component: AuctionPage,
});

const fmt = (n: number) => n.toLocaleString("en-IN");

function AuctionPage() {
  const a = useAuction();
  const [showTeams, setShowTeams] = useState(false);
  const [openTeam, setOpenTeam] = useState<string | null>(null);
  const [pulse, setPulse] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [lastSoldCount, setLastSoldCount] = useState(0);

  useEffect(() => {
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 400);
    return () => clearTimeout(t);
  }, [a.state.currentBid, a.state.currentSlug]);

  // Trigger confetti when a player is sold (not on undo)
  useEffect(() => {
    const currentSoldCount = a.state.sold.length;
    // Only show confetti when sold count increases (new sale), not decreases (undo)
    if (currentSoldCount > lastSoldCount && lastSoldCount >= 0) {
      setConfetti(true);
      setTimeout(() => setConfetti(false), 2000);
    }
    setLastSoldCount(currentSoldCount);
  }, [a.state.sold.length]);

  const totalSold = a.stats.totalSold;
  const totalUnsold = a.stats.totalUnsold;
  const remaining = a.availablePlayers.length;

  // Calculate leaderboard stats
  const leaderboard = useMemo(() => {
    return TEAM_SEEDS.map(team => ({
      ...team,
      roster: a.teamRoster(team.id),
      spent: STARTING_PURSE - (a.state.purses[team.id] ?? STARTING_PURSE),
      avgPrice: a.teamRoster(team.id).length > 0
        ? Math.round((STARTING_PURSE - (a.state.purses[team.id] ?? STARTING_PURSE)) / a.teamRoster(team.id).length)
        : 0
    }))
    .sort((a, b) => b.roster.length - a.roster.length || b.spent - a.spent);
  }, [a.state, a.teamRoster]);

  const topBuys = useMemo(() => {
    return [...a.state.sold]
      .sort((a, b) => b.price - a.price)
      .slice(0, 5)
      .map(s => ({
        ...s,
        player: getPlayerWithEdits(s.playerSlug) || PLAYERS.find(p => p.slug === s.playerSlug)!,
        team: TEAM_SEEDS.find(t => t.id === s.teamId)!
      }));
  }, [a.state.sold]);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-primary/20 backdrop-blur-md bg-background/40 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <img
              src="/logo/Logo Khelotsav.png"
              alt="Udaan Khelotsav Logo"
              className="h-12 md:h-16 w-auto object-contain"
            />
            <div>
              <p className="font-stencil text-xs md:text-sm text-primary/80">Presenting</p>
              <h1 className="font-display text-2xl md:text-4xl font-black text-gold leading-tight">
                UDAAN KHELOTSAV
              </h1>
              <p className="font-stencil text-[10px] md:text-xs text-muted-foreground tracking-[0.3em]">
                CRICKET PLAYER AUCTION
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs md:text-sm">
            <Stat label="Sold" value={totalSold} />
            <Stat label="Unsold" value={totalUnsold} />
            <Stat label="Pool" value={remaining} />
            <button
              onClick={() => setShowLeaderboard(true)}
              className="btn-ghost-sm text-primary/80 hover:text-gold"
            >
              🏆 Leaderboard
            </button>
            <Link to="/admin" className="btn-ghost-sm text-muted-foreground hover:text-primary">
              Admin
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-10 grid lg:grid-cols-[1fr_360px] gap-6">
        {/* Stage */}
        <section className="panel rounded-3xl p-6 md:p-10 relative overflow-hidden spotlight">
          {a.currentPlayer ? (
            <div className="grid md:grid-cols-[280px_1fr] gap-8 items-center relative">
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-2xl" />
                <div className="relative rounded-2xl overflow-hidden gold-ring aspect-square bg-card">
                  <PlayerPhoto player={a.currentPlayer} className="w-full h-full" />
                </div>
                <BadgePill className="absolute -top-3 left-4">{a.currentPlayer.category}</BadgePill>
              </div>
              <div>
                <p className="font-stencil text-primary/80 text-sm">Now on the stage</p>
                <h2 className="font-display text-3xl md:text-5xl font-black mt-1 leading-tight">
                  {a.currentPlayer.name.trim()}
                </h2>
                <div className="flex flex-wrap gap-2 mt-3 text-xs">
                  <Tag>{a.currentPlayer.gender}</Tag>
                  <Tag>{a.currentPlayer.category}</Tag>
                  {a.currentPlayer.age && <Tag>Age {a.currentPlayer.age}</Tag>}
                  <Tag>Base ₹{fmt(BASE_PRICE)}</Tag>
                </div>

                <div className="mt-8">
                  <p className="font-stencil text-xs text-muted-foreground">Current bid</p>
                  <div
                    className={
                      "font-display text-5xl md:text-7xl font-black text-gold transition-transform " +
                      (pulse ? "scale-110" : "scale-100")
                    }
                  >
                    ₹{fmt(a.state.currentBid)}
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button onClick={() => a.bidUp()} className="btn-gold">
                    + ₹{fmt(BID_INCREMENT)}
                  </button>
                  <button onClick={() => a.bidDown()} className="btn-ghost">
                    − ₹{fmt(BID_INCREMENT)}
                  </button>
                  <button onClick={() => {
                    const newBid = a.state.currentBid + (BID_INCREMENT * 5);
                    if (newBid <= 50000) {
                      for(let i = 0; i < 5; i++) a.bidUp();
                    }
                  }} className="btn-gold">
                    + ₹5,000
                  </button>
                  <button onClick={() => {
                    const newBid = a.state.currentBid + (BID_INCREMENT * 10);
                    if (newBid <= 50000) {
                      for(let i = 0; i < 10; i++) a.bidUp();
                    }
                  }} className="btn-gold">
                    + ₹10,000
                  </button>
                  <button onClick={() => setShowTeams(true)} className="btn-success">
                    SOLD
                  </button>
                  <button onClick={a.markUnsold} className="btn-danger">
                    UNSOLD
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 relative">
              <p className="font-stencil text-primary/80 tracking-[0.4em] text-sm">READY</p>
              <h2 className="font-display text-4xl md:text-6xl font-black text-gold mt-2">
                Spin the Auction
              </h2>
              <p className="text-muted-foreground mt-3 max-w-md mx-auto">
                {remaining > 0
                  ? `${remaining} players await their team. Pull a name at random.`
                  : "All players have been processed. Reset to start over."}
              </p>
              <button
                onClick={a.pickRandom}
                disabled={remaining === 0}
                className="btn-gold mt-8 text-lg px-10 py-4 disabled:opacity-40"
              >
                🎲 Pick Random Player
              </button>
            </div>
          )}

          <div className="mt-6 pt-5 border-t border-primary/10 flex flex-wrap gap-3 justify-between items-center">
            <div className="flex gap-2">
              <button
                onClick={a.undo}
                disabled={!a.canUndo}
                className="btn-ghost-sm disabled:opacity-30"
                title="Undo last action"
              >
                ↶ Undo
              </button>
              <button onClick={a.reset} className="btn-ghost-sm">
                Reset
              </button>
            </div>
            {a.currentPlayer && (
              <button onClick={a.pickRandom} className="btn-ghost-sm">
                Skip → New Player
              </button>
            )}
          </div>
        </section>

        {/* Teams sidebar */}
        <aside className="space-y-3">
          <h3 className="font-stencil text-sm text-primary/80 tracking-[0.3em] px-1">FRANCHISES</h3>
          {TEAM_SEEDS.map((t) => {
            const purse = a.state.purses[t.id] ?? 0;
            const roster = a.teamRoster(t.id);
            const pct = (purse / STARTING_PURSE) * 100;
            return (
              <button
                key={t.id}
                onClick={() => setOpenTeam(t.id)}
                className="w-full panel rounded-xl p-3 flex items-center gap-3 text-left hover:gold-ring transition"
              >
                <img src={t.logo} alt={t.name} className="w-12 h-12 rounded-lg object-contain bg-background/50" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-display font-bold truncate">{t.name}</p>
                    <span className="text-xs text-muted-foreground">{roster.length} 👤</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-background/60 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-accent"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-gold font-semibold mt-1">₹{fmt(purse)}</p>
                </div>
              </button>
            );
          })}
        </aside>
      </main>

      {/* Recent sold */}
      {a.state.sold.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 md:px-8 pb-12">
          <h3 className="font-stencil text-sm text-primary/80 tracking-[0.3em] mb-3">RECENT GAVELS</h3>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {[...a.state.sold].reverse().slice(0, 8).map((s) => {
              const player = getPlayerWithEdits(s.playerSlug) || PLAYERS.find((p) => p.slug === s.playerSlug)!;
              const team = TEAM_SEEDS.find((t) => t.id === s.teamId)!;
              return (
                <div key={s.playerSlug} className="panel rounded-xl p-3 flex gap-3 items-center">
                  <div className="w-12 h-12 rounded-lg overflow-hidden">
                    <PlayerPhoto player={player} className="w-full h-full" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{player.name.trim()}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {team.short} · ₹{fmt(s.price)}
                      {player.age && ` · Age ${player.age}`}
                    </p>
                  </div>
                  <img src={team.logo} alt="" className="w-8 h-8 object-contain" />
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Auction Summary */}
      {totalSold > 0 && (
        <section className="max-w-7xl mx-auto px-4 md:px-8 pb-12">
          <h3 className="font-stencil text-sm text-primary/80 tracking-[0.3em] mb-3">AUCTION SUMMARY</h3>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Total Sold" value={totalSold.toString()} sub="players" />
            <StatCard label="Total Amount" value={`₹${fmt(a.stats.totalAmount)}`} sub="spent" />
            <StatCard label="Average Price" value={`₹${fmt(a.stats.avgPrice)}`} sub="per player" />
            <StatCard
              label="Highest Sale"
              value={`₹${fmt(a.stats.highestSale?.price ?? 0)}`}
              sub={a.stats.highestSale?.player.split(' ').slice(0, 2).join(' ') ?? '-'}
            />
          </div>
        </section>
      )}

      {/* Sell modal */}
      {showTeams && a.currentPlayer && (
        <Modal onClose={() => setShowTeams(false)}>
          <h3 className="font-display text-2xl font-black text-gold">Assign to Team</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {a.currentPlayer.name.trim()} · ₹{fmt(a.state.currentBid)}
          </p>
          <div className="grid sm:grid-cols-2 gap-3 mt-5">
            {TEAM_SEEDS.map((t) => {
              const canAfford = (a.state.purses[t.id] ?? 0) >= a.state.currentBid;
              return (
                <button
                  key={t.id}
                  disabled={!canAfford}
                  onClick={() => {
                    a.sellTo(t.id);
                    setShowTeams(false);
                  }}
                  className="panel rounded-xl p-3 flex items-center gap-3 hover:gold-ring transition disabled:opacity-30 disabled:cursor-not-allowed text-left"
                >
                  <img src={t.logo} alt="" className="w-12 h-12 object-contain" />
                  <div className="flex-1">
                    <p className="font-display font-bold">{t.name}</p>
                    <p className="text-xs text-gold">₹{fmt(a.state.purses[t.id])}</p>
                    {!canAfford && <p className="text-[10px] text-destructive">Not enough purse</p>}
                  </div>
                </button>
              );
            })}
          </div>
        </Modal>
      )}

      {/* Team detail modal */}
      {openTeam && (() => {
        const t = TEAM_SEEDS.find((x) => x.id === openTeam)!;
        const roster = a.teamRoster(openTeam);
        const spent = roster.reduce((s, r) => s + r.price, 0);
        return (
          <Modal onClose={() => setOpenTeam(null)}>
            <div className="flex items-center gap-4">
              <img src={t.logo} alt="" className="w-16 h-16 object-contain" />
              <div>
                <h3 className="font-display text-2xl font-black text-gold">{t.name}</h3>
                <p className="text-xs text-muted-foreground">
                  Purse ₹{fmt(a.state.purses[t.id])} · Spent ₹{fmt(spent)} · Squad {roster.length}
                </p>
              </div>
            </div>
            <div className="mt-5 space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {roster.length === 0 && (
                <p className="text-muted-foreground text-sm py-6 text-center">No players yet.</p>
              )}
              {roster.map((r) => (
                <div key={r.playerSlug} className="flex items-center gap-3 panel rounded-lg p-2">
                  <div className="w-10 h-10 rounded overflow-hidden">
                    <PlayerPhoto player={r.player} className="w-full h-full" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{r.player.name.trim()}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.player.category} · {r.player.gender}
                      {r.player.age && ` · Age ${r.player.age}`}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-gold">₹{fmt(r.price)}</p>
                </div>
              ))}
            </div>
          </Modal>
        );
      })()}

      {/* Leaderboard modal */}
      {showLeaderboard && (
        <Modal onClose={() => setShowLeaderboard(false)}>
          <h3 className="font-display text-2xl font-black text-gold">🏆 Leaderboard</h3>
          <p className="text-sm text-muted-foreground mt-1">Team standings and top purchases</p>

          <div className="mt-5 space-y-4">
            {/* Team standings */}
            <div>
              <h4 className="font-stencil text-sm text-primary/80 mb-2">TEAM STANDINGS</h4>
              <div className="space-y-2">
                {leaderboard.map((team, idx) => (
                  <div key={team.id} className="panel rounded-lg p-3 flex items-center gap-3">
                    <span className="font-display font-bold text-gold text-lg w-6">#{idx + 1}</span>
                    <img src={team.logo} alt="" className="w-10 h-10 object-contain" />
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{team.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {team.roster.length} players · Avg ₹{fmt(team.avgPrice)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gold">₹{fmt(team.spent)}</p>
                      <p className="text-xs text-muted-foreground">spent</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top buys */}
            {topBuys.length > 0 && (
              <div>
                <h4 className="font-stencil text-sm text-primary/80 mb-2">💰 TOP BUYS</h4>
                <div className="space-y-2">
                  {topBuys.map((buy, idx) => (
                    <div key={buy.playerSlug} className="panel rounded-lg p-3 flex items-center gap-3">
                      <span className="font-display font-bold text-gold w-6">{idx + 1}.</span>
                      <div className="w-10 h-10 rounded overflow-hidden">
                        <PlayerPhoto player={buy.player} className="w-full h-full" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{buy.player.name.trim()}</p>
                        <p className="text-xs text-muted-foreground">{buy.team.short}</p>
                      </div>
                      <p className="text-sm font-bold text-gold">₹{fmt(buy.price)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Confetti effect */}
      {confetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 0.5}s`,
                background: `hsl(${Math.random() * 360}, 80%, 60%)`,
              }}
            />
          ))}
        </div>
      )}

      <style>{`
        .btn-gold { background: var(--gradient-gold); color: var(--primary-foreground); padding: 0.75rem 1.5rem; border-radius: 0.75rem; font-weight: 700; font-family: var(--font-stencil); letter-spacing: 0.1em; box-shadow: var(--shadow-gold); transition: transform .15s; }
        .btn-gold:hover { transform: translateY(-2px); }
        .btn-ghost { padding: 0.75rem 1.25rem; border-radius: 0.75rem; border: 1px solid oklch(0.82 0.16 85 / 0.4); color: var(--color-foreground); font-weight: 600; background: transparent; transition: background .15s; }
        .btn-ghost:hover { background: oklch(0.82 0.16 85 / 0.1); }
        .btn-ghost-sm { padding: 0.4rem 0.9rem; border-radius: 0.5rem; border: 1px solid oklch(0.82 0.16 85 / 0.3); font-size: 0.8rem; color: var(--color-foreground); background: transparent; }
        .btn-ghost-sm:hover { background: oklch(0.82 0.16 85 / 0.1); }
        .btn-success { padding: 0.75rem 1.75rem; border-radius: 0.75rem; background: linear-gradient(135deg, oklch(0.7 0.18 145), oklch(0.55 0.18 150)); color: white; font-weight: 800; font-family: var(--font-stencil); letter-spacing: 0.15em; box-shadow: 0 8px 24px -8px oklch(0.6 0.18 145 / 0.6); }
        .btn-success:hover { transform: translateY(-2px); }
        .btn-danger { padding: 0.75rem 1.75rem; border-radius: 0.75rem; background: linear-gradient(135deg, oklch(0.65 0.24 27), oklch(0.5 0.22 27)); color: white; font-weight: 800; font-family: var(--font-stencil); letter-spacing: 0.15em; }
        .btn-danger:hover { transform: translateY(-2px); }
        @keyframes confetti-fall {
          0% { transform: translateY(-100%) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .confetti {
          position: fixed;
          top: 0;
          width: 10px;
          height: 10px;
          z-index: 100;
          animation: confetti-fall 3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="panel rounded-lg px-3 py-1.5 text-center">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="font-display font-bold text-gold leading-none">{value}</p>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="panel rounded-xl p-4 text-center">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
      <p className="font-display text-2xl md:text-3xl font-black text-gold leading-none">{value}</p>
      <p className="text-xs text-muted-foreground mt-1 truncate">{sub}</p>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="px-2.5 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-semibold">
      {children}
    </span>
  );
}

function BadgePill({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={
        "px-3 py-1 rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground text-xs font-bold font-stencil tracking-wider " +
        (className ?? "")
      }
    >
      {children}
    </span>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="panel rounded-2xl p-6 max-w-lg w-full gold-ring"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
        <button onClick={onClose} className="btn-ghost-sm mt-5 w-full">
          Close
        </button>
      </div>
    </div>
  );
}
