export type Service = {
  slug: string;
  name: string;
  short: string;
  description: string;
  bullets: string[];
};

export const SERVICES: Service[] = [
  {
    slug: "spring-cleanup",
    name: "Spring Cleanup",
    short: "Yard cleanup, edging, first mow prep, debris hauling.",
    description:
      "Get your property dialed in for the season. We remove winter debris, edge beds/walkways, and leave your yard looking sharp.",
    bullets: ["Leaf & debris removal", "Bed edging", "Branch pickup", "Haul-away available"],
  },
  {
    slug: "lawn-mowing",
    name: "Lawn Mowing",
    short: "Weekly or biweekly cuts with clean lines and consistent results.",
    description:
      "Reliable mowing with trimming and cleanup. Perfect for homeowners who want consistent curb appeal all season.",
    bullets: ["Weekly / biweekly", "Trim & blow-off", "Clean striping", "Consistent scheduling"],
  },
  {
    slug: "mulching",
    name: "Mulching",
    short: "Fresh mulch installs with bed cleanup and crisp edging.",
    description:
      "Mulch makes your property pop. We prep beds properly so it looks great and stays clean longer.",
    bullets: ["Bed cleanup", "Edging", "Mulch install", "Optional weed barrier (case-by-case)"],
  },
  {
    slug: "hedge-trimming",
    name: "Hedge Trimming",
    short: "Shrubs and hedges trimmed clean and even.",
    description:
      "Shape up shrubs and hedges for a neat, maintained look without scalping or over-trimming.",
    bullets: ["Shrub shaping", "Hedge line trimming", "Cleanup included", "Seasonal scheduling"],
  },
  {
    slug: "fall-cleanup",
    name: "Fall Cleanup",
    short: "Leaf cleanup and yard prep before winter.",
    description:
      "Leaves, debris, final cuts, and prep so your yard comes out strong next spring.",
    bullets: ["Leaf removal", "Final mow", "Debris cleanup", "Haul-away available"],
  },
];
