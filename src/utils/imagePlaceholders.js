/**
 * EventSphere Image & Category Placeholder Utilities
 * Provides beautiful, accessible, category-based poster fallbacks,
 * venue placeholders ("Photo not available"), and curated templates.
 */

// Category curated presets for organizers when creating an event
export const EVENT_POSTER_PRESETS = [
  {
    category: 'Hackathon',
    title: 'Hackathon & Dev Conclave',
    url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80',
    tags: ['Coding', 'Hackathon', 'Innovation'],
  },
  {
    category: 'Standup Comedy',
    title: 'Comedy & Open Mic Night',
    url: 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?auto=format&fit=crop&w=1200&q=80',
    tags: ['Comedy', 'Live Show', 'Entertainment'],
  },
  {
    category: 'Seminar',
    title: 'Keynote Tech Symposium',
    url: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1200&q=80',
    tags: ['Seminar', 'Keynote', 'Academic'],
  },
  {
    category: 'Cultural Show',
    title: 'Campus Cultural Fiesta',
    url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80',
    tags: ['Music', 'Festival', 'Campus Life'],
  },
  {
    category: 'Other',
    title: 'Workshop & Networking Meetup',
    url: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=1200&q=80',
    tags: ['Workshop', 'Networking', 'Community'],
  },
];

// Curated venue photo presets for organizers and admins
export const VENUE_PHOTO_PRESETS = [
  {
    name: 'Auditorium Tiered Theater',
    url: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=1200&q=80',
    category: 'Auditorium',
  },
  {
    name: 'Conference Presentation Hall',
    url: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1200&q=80',
    category: 'Conference Hall',
  },
  {
    name: 'Outdoor Festival Arena',
    url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80',
    category: 'Outdoor Space',
  },
  {
    name: 'Executive Seminar Amphitheater',
    url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80',
    category: 'Seminar Hall',
  },
  {
    name: 'Modern Smart Classroom',
    url: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1200&q=80',
    category: 'Other',
  },
];

// Color and icon styles for categories
export const CATEGORY_THEMES = {
  Hackathon: {
    gradient: 'from-cyan-950 via-indigo-950 to-slate-950',
    badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    accentText: 'text-cyan-400',
    accentBg: 'bg-cyan-500',
    border: 'border-cyan-500/30',
    tag: '⚡ Code Sprint',
    symbol: '💻',
  },
  'Standup Comedy': {
    gradient: 'from-amber-950 via-rose-950 to-slate-950',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    accentText: 'text-amber-400',
    accentBg: 'bg-amber-500',
    border: 'border-amber-500/30',
    tag: '🎤 Standup Show',
    symbol: '🎭',
  },
  Seminar: {
    gradient: 'from-blue-950 via-indigo-950 to-slate-950',
    badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    accentText: 'text-blue-400',
    accentBg: 'bg-blue-500',
    border: 'border-blue-500/30',
    tag: '🎓 Keynote Lecture',
    symbol: '🎙️',
  },
  'Cultural Show': {
    gradient: 'from-purple-950 via-fuchsia-950 to-slate-950',
    badgeBg: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40',
    accentText: 'text-fuchsia-400',
    accentBg: 'bg-fuchsia-500',
    border: 'border-fuchsia-500/30',
    tag: '✨ Cultural Fest',
    symbol: '🎪',
  },
  Other: {
    gradient: 'from-slate-950 via-indigo-950 to-zinc-950',
    badgeBg: 'bg-slate-700/40 text-slate-200 border-slate-600',
    accentText: 'text-indigo-400',
    accentBg: 'bg-indigo-600',
    border: 'border-slate-700',
    tag: '📅 Campus Event',
    symbol: '🌟',
  },
};

/**
 * Returns a fallback poster image URL or category graphic
 */
export function getEventPoster(event) {
  if (event?.posterImage && event.posterImage.trim()) {
    return event.posterImage;
  }

  // Pre-mapped category presets
  const preset = EVENT_POSTER_PRESETS.find((p) => p.category === event?.category);
  if (preset) {
    return preset.url;
  }

  return EVENT_POSTER_PRESETS[0].url;
}

/**
 * Returns a fallback cover image for a venue or null if placeholder mode is desired
 */
export function getVenueCover(venue) {
  if (venue?.coverImage && venue.coverImage.trim()) {
    return venue.coverImage;
  }
  if (venue?.images && venue.images.length > 0) {
    const cover = venue.images.find((i) => i.isCover) || venue.images[0];
    if (cover?.url) return cover.url;
  }

  // Return mapped campus preset if matching known campus venues
  const name = venue?.venue_name || '';
  if (name.includes('Shanti')) return VENUE_PHOTO_PRESETS[0].url;
  if (name.includes('Ashok')) return VENUE_PHOTO_PRESETS[1].url;
  if (name.includes('Ground')) return VENUE_PHOTO_PRESETS[2].url;
  if (name.includes('Seminar')) return VENUE_PHOTO_PRESETS[3].url;
  if (name.includes('Classroom')) return VENUE_PHOTO_PRESETS[4].url;

  return null;
}
