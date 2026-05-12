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

export const STARTING_PURSE = 10000000;
export const BASE_PRICE = 1000;
export const BID_INCREMENT = 1000;

// Grade configuration
export const GRADE_SETTINGS_KEY = "udaan-khelotsav-grade-settings";

export interface GradeSettings {
  grades: {
    [key: string]: {
      basePrice: number;
      bidIncrement: number;
      order: number;
    };
  };
}

export const DEFAULT_GRADE_SETTINGS: GradeSettings = {
  grades: {
    A: { basePrice: 1000000, bidIncrement: 500000, order: 1 },  // 10 Lakhs, 5 Lakhs increment
    B: { basePrice: 400000, bidIncrement: 200000, order: 2 },     // 4 Lakhs, 2 Lakhs increment
    C: { basePrice: 100000, bidIncrement: 100000, order: 3 },     // 1 Lakh, 1 Lakh increment
  },
};

// Get grade settings from localStorage or return defaults
export function getGradeSettings(): GradeSettings {
  if (typeof window === 'undefined') return DEFAULT_GRADE_SETTINGS;
  try {
    const stored = localStorage.getItem(GRADE_SETTINGS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {}
  return DEFAULT_GRADE_SETTINGS;
}

// Save grade settings to localStorage
export function saveGradeSettings(settings: GradeSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(GRADE_SETTINGS_KEY, JSON.stringify(settings));
  } catch {}
}

// Get base price for a grade
export function getBasePriceForGrade(grade: string | undefined): number {
  const settings = getGradeSettings();
  if (!grade || !settings.grades[grade]) {
    return BASE_PRICE; // Fallback to default
  }
  return settings.grades[grade].basePrice;
}

// Get bid increment for a grade
export function getBidIncrementForGrade(grade: string | undefined): number {
  const settings = getGradeSettings();
  if (!grade || !settings.grades[grade]) {
    return BID_INCREMENT; // Fallback to default
  }
  return settings.grades[grade].bidIncrement;
}

// Get grade order for sorting (A first, then B, then C)
export function getGradeOrder(grade: string | undefined): number {
  const settings = getGradeSettings();
  if (!grade || !settings.grades[grade]) {
    return 999; // Put unknown grades last
  }
  return settings.grades[grade].order;
}
