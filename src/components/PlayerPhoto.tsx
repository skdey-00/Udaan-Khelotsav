import { useState, useEffect } from "react";
import type { Player } from "@/data/players";

interface Props {
  player: Player;
  className?: string;
}

const PHOTOS_KEY = "udaan-khelotsav-player-photos";

// Get photo from localStorage if it exists
const getStoredPhoto = (playerSlug: string): string | null => {
  if (typeof window === "undefined") return null;
  try {
    const existingPhotos = localStorage.getItem(PHOTOS_KEY);
    const photosMap = existingPhotos ? JSON.parse(existingPhotos) : {};
    return photosMap[playerSlug] || null;
  } catch {
    return null;
  }
};

// Tries common photo paths in /public/players, falls back to initials.
const candidatePaths = (player: Player): string[] => {
  const exts = ["jpg", "jpeg", "png", "webp", "JPG", "JPEG", "PNG"];

  // If photoFileName is specified, try it first
  if (player.photoFileName) {
    return [`/players/${player.photoFileName}`, ...exts.map((e) => `/players/${player.slug}.${e}`)];
  }

  return exts.map((e) => `/players/${player.slug}.${e}`);
};

export function PlayerPhoto({ player, className }: Props) {
  const [idx, setIdx] = useState(0);
  const paths = candidatePaths(player);
  const [failed, setFailed] = useState(false);
  const [storedPhoto, setStoredPhoto] = useState<string | null>(null);

  // Check for stored photo on mount
  useEffect(() => {
    const photo = getStoredPhoto(player.slug);
    if (photo) {
      setStoredPhoto(photo);
    }
  }, [player.slug]);

  if (failed) {
    const initials = player.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("");
    return (
      <div
        className={
          "flex items-center justify-center bg-gradient-to-br from-primary/30 via-accent/20 to-secondary/30 text-foreground font-display font-bold tracking-wider " +
          (className ?? "")
        }
      >
        <span className="text-5xl md:text-7xl drop-shadow-lg">{initials}</span>
      </div>
    );
  }

  // Use stored photo if available
  if (storedPhoto) {
    return (
      <img
        src={storedPhoto}
        alt={player.name}
        className={"object-cover " + (className ?? "")}
      />
    );
  }

  return (
    <img
      src={paths[idx]}
      alt={player.name}
      className={"object-cover " + (className ?? "")}
      onError={() => {
        if (idx + 1 < paths.length) setIdx(idx + 1);
        else setFailed(true);
      }}
    />
  );
}
