// Single source of truth for "Next ride" + "Open shop" callouts.
// Imported by /design/monon-chalk/page.tsx + /design/monon-chalk/tune-in/page.tsx
// so the landing and tune-in stay in sync.

export interface CommunityEvent {
  kind: "ride" | "shop";
  eyebrow: string;
  title: string;
  body: string;
  color: string;
}

export const COMMUNITY_EVENTS: CommunityEvent[] = [
  {
    kind: "ride",
    eyebrow: "Next ride",
    title: "Saturday · 9am · Monon Trail",
    body: "Sweep riders confirmed. Family pace, ~12 miles, coffee at the turn.",
    color: "#3E7C3A",
  },
  {
    kind: "shop",
    eyebrow: "Open shop",
    title: "Wednesday · 6pm · 38th Street",
    body: "Walk in mid-repair. Volunteers on the floor. Apprentices on the bench.",
    color: "#5C8AA5",
  },
];
