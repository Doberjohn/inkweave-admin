export interface AdminTool {
  id: 'reveal' | 'image' | 'tuning' | 'analytics' | 'banner';
  name: string;
  purpose: string;
  /** Where the tool runs until P2 ports it here; null when it only runs locally today. */
  currentUrl: string | null;
}

export const ADMIN_TOOLS: readonly AdminTool[] = [
  {
    id: 'reveal',
    name: 'Reveal publisher',
    purpose: 'Add a newly revealed card to the preview set.',
    currentUrl: 'https://inkweave.ink/admin/reveal',
  },
  {
    id: 'image',
    name: 'Card images',
    purpose: "Replace an existing card's image.",
    currentUrl: 'https://inkweave.ink/admin/image',
  },
  {
    id: 'tuning',
    name: 'Engine tuning',
    purpose: 'Edit playstyle copy and the Shift and Ramp scores.',
    currentUrl: 'https://inkweave.ink/admin/tuning',
  },
  {
    id: 'analytics',
    name: 'Analytics',
    purpose: 'Vote calibration, activity and web analytics.',
    currentUrl: 'https://inkweave.ink/admin/analytics',
  },
  {
    id: 'banner',
    name: 'Banner generator',
    purpose: 'Render Synergy Spotlight banners. Runs locally with pnpm banner in the app repo for now.',
    currentUrl: null,
  },
];
