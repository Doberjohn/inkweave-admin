export interface AdminTool {
  id: 'reveal' | 'image' | 'tuning' | 'analytics';
  name: string;
  purpose: string;
  /** The tool's route in admin (docs/PLAN.md, D10). */
  path: string;
}

/**
 * Whether `pathname` is one of the tool's pages. A tool owns every route under
 * the first segment of its path.
 */
export function isToolRoute(tool: AdminTool, pathname: string): boolean {
  const section = `/${tool.path.split('/')[1]}`;
  return pathname === section || pathname.startsWith(`${section}/`);
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
];
