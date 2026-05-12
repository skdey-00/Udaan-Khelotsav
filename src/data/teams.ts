import royal from "@/assets/teams/royal-elegance.png";
import vishal from "@/assets/teams/vishal-warriors.png";
import jalaram from "@/assets/teams/jalaram-blasters.png";
import saksham from "@/assets/teams/saksham-strikers.png";
import palakraj from "@/assets/teams/palakraj.png";
import savi from "@/assets/teams/savi-super-kings.png";
import sangam from "@/assets/teams/sangam-fire-warriors.png";

export interface TeamSeed {
  id: string;
  name: string;
  short: string;
  logo: string;
  accent: string;
}

export const TEAM_SEEDS: TeamSeed[] = [
  { id: "royal", name: "Royal Elegance XI", short: "REX", logo: royal, accent: "#d4af37" },
  { id: "vishal", name: "Vishal Warriors", short: "VWR", logo: vishal, accent: "#f4c430" },
  { id: "jalaram", name: "Jalaram Blasters", short: "JBL", logo: jalaram, accent: "#ffb627" },
  { id: "saksham", name: "Saksham Strikers", short: "SST", logo: saksham, accent: "#c9a24a" },
  { id: "palakraj", name: "Palakraj XI", short: "PXI", logo: palakraj, accent: "#f5b400" },
  { id: "savi", name: "Savi Super Kings", short: "SSK", logo: savi, accent: "#ffcc00" },
  { id: "sangam", name: "Sangam Fire Warriors", short: "SFW", logo: sangam, accent: "#ff5b1f" },
];

export const STARTING_PURSE = 100000;
export const BASE_PRICE = 1000;
export const BID_INCREMENT = 1000;
