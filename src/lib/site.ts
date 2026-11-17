// Single source of truth for site-wide settings.

export const SITE = {
  name: 'Top-Notch Gaming',
  shortName: 'TNG',
  url: 'https://gaming.top-notchnetwork.com',
  ogDefault: '/og-default.jpg',
  parentName: 'Top-Notch Network',
  parentUrl: 'https://top-notchnetwork.com',
};

/**
 * Discord invite link. Leave empty until Seth supplies the real invite;
 * every Discord button on the site reads from here and shows a
 * "coming soon" placeholder while it is empty.
 * Example: 'https://discord.gg/XXXXXXX'
 */
export const DISCORD_INVITE_URL = '';

export const NAV = [
  { label: 'About', href: '/about/' },
  { label: 'Streaming', href: '/streaming/' },
  { label: 'Community', href: '/community/' },
];

export const NETWORKS = [
  { label: 'Top-Notch Network', href: 'https://top-notchnetwork.com' },
  { label: 'NetHead', href: 'https://nethead.top-notchnetwork.com' },
];
