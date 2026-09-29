export interface AdminTool {
  id: 'reveal' | 'image' | 'tuning' | 'analytics' | 'banner';
  name: string;
  purpose: string;
  /** The tool's route in admin (docs/PLAN.md, D10). */
  path: string;
}

export const ADMIN_TOOLS: readonly AdminTool[] = [
  {
    id: 'reveal',
    name: 'Reveal publisher',
    purpose: 'Add a newly revealed card to the preview set.',
    path: '/reveal',
  },
  {
    id: 'image',
    name: 'Card images',
    purpose: "Replace an existing card's image.",
    path: '/image',
  },
  {
    id: 'tuning',
    name: 'Engine tuning',
    purpose: 'Edit playstyle copy and the Shift and Ramp scores.',
    path: '/tuning',
  },
  {
    id: 'analytics',
    name: 'Analytics',
    purpose: 'Vote calibration, activity and web analytics.',
    path: '/analytics',
  },
  {
    id: 'banner',
    name: 'Banner generator',
    purpose: 'Render a Synergy Spotlight banner at /banner/<cardId>; pnpm banner <cardId> exports it.',
    // Pocahontas - Guiding the Tribe, the card the banner was designed around.
    path: '/banner/2983',
  },
];
