import type { ApronLevel, SeasonMeta } from "@/types/episode";

export const APRON_COLORS: Record<ApronLevel, string> = {
  green: "#4F7C2A",
  red: "#A8302A",
  purple: "#5E3A8C",
  black: "#1A1A1A",
  engineering: "#2D5C8F",
  community: "#D4892F",
};

export const APRON_LABELS: Record<ApronLevel, string> = {
  green: "Green Apron",
  red: "Red Apron",
  purple: "Purple Apron",
  black: "Black Apron",
  engineering: "Engineering",
  community: "Community",
};

export const SEASONS: SeasonMeta[] = [
  {
    number: 1,
    title: "Apron Foundations",
    tagline: "Green + Red — foundations on a single-speed cruiser.",
    apronLevels: ["green", "red"],
    description:
      "Maps to FreeWheelin's Green and Red Apron entry curriculum. Every demo is on a single-speed cruiser — the simplest bike at the donation bay, no derailleur, no shift cable, no cassette to fight. Flats, brakes, drivetrain basics, true wheels, bearings, fit.",
  },
  {
    number: 2,
    title: "Apron Advanced",
    tagline: "Purple + Black — bikes with gears.",
    apronLevels: ["purple", "black"],
    description:
      "Now with gears. Wheel building, bottom brackets, freewheels and cassettes, derailleur tuning, the internal-hub bikes you'll meet at the shop (Sturmey-Archer, Shimano Nexus), frame alignment, restoration triage. The transition from single-speed to multi-gear is the through-line.",
  },
  {
    number: 3,
    title: "Bike Design & Folding-Bike Engineering",
    tagline: "Meet the Brompton — the why behind the wrench.",
    apronLevels: ["engineering"],
    description:
      "After two seasons on a cruiser, the Brompton enters as the engineering object lesson. Frame geometry, the hinge, 16-inch wheels, materials, manufacturing, the fold, and what folders mean for urban transport.",
  },
  {
    number: 4,
    title: "Program Operations & Community",
    tagline: "Running the shop, the rides, the apprentices, the grants.",
    apronLevels: ["community"],
    description:
      "The roles around the Program Instructor seat — pedagogy, Bike Lab, community rides, YEET apprenticeship, donation days, partnerships, data, grants. The full FreeWheelin program lens.",
  },
];

export function seasonOf(n: number): SeasonMeta {
  const found = SEASONS.find((s) => s.number === n);
  if (!found) throw new Error(`Unknown season ${n}`);
  return found;
}
