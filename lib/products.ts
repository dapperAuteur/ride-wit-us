export interface SiblingProduct {
  name: string;
  href: string;
}

// Canonical WitUS sibling list — mirror of gemini/witus/lib/products.ts. ride and
// stories are intentionally absent (those apps show this footer but aren't listed
// in any other app's footer). RideWitUS omits itself.
export const SIBLING_PRODUCTS: SiblingProduct[] = [
  { name: "WitUS.online", href: "https://witus.online" },
  { name: "CentenarianOS", href: "https://centenarianos.com" },
  { name: "Work.WitUS", href: "https://work.witus.online" },
  { name: "Tour Manager OS", href: "https://tour.witus.online" },
  { name: "Wanderlust", href: "https://wanderlust.witus.online" },
  { name: "Fly.WitUS", href: "https://fly.witus.online" },
  { name: "FlashLearnAI", href: "https://flashlearnai.witus.online" },
  { name: "Learn.WitUS", href: "https://learn.witus.online" },
  { name: "Stream.WitUS", href: "https://stream.witus.online" },
  { name: "Centenarian Coach", href: "https://centenarian.coach.multiagent.witus.online" },
  { name: "Shop.WitUS", href: "https://shop.witus.online" },
  { name: "AwesomeWebStore", href: "https://awesomewebstore.com" },
  { name: "WitUS Inbox", href: "https://inbox.witus.online" },
  { name: "WitUS Outbox", href: "https://outbox.witus.online" },
  { name: "Triage.Agent.WitUS", href: "https://triage.agent.witus.online" },
  { name: "Wanderlearn Field Reporter", href: "https://wanderlearn.field.reporter.witus.online" },
];
