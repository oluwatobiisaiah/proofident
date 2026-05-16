/**
 * useJobMatches.ts
 *
 * Data layer for job matches — powered by React Query.
 * Fetches from ${NEXT_PUBLIC_API_URL}/me/jobs and transforms the server
 * response into the UI-ready Job shape.
 */

import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { Job, ServerMatch, ServerMatchesResponse } from "@/components/jobs/types";

// ─── Display-only lookup tables (filled in on the client) ─────────────────────
// The server doesn't send these fields; we derive them from the job category.

const CATEGORY_META: Record<
  string,
  {
    color: string;
    bg: string;
    arrangement: string;
    arrangementIcon: string;
    description: string;
    skills: string[];
    equipment: string[];
  }
> = {
  sales: {
    color: "#0F6E56",
    bg: "#E1F5EE",
    arrangement: "Field-based",
    arrangementIcon: "ti-walk",
    description:
      "Promote and sell products directly to customers in your assigned territory. You'll manage your own schedule, hit weekly targets, and build lasting relationships with repeat buyers.",
    skills: ["Customer engagement", "Negotiation", "Territory management", "Basic smartphone use"],
    equipment: ["Android smartphone (4G)", "Branded T-shirt (provided)", "Sales kit (provided)"],
  },
  delivery: {
    color: "#534AB7",
    bg: "#EEEDFE",
    arrangement: "On-the-road",
    arrangementIcon: "ti-bike",
    description:
      "Pick up packages from hubs and deliver them safely to customers within your zone. Punctuality and friendly service are key to earning tips and high ratings.",
    skills: ["Route navigation", "Time management", "Customer communication", "Package handling"],
    equipment: ["Motorcycle or bicycle", "Smartphone with data", "Delivery bag (provided)"],
  },
  logistics: {
    color: "#534AB7",
    bg: "#EEEDFE",
    arrangement: "On-the-road",
    arrangementIcon: "ti-truck",
    description:
      "Transport goods between warehouses, retailers, and end customers. You'll coordinate pickups and drop-offs while keeping accurate delivery records.",
    skills: ["Route planning", "Vehicle maintenance basics", "Inventory tracking", "Communication"],
    equipment: ["Licensed vehicle", "Smartphone", "Loading equipment (site-provided)"],
  },
  beauty: {
    color: "#BA7517",
    bg: "#FAEEDA",
    arrangement: "Mobile / Home-based",
    arrangementIcon: "ti-home",
    description:
      "Provide professional beauty services at clients' homes or in a small studio. Build your clientele through referrals and social media to grow a steady income.",
    skills: ["Hair styling", "Skin care", "Customer service", "Social media marketing"],
    equipment: ["Professional kit (hair/skin tools)", "Smartphone for bookings", "Transport to clients"],
  },
  food: {
    color: "#BA7517",
    bg: "#FAEEDA",
    arrangement: "Home-based",
    arrangementIcon: "ti-home",
    description:
      "Prepare and sell home-cooked meals or snacks through online orders and local delivery. Leverage your cooking skills to serve busy professionals and families.",
    skills: ["Cooking & food prep", "Hygiene standards", "Order management", "Basic marketing"],
    equipment: ["Kitchen equipment", "Food-grade packaging", "Smartphone for orders"],
  },
  tech: {
    color: "#1D9E75",
    bg: "#E1F5EE",
    arrangement: "Remote",
    arrangementIcon: "ti-laptop",
    description:
      "Provide freelance tech support, repairs, or digital services to individuals and small businesses. Work from home or visit clients depending on the task.",
    skills: ["Device troubleshooting", "Software installation", "Customer communication", "Problem-solving"],
    equipment: ["Laptop or desktop PC", "Reliable internet connection", "Diagnostic tools"],
  },
  cleaning: {
    color: "#5E7A8A",
    bg: "#E6EFF3",
    arrangement: "Field-based",
    arrangementIcon: "ti-brush",
    description:
      "Offer professional cleaning services to homes and offices in your area. Build repeat clients and referrals to grow a stable cleaning business.",
    skills: ["Cleaning techniques", "Time management", "Equipment handling", "Customer relations"],
    equipment: ["Cleaning supplies & chemicals", "Mop, broom, vacuum", "Protective gloves & apron"],
  },
  default: {
    color: "#888780",
    bg: "#F1EFE8",
    arrangement: "Flexible",
    arrangementIcon: "ti-clock",
    description:
      "A flexible income opportunity matched to your profile. Details are provided by the employer after you express interest.",
    skills: ["Communication", "Time management", "Reliability"],
    equipment: ["Smartphone", "Valid ID"],
  },
};

function getCategoryMeta(category: string) {
  return CATEGORY_META[category.toLowerCase()] ?? CATEGORY_META.default;
}

/** Convert kobo → naira */
const toNaira = (kobo: number) => Math.round(kobo / 100);

/** Sum all startup cost values (kobo) and convert to naira */
const totalStartupNaira = (costs: Record<string, number>) =>
  toNaira(Object.values(costs).reduce((a, b) => a + b, 0));

/** "Jumia Partner Promotions" → "JP" */
function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/** "Lagos · Ikeja, Surulere" */
function formatLocation(state: string, areas: string[]): string {
  if (!areas.length) return state;
  return `${state} · ${areas.join(", ")}`;
}

// ─── Transform server → UI shape ──────────────────────────────────────────────

export function transformMatch(m: ServerMatch): Job {
  const meta = getCategoryMeta(m.job.category);
  const startupCost = totalStartupNaira(m.job.startupCosts);

  return {
    id: m.job.id,
    matchId: m.id,

    category: m.job.category.charAt(0).toUpperCase() + m.job.category.slice(1),
    title: m.job.title,
    employer: m.job.employer,
    employerInitials: getInitials(m.job.employer),
    employerColor: meta.color,
    employerBg: meta.bg,

    matchScore: Math.round(parseFloat(m.matchScore) * 100),
    whyMatch: m.explanation,
    skillBreakdown: m.skillBreakdown,

    location: formatLocation(m.job.locationState, m.job.locationAreas),
    locationState: m.job.locationState,
    locationAreas: m.job.locationAreas,

    arrangement: meta.arrangement,
    arrangementIcon: meta.arrangementIcon,

    compensationMin: toNaira(m.job.minimumIncome),
    compensationMax: toNaira(m.job.maximumIncome),

    startupCost,
    loanAvailable: startupCost > 0,

    description: meta.description,
    skills: meta.skills,
    equipment: meta.equipment,
  };
}

// ─── Fetch function ────────────────────────────────────────────────────────────

/**
 * Fetches job matches for the authenticated user.
 *
 * Swap `token` for however you surface the session in your app
 * (e.g. next-auth's getSession, a zustand store, cookies, etc.).
 */
export async function fetchJobMatches(token: string): Promise<Job[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/me/jobs`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    // React Query catches this and surfaces it as `error`
    throw new Error(`Failed to fetch job matches: ${res.status} ${res.statusText}`);
  }

  const data: ServerMatchesResponse = await res.json();
  return data.matches.map(transformMatch);
}

// ─── React Query hook ─────────────────────────────────────────────────────────

export const JOB_MATCHES_QUERY_KEY = ["jobMatches"] as const;

/**
 * useJobMatches
 *
 * Fetches and caches job matches for the current user.
 *
 * @param token  JWT / access token for the authenticated user.
 *               Pass `undefined` or an empty string to suspend the query
 *               while the session is still loading.
 *
 * Usage:
 *   const { data, isLoading, error } = useJobMatches(token);
 *
 * Requirements:
 *   Wrap your app (or relevant subtree) in <QueryClientProvider> once — see
 *   the setup note in the previous refactor comment for details.
 */
export function useJobMatches(token: string | undefined): UseQueryResult<Job[], Error> {
  return useQuery<Job[], Error>({
    queryKey: [...JOB_MATCHES_QUERY_KEY, token],
    queryFn: () => fetchJobMatches(token!),
    enabled: Boolean(token),   // don't fire until we have a token
    staleTime: 5 * 60 * 1000, // treat data as fresh for 5 min
  });
}
