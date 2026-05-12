import { useCallback, useEffect, useMemo, useState } from "react";
import { PLAYERS, getPlayerWithEdits, type Player } from "@/data/players";
import { BASE_PRICE, BID_INCREMENT, STARTING_PURSE, TEAM_SEEDS, getBasePriceForGrade, getBidIncrementForGrade, getGradeOrder } from "@/data/teams";

export type PlayerStatus = "available" | "sold" | "unsold";

export interface SoldRecord {
  playerSlug: string;
  teamId: string;
  price: number;
}

export interface AuctionState {
  statuses: Record<string, PlayerStatus>;
  sold: SoldRecord[];
  purses: Record<string, number>;
  currentSlug: string | null;
  currentBid: number;
  history: AuctionState[]; // snapshots BEFORE each action
}

export interface AuctionStats {
  totalSold: number;
  totalUnsold: number;
  totalAmount: number;
  avgPrice: number;
  highestSale: { player: string; price: number } | null;
  categoryBreakdown: Record<string, number>;
  genderBreakdown: Record<string, number>;
}

const STORAGE_KEY = "udaan-khelotsav-auction-v1";

const initial = (): AuctionState => ({
  statuses: Object.fromEntries(PLAYERS.map((p) => [p.slug, "available"])),
  sold: [],
  purses: Object.fromEntries(TEAM_SEEDS.map((t) => [t.id, STARTING_PURSE])),
  currentSlug: null,
  currentBid: BASE_PRICE,
  history: [],
});

const stripHistory = (s: AuctionState): AuctionState => ({ ...s, history: [] });

export function useAuction() {
  const [state, setState] = useState<AuctionState>(() => {
    if (typeof window === "undefined") return initial();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as AuctionState;
    } catch {}
    return initial();
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [state]);

  const snapshot = (s: AuctionState): AuctionState => ({
    ...stripHistory(s),
    history: [...s.history, stripHistory(s)].slice(-50),
  });

  // Sort available players by grade (A first, then B, then C), then by name
  const availablePlayers = useMemo(
    () => {
      const players = PLAYERS.filter((p) => state.statuses[p.slug] === "available");
      return players.sort((a, b) => {
        const gradeOrderA = getGradeOrder(a.grade);
        const gradeOrderB = getGradeOrder(b.grade);
        if (gradeOrderA !== gradeOrderB) {
          return gradeOrderA - gradeOrderB;
        }
        return a.name.localeCompare(b.name);
      });
    },
    [state.statuses]
  );

  const currentPlayer: Player | null = useMemo(
    () => getPlayerWithEdits(state.currentSlug ?? '') ?? PLAYERS.find((p) => p.slug === state.currentSlug) ?? null,
    [state.currentSlug]
  );

  // Get the current player's grade-specific base price and increment
  const currentGradeSettings = useMemo(() => {
    if (!currentPlayer) return { basePrice: BASE_PRICE, bidIncrement: BID_INCREMENT };
    return {
      basePrice: getBasePriceForGrade(currentPlayer.grade),
      bidIncrement: getBidIncrementForGrade(currentPlayer.grade),
    };
  }, [currentPlayer]);

  // Pick next player by grade order (A first, then B, then C)
  const pickNextByGrade = useCallback(() => {
    const available = PLAYERS.filter((p) => state.statuses[p.slug] === "available");
    if (available.length === 0) return null;

    // Sort by grade order, then by name
    const sorted = [...available].sort((a, b) => {
      const gradeOrderA = getGradeOrder(a.grade);
      const gradeOrderB = getGradeOrder(b.grade);
      if (gradeOrderA !== gradeOrderB) {
        return gradeOrderA - gradeOrderB;
      }
      return a.name.localeCompare(b.name);
    });

    return sorted[0];
  }, [state.statuses]);

  const pickRandom = useCallback(() => {
    setState((s) => {
      const next = pickNextByGrade();
      if (!next) return s;

      const basePrice = getBasePriceForGrade(next.grade);
      return { ...snapshot(s), currentSlug: next.slug, currentBid: basePrice };
    });
  }, [pickNextByGrade]);

  const bidUp = useCallback(() => {
    setState((s) => {
      if (!s.currentSlug) return s;
      const player = getPlayerWithEdits(s.currentSlug) || PLAYERS.find((p) => p.slug === s.currentSlug);
      const increment = getBidIncrementForGrade(player?.grade);
      return { ...snapshot(s), currentBid: s.currentBid + increment };
    });
  }, []);

  const bidDown = useCallback(() => {
    setState((s) => {
      if (!s.currentSlug) return s;
      const player = getPlayerWithEdits(s.currentSlug) || PLAYERS.find((p) => p.slug === s.currentSlug);
      const basePrice = getBasePriceForGrade(player?.grade);
      const increment = getBidIncrementForGrade(player?.grade);
      return s.currentBid > basePrice
        ? { ...snapshot(s), currentBid: s.currentBid - increment }
        : s;
    });
  }, []);

  const markUnsold = useCallback(() => {
    setState((s) => {
      if (!s.currentSlug) return s;
      const player = getPlayerWithEdits(s.currentSlug) || PLAYERS.find((p) => p.slug === s.currentSlug);
      const basePrice = getBasePriceForGrade(player?.grade);
      const ns = snapshot(s);
      return {
        ...ns,
        statuses: { ...ns.statuses, [s.currentSlug]: "unsold" },
        currentSlug: null,
        currentBid: basePrice,
      };
    });
  }, []);

  const sellTo = useCallback((teamId: string) => {
    setState((s) => {
      if (!s.currentSlug) return s;
      const price = s.currentBid;
      if ((s.purses[teamId] ?? 0) < price) return s;
      const player = getPlayerWithEdits(s.currentSlug) || PLAYERS.find((p) => p.slug === s.currentSlug);
      const basePrice = getBasePriceForGrade(player?.grade);
      const ns = snapshot(s);
      return {
        ...ns,
        statuses: { ...ns.statuses, [s.currentSlug]: "sold" },
        sold: [...ns.sold, { playerSlug: s.currentSlug, teamId, price }],
        purses: { ...ns.purses, [teamId]: ns.purses[teamId] - price },
        currentSlug: null,
        currentBid: basePrice,
      };
    });
  }, []);

  const undo = useCallback(() => {
    setState((s) => {
      if (s.history.length === 0) return s;
      const prev = s.history[s.history.length - 1];
      return { ...prev, history: s.history.slice(0, -1) };
    });
  }, []);

  const reset = useCallback(() => {
    if (typeof window !== "undefined" && !confirm("Reset entire auction?")) return;
    setState(initial());
  }, []);

  const teamRoster = useCallback(
    (teamId: string) =>
      state.sold
        .filter((s) => s.teamId === teamId)
        .map((s) => ({
          ...s,
          player: getPlayerWithEdits(s.playerSlug) || PLAYERS.find((p) => p.slug === s.playerSlug)!,
        })),
    [state.sold]
  );

  const stats = useMemo((): AuctionStats => {
    const totalSold = state.sold.length;
    const totalUnsold = Object.values(state.statuses).filter((s) => s === "unsold").length;
    const totalAmount = state.sold.reduce((sum, s) => sum + s.price, 0);
    const avgPrice = totalSold > 0 ? Math.round(totalAmount / totalSold) : 0;

    let highestSale: { player: string; price: number } | null = null;
    state.sold.forEach((s) => {
      if (!highestSale || s.price > highestSale.price) {
        const player = getPlayerWithEdits(s.playerSlug) || PLAYERS.find((p) => p.slug === s.playerSlug);
        if (player) {
          highestSale = { player: player.name, price: s.price };
        }
      }
    });

    const categoryBreakdown: Record<string, number> = {};
    const genderBreakdown: Record<string, number> = {};

    state.sold.forEach((s) => {
      const player = getPlayerWithEdits(s.playerSlug) || PLAYERS.find((p) => p.slug === s.playerSlug);
      if (player) {
        categoryBreakdown[player.category] = (categoryBreakdown[player.category] || 0) + 1;
        genderBreakdown[player.gender] = (genderBreakdown[player.gender] || 0) + 1;
      }
    });

    return {
      totalSold,
      totalUnsold,
      totalAmount,
      avgPrice,
      highestSale,
      categoryBreakdown,
      genderBreakdown,
    };
  }, [state]);

  return {
    state,
    availablePlayers,
    currentPlayer,
    pickRandom,
    pickNextByGrade,
    bidUp,
    bidDown,
    markUnsold,
    sellTo,
    undo,
    reset,
    teamRoster,
    stats,
    currentGradeSettings,
    canUndo: state.history.length > 0,
  };
}
