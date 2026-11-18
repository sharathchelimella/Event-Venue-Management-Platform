/**
 * EventSphere AI Event Planning & Suggestion Engine
 * Hybrid Architecture:
 * - Uses Google GenAI (Gemini) if GEMINI_API_KEY / GOOGLE_API_KEY is configured.
 * - Gracefully falls back to high-fidelity, deterministic campus planning rules.
 * - Always grounds recommendations in REAL campus venues from MongoDB (never hallucinates venues or dates).
 */

import { GoogleGenAI } from '@google/genai';

const CATEGORY_TEMPLATES = {
  Hackathons: {
    ideas: [
      {
        title: 'Campus CodeSprint & AI Innovators 36H Hackathon',
        theme: 'Building AI for Social Good & Campus Sustainability',
        description: 'An intensive round-the-clock software hackathon challenging student developer squads to build working prototypes in 36 hours across FinTech, HealthTech, and Campus Automation.',
        activities: [
          'Opening Keynote & Problem Statement Reveal',
          'Midnight Mentorship Sprint with Industry Devs',
          'Power-Pitching & Live Working Demos',
          'Grand Finale Awards & Sponsor Recruiter Meet',
        ],
        engagementTips: [
          'Distribute custom sticker badges for milestone commits',
          'Organize lightning push-up/trivia breaks at 3:00 AM to keep energy soaring',
          'Set up a live project showcase gallery with QR-based audience voting',
        ],
      },
      {
        title: 'ZeroToShip: Rapid Web3 & GenAI Buildathon',
        theme: 'Decentralized Intelligence & Autonomous Agents',
        description: 'A fast-paced builder showdown where collegiate developers assemble full-stack AI-agent workflows or Web3 protocols within 24 hours.',
        activities: [
          'API Bootcamp & Sponsor Tech Workshops',
          'Code Freeze & Security Vulnerability Audit',
          'Speed-Dating Demo Tables for Judges',
        ],
        engagementTips: [
          'Create a dedicated Discord/Telegram channel with real-time leaderboard bots',
          'Provide healthy midnight energy bowls and coffee baristas',
        ],
      },
    ],
    defaultEquip: [
      'High-Speed Dedicated 1Gbps Wi-Fi SSIDs & Ethernet Drops',
      'Heavy-duty Surge Protector Extension Boards (1 per table)',
      'Dual HD Projectors & Screens for Live Leaderboard',
      'Stage Mic & PA System for Announcements',
      'Beanbags & Designated Rest/Chill Zone Seating',
      'Emergency First-Aid & Energy Bar Station',
    ],
    budgetShares: [
      { category: 'Prizes & Cash Awards', pct: 0.35, notes: '1st, 2nd, 3rd place prizes & track bounties' },
      { category: 'Meals, Midnight Snacks & Coffee', pct: 0.30, notes: 'Catering for 4 meals + round-the-clock coffee' },
      { category: 'Participant Kits & Swag T-shirts', pct: 0.15, notes: 'Branded T-shirts, stickers, and lanyards' },
      { category: 'AV & Networking Infrastructure', pct: 0.12, notes: 'High-speed switches, extension boards, screens' },
      { category: 'Promotional Branding & Marketing', pct: 0.08, notes: 'Standees, banner printing, and social ads' },
    ],
    scheduleHours: [
      { time: '09:00 AM - 10:30 AM', title: 'Check-in, Breakfast & Team Formation' },
      { time: '10:30 AM - 11:30 AM', title: 'Opening Ceremony & Problem Statement Launch' },
      { time: '12:00 PM - 02:00 PM', title: 'Sprint Block 1: Architecture & Prototyping' },
      { time: '02:00 PM - 03:00 PM', title: 'Networking Lunch' },
      { time: '03:00 PM - 06:00 PM', title: 'Sprint Block 2 & Mentorship Checkpoint 1' },
      { time: '06:00 PM - 08:00 PM', title: 'Dinner & Lightning Tech Talk' },
      { time: '08:00 PM - 11:59 PM', title: 'Midnight Coding Marathon & Surprise Trivia' },
      { time: '09:00 AM - 11:00 AM', title: 'Final Code Freeze & Submission' },
      { time: '11:30 AM - 01:30 PM', title: 'Judge Demos & Audience Showcase' },
      { time: '02:30 PM - 03:30 PM', title: 'Valedictory & Prize Distribution' },
    ],
  },
  'Technical workshops': {
    ideas: [
      {
        title: 'Masterclass: Production Microservices & Cloud-Native Architectures',
        theme: 'Zero to Production Deployment with Docker & Kubernetes',
        description: 'Hands-on architectural masterclass guiding students through containerizing enterprise services, zero-downtime rollouts, and telemetry monitoring.',
        activities: [
          'Live interactive coding session on student laptops',
          'Real-time load stress-testing demonstration',
          'Take-home capstone project review',
        ],
        engagementTips: [
          'Pre-provision cloud sandbox environments to avoid local installation bottlenecks',
          'Pair participants for collaborative peer-debugging sprints',
        ],
      },
      {
        title: 'Full-Stack GenAI: Engineering LLM Agents & RAG Pipelines',
        theme: 'Modern AI Orchestration for Student Builders',
        description: 'A deep-dive workshop covering prompt chaining, vector embeddings, and LangChain/Gemini API integration for practical campus applications.',
        activities: [
          'Live API key setup & token management tips',
          'Building a campus syllabus query bot from scratch',
          'Deploying to live Vercel/Node edge runtimes',
        ],
        engagementTips: [
          'Host a mini 20-minute hack sprint at the end with instant swag awards',
        ],
      },
    ],
    defaultEquip: [
      'Reliable High-Speed Wi-Fi with pre-tested port allowances',
      'Dual HD Projectors (one for instructor code, one for architecture slides)',
      'Wireless Handheld & Collar Microphones',
      'Whiteboard & Dry-Erase Markers for architectural diagrams',
      'Participant Multi-Plug Power Outlets',
    ],
    budgetShares: [
      { category: 'Guest Instructor Honorarium & Travel', pct: 0.35, notes: 'Expert speaker stipend' },
      { category: 'Cloud Credits & Participant Sandboxes', pct: 0.20, notes: 'API tokens and compute instances' },
      { category: 'Refreshments & High Tea', pct: 0.25, notes: 'Tea, coffee, cookies & light snacks' },
      { category: 'Certificates & Swag Notebooks', pct: 0.12, notes: 'Course completion credentials & stationery' },
      { category: 'Stage & Projection Facilities', pct: 0.08, notes: 'Classroom/hall AV technician support' },
    ],
    scheduleHours: [
      { time: '09:30 AM - 10:00 AM', title: 'Participant Registration & Environment Setup' },
      { time: '10:00 AM - 11:30 AM', title: 'Part 1: Conceptual Foundations & Live Demo' },
      { time: '11:30 AM - 11:45 AM', title: 'Coffee & Refreshment Break' },
      { time: '11:45 AM - 01:15 PM', title: 'Part 2: Guided Hands-on Code-Along' },
      { time: '01:15 PM - 02:15 PM', title: 'Lunch & Peer Discussions' },
      { time: '02:15 PM - 03:45 PM', title: 'Part 3: Building Capstone Challenge Project' },
      { time: '03:45 PM - 04:30 PM', title: 'Q&A, Project Showcase & Certificate Handout' },
    ],
  },
  'Cultural festivals': {
    ideas: [
      {
        title: 'Vibrance Campus Cultural Odyssey',
        theme: 'Celebration of Rhythms, Heritage & Modern Expression',
        description: 'A multi-stage extravaganza featuring student dance battles, rock band battles, street plays (Nukkad Natak), and runway fashion showcases.',
        activities: [
          'Inter-College Acoustic & Fusion Band Wars',
          'Solo & Group Classical / Hip-Hop Dance Finals',
          'Theatrical Street Play on Contemporary Social Themes',
          'Star Night Musical Concert by Renowned Artist',
        ],
        engagementTips: [
          'Set up illuminated photo booths with custom event hashtags for viral social sharing',
          'Distribute glowing wristbands that pulse to the beat of the main stage',
        ],
      },
    ],
    defaultEquip: [
      'Concert-Grade Line-Array Sound System & Stage Monitors',
      'Intelligent Moving Stage Lights, Strobes & Smoke Machines',
      'Large LED Video Backdrop (P3/P4 pitch)',
      'Green Room VIP Amenities & Security Barricading',
      'High-Power Back-up Diesel Generators (DG Set)',
      'Fire Extinguishers & Campus Security Team Coordination',
    ],
    budgetShares: [
      { category: 'Sound, Stage, LED Backdrop & Lighting', pct: 0.38, notes: 'Production truss, sound engineering & lighting rig' },
      { category: 'Celebrity Artist / Band Performance Fee', pct: 0.30, notes: 'Headline artist fee & hospitality' },
      { category: 'Prizes, Trophies & Winner Hampers', pct: 0.12, notes: 'Cash prizes and mementos for winners' },
      { category: 'Stage Decor, Banners & Wristbands', pct: 0.10, notes: 'Entrance arches, standees, wristbands' },
      { category: 'Hospitality, Catering & Green Room Snacks', pct: 0.10, notes: 'Food packets for participants and crew' },
    ],
    scheduleHours: [
      { time: '10:00 AM - 12:00 PM', title: 'Inaugural Lamp Lighting & Classical Dance Solo' },
      { time: '12:00 PM - 02:00 PM', title: 'Street Play & Inter-Collegiate Theatrics' },
      { time: '02:00 PM - 04:00 PM', title: 'Battle of the Bands (Prelims & Finals)' },
      { time: '04:00 PM - 06:00 PM', title: 'Western & Folk Group Dance Showdown' },
      { time: '06:30 PM - 09:30 PM', title: 'Grand Musical Star Night Concert' },
      { time: '09:30 PM - 10:00 PM', title: 'Award Announcements & Closing Ceremony' },
    ],
  },
  'College fests': {
    ideas: [
      {
        title: 'Nexus Annual Inter-University Mega Fest',
        theme: 'Igniting Intellect, Innovation & Artistry',
        description: 'Flagship multi-day campus extravaganza uniting engineering, management, and arts students for tech competitions, literary debates, gaming tournaments, and evening musical fests.',
        activities: [
          'RoboWars & Drone Obstacle Racing',
          'National Parliamentary Debate Championship',
          'E-Sports Arena (Valorant & BGMI)',
          'Evening Celebrity Concert & DJ Showcase',
        ],
        engagementTips: [
          'Issue an all-access digital wristband QR for smooth entry across sub-events',
          'Offer leaderboard points redeemable at campus food truck stalls',
        ],
      },
    ],
    defaultEquip: [
      'Multi-Zone Public Address (PA) and Concert Audio Systems',
      'Dual Giant Outdoor LED Screens for Live Feeds',
      'Arena Crowd Control Stanchions & Safety Barricades',
      'Registration Helpdesks with QR Scanner Terminals',
      'Dedicated Medical First Aid & Paramedic Tent',
    ],
    budgetShares: [
      { category: 'Main Stage & AV Production Rig', pct: 0.35, notes: 'Truss, line-array speakers, LED walls' },
      { category: 'Artist & Performer Booking', pct: 0.25, notes: 'Celebrity headline act' },
      { category: 'Event Prizes, Medals & Cash Awards', pct: 0.15, notes: 'For 15+ individual and team competitions' },
      { category: 'Food & Volunteer Hospitality', pct: 0.15, notes: 'Volunteer kits, water stations, meals' },
      { category: 'Security, First Aid & Logistics', pct: 0.10, notes: 'Perimeter management, badges, wristbands' },
    ],
    scheduleHours: [
      { time: '09:00 AM - 10:30 AM', title: 'Grand Fest Opening & Flag Unfurling' },
      { time: '10:30 AM - 01:00 PM', title: 'Concurrent Tracks: RoboWars, E-Sports & Debates' },
      { time: '01:00 PM - 02:00 PM', title: 'Food Truck Carnival & Acoustic Lawn Performances' },
      { time: '02:00 PM - 05:00 PM', title: 'Championship Finals & Hackathon Pitches' },
      { time: '06:00 PM - 09:30 PM', title: 'Celebrity Musical Night & Star Performance' },
      { time: '09:30 PM - 10:00 PM', title: 'Overall Champion Trophy Award' },
    ],
  },
  Seminars: {
    ideas: [
      {
        title: 'National Leadership & Innovation Seminar',
        theme: 'Future of Sustainable Tech & Global Governance',
        description: 'An executive intellectual colloquium bringing corporate leaders, policymakers, and university faculty together to debate trends shaping the next decade.',
        activities: [
          'Distinguished Keynote Address by Industry Luminary',
          'Interactive Moderated Panel Debate',
          'Open Floor Audience Q&A with Digital Slido Polls',
        ],
        engagementTips: [
          'Use live anonymous audience polling for real-time word clouds',
          'Provide executive leatherette note pads and pens for delegates',
        ],
      },
    ],
    defaultEquip: [
      'Podium Microphone and 3 Wireless Lapel Mics',
      'Executive Stage Sofas & Coffee Tables for Panelists',
      'High-Definition Laser Projector & Presentation Clicker',
      'Audio Recording & Live Webcast Streaming Setup',
      'Directional Campus Signage & Registration Standees',
    ],
    budgetShares: [
      { category: 'Speaker Honorarium & Travel Logistics', pct: 0.40, notes: 'VIP travel, stay, and commemorative plaques' },
      { category: 'Executive High Tea & Buffet Lunch', pct: 0.30, notes: 'Premium dining for delegates and guests' },
      { category: 'Auditorium AV & Hybrid Stream Setup', pct: 0.15, notes: 'Live streaming engineer and sound setup' },
      { category: 'Delegate Folders & Stationery', pct: 0.10, notes: 'Printed programs, folders, and name tags' },
      { category: 'Branding, Standees & Mementos', pct: 0.05, notes: 'Stage backdrop banners and speaker gifts' },
    ],
    scheduleHours: [
      { time: '10:00 AM - 10:30 AM', title: 'Delegate Registration & Welcome High Tea' },
      { time: '10:30 AM - 11:30 AM', title: 'Inaugural Address & Keynote Speech' },
      { time: '11:30 AM - 01:00 PM', title: 'Panel Discussion: Challenges & Strategic Roadmap' },
      { time: '01:00 PM - 02:00 PM', title: 'Networking Luncheon' },
      { time: '02:00 PM - 03:30 PM', title: 'Audience Interaction, Q&A & Research Papers' },
      { time: '03:30 PM - 04:00 PM', title: 'Concluding Remarks & Vote of Thanks' },
    ],
  },
  Conferences: {
    ideas: [
      {
        title: 'International Campus Research & Tech Conference (ICRTC)',
        theme: 'Next-Gen Computing, Clean Energy & Interdisciplinary Breakthroughs',
        description: 'A peer-reviewed academic and industry symposium featuring paper presentations, poster sessions, keynote tutorials, and corporate sponsor exhibits.',
        activities: [
          'Plenary Keynotes by Global Research Fellows',
          'Parallel Track Paper Presentation Sessions',
          'Interactive Poster Display Walkthrough',
          'Conference Gala Dinner & Best Paper Awards',
        ],
        engagementTips: [
          'Publish proceedings with ISBN/DOI for student academic citations',
          'Schedule structured 3-minute rapid-fire poster elevator pitches',
        ],
      },
    ],
    defaultEquip: [
      'Dual Presentation Displays with HDMI/Type-C Splitters',
      'Session Chair Timer Displays & Bell System',
      'Poster Display Boards & Double-Sided Adhesive Mounts',
      'Soundproof Conference Hall Acoustics with Multi-Mic Hub',
      'Dedicated Media Room for Speaker Slide Loading',
    ],
    budgetShares: [
      { category: 'Keynote Speaker Hospitality & Travel', pct: 0.35, notes: 'Flights, campus guest house, honoraria' },
      { category: 'Conference Dining & Delegate High Tea', pct: 0.30, notes: '2-day lunches, continuous coffee stations' },
      { category: 'Proceedings Publication & Kits', pct: 0.15, notes: 'Hardbound proceedings, certificates, delegate bags' },
      { category: 'Venue AV & Poster Display Infrastructure', pct: 0.12, notes: 'Display stands, projectors, audio tech' },
      { category: 'Stage Decor, Badges & Signage', pct: 0.08, notes: 'Lanyards, acrylic badges, welcome arch' },
    ],
    scheduleHours: [
      { time: '08:30 AM - 09:30 AM', title: 'Author Badge Collection & Slide Upload' },
      { time: '09:30 AM - 11:00 AM', title: 'Inauguration & Presidential Keynote Address' },
      { time: '11:00 AM - 11:30 AM', title: 'Coffee Break & Poster Session A' },
      { time: '11:30 AM - 01:15 PM', title: 'Track 1 & Track 2 Parallel Oral Presentations' },
      { time: '01:15 PM - 02:15 PM', title: 'Conference Networking Lunch' },
      { time: '02:15 PM - 04:00 PM', title: 'Industry Innovation Panel & Poster Session B' },
      { time: '04:00 PM - 05:00 PM', title: 'Best Paper Citations & Valedictory Session' },
    ],
  },
  'Sports events': {
    ideas: [
      {
        title: 'Campus Champions Inter-Department Sports Olympiad',
        theme: 'Endurance, Teamwork & Athletic Excellence',
        description: 'A high-energy campus athletic spectacle featuring track & field sprints, football knockout tourneys, basketball 3x3 showdowns, and tug-of-war.',
        activities: [
          'Olympic Torch Relay & March Past by Student Houses',
          'Football & Basketball League Knockouts',
          'Track Sprints (100m, 400m, 4x100m Relay)',
          'High-Tension Inter-Department Tug-of-War Finale',
        ],
        engagementTips: [
          'Deploy live megaphone commentary team to hype the sidelines',
          'Provide custom house-color cheering pompoms to student spectators',
        ],
      },
    ],
    defaultEquip: [
      'High-Mast Ground Lighting / Floodlights for Evening Games',
      'Wireless Loudspeaker Horns & Field Announcements PA',
      'Professional Digital Stopwatches, Whistles & Line Markers',
      'Emergency First-Aid Medical Bed, Ice Packs & Paramedics',
      'Water Dispensing Coolers & Electrolyte Stations',
      'Winners Victory Podium (1st, 2nd, 3rd) & Trophy Table',
    ],
    budgetShares: [
      { category: 'Championship Trophies, Medals & Shields', pct: 0.30, notes: 'Gold, silver, bronze medals & rotating trophy' },
      { category: 'Hydration, Glucose Drinks & Athlete Meals', pct: 0.25, notes: 'Electrolytes, fruit boxes, water barrels' },
      { category: 'Certified Referees & Umpires Honorarium', pct: 0.20, notes: 'Official federated match referees' },
      { category: 'Sports Gear, Field Marking & Equipment', pct: 0.15, notes: 'Balls, nets, cones, chalk line powder' },
      { category: 'First Aid Paramedics & Ambulance On-Standby', pct: 0.10, notes: 'Campus clinic emergency response team' },
    ],
    scheduleHours: [
      { time: '07:30 AM - 08:30 AM', title: 'Athlete Assembly, March Past & Oath Taking' },
      { time: '08:30 AM - 11:30 AM', title: 'Track Sprints & Preliminary Football Matches' },
      { time: '11:30 AM - 01:00 PM', title: 'Hydration Break & Indoor Table Tennis / Chess' },
      { time: '01:00 PM - 02:00 PM', title: 'Sports Nutrition Lunch' },
      { time: '02:00 PM - 04:30 PM', title: 'Semi-Finals & Tug-of-War House Clashes' },
      { time: '04:30 PM - 06:00 PM', title: 'Grand Football Final & 4x100m Relay' },
      { time: '06:00 PM - 06:45 PM', title: 'Medal Ceremony & Overall House Trophy' },
    ],
  },
  'Networking events': {
    ideas: [
      {
        title: 'Campus Founder & Alumni Connect Mixer',
        theme: 'Bridge the Gap: From Campus Projects to Venture Capital',
        description: 'An elegant professional networking soiree connecting ambitious student founders, engineers, and creators with distinguished alumni founders and angel mentors.',
        activities: [
          'Fireside Chat with Prominent Unicorn Founder Alumni',
          'Speed-Networking Rounds (3 minutes per pair)',
          'Open-Mic 60-Second Startup Pitch Elevator',
          'Casual Hors d’oeuvres & Networking Lounge',
        ],
        engagementTips: [
          'Provide color-coded smart badge lanyards (Blue: Founder, Green: Investor, Yellow: Student)',
          'Provide a digital QR contact exchange card for instant LinkedIn connections',
        ],
      },
    ],
    defaultEquip: [
      'Warm Ambient Lounge Lighting & Background Jazz Audio',
      'High-Boy Cocktail Tables & Comfortable Seating Pods',
      'Wireless Lapel Microphones for Fireside Chat',
      'Digital Welcome Kiosk with QR Badging',
      'Branded Photo Wall for LinkedIn Professional Headshots',
    ],
    budgetShares: [
      { category: 'Hors d’oeuvres, Mocktails & Gourmet Catering', pct: 0.45, notes: 'Finger foods, mocktail bar, desserts' },
      { category: 'Lounge Decor, Cocktail Tables & Ambience', pct: 0.25, notes: 'Lighting accents, table linens, floral centerpieces' },
      { category: 'Alumni Mementos & VIP Welcome Gifts', pct: 0.15, notes: 'Custom brass campus souvenirs' },
      { category: 'Badges, Lanyards & Digital Networking App', pct: 0.10, notes: 'QR-enabled networking materials' },
      { category: 'Acoustic Sound & Background Music Tech', pct: 0.05, notes: 'Subtle sound engineering' },
    ],
    scheduleHours: [
      { time: '05:30 PM - 06:15 PM', title: 'Arrival, Badge Collection & Welcome Drinks' },
      { time: '06:15 PM - 07:00 PM', title: 'Fireside Chat: Lessons from Scaling to $100M' },
      { time: '07:00 PM - 07:45 PM', title: 'Structured Speed-Networking Rounds' },
      { time: '07:45 PM - 08:15 PM', title: 'Elevator Pitches: 60-Sec Lightning Stage' },
      { time: '08:15 PM - 09:30 PM', title: 'Dinner, Open Networking & Photo Wall' },
    ],
  },
  Other: {
    ideas: [
      {
        title: 'Campus Innovation Showcase & Interactive Expo',
        theme: 'Showcasing Tomorrow’s Talent Today',
        description: 'A dynamic multi-disciplinary event combining project demonstrations, interactive workshops, and collaborative community brainstorming.',
        activities: [
          'Interactive Demonstration Booths',
          'Community Brainstorming & Idea Wall',
          'Audience Choice Awards & Celebrations',
        ],
        engagementTips: [
          'Hand out stamp cards that unlock exclusive souvenirs after visiting 5 booths',
        ],
      },
    ],
    defaultEquip: [
      'Modular Presentation Tables & Display Panels',
      'Standard PA Sound System & Wireless Mics',
      'HD Projection System & Screen',
      'Power Strips & High-Speed Campus Wi-Fi',
    ],
    budgetShares: [
      { category: 'Venue & Infrastructure Setup', pct: 0.30, notes: 'Tables, chairs, displays' },
      { category: 'Refreshments & Snacks', pct: 0.30, notes: 'Snack boxes and beverages' },
      { category: 'Participant Rewards & Certificates', pct: 0.20, notes: 'Mementos and prizes' },
      { category: 'Promotional Branding & Signage', pct: 0.10, notes: 'Banners and digital graphics' },
      { category: 'Contingency & Miscellaneous', pct: 0.10, notes: 'Buffer fund for last-minute needs' },
    ],
    scheduleHours: [
      { time: '10:00 AM - 10:45 AM', title: 'Welcome & Registration' },
      { time: '10:45 AM - 01:00 PM', title: 'Morning Session & Demonstrations' },
      { time: '01:00 PM - 02:00 PM', title: 'Community Networking Lunch' },
      { time: '02:00 PM - 04:00 PM', title: 'Afternoon Collaborative Sprint' },
      { time: '04:00 PM - 04:45 PM', title: 'Closing Ceremony & Highlights' },
    ],
  },
};

/**
 * Score and evaluate a real campus venue against organizer preferences
 */
export function evaluateVenueSuitability(venue, preferences) {
  const participants = Number(preferences.participants) || 100;
  const preferredDate = (preferences.date || '').trim();
  const indoorOutdoor = (preferences.indoorOutdoor || 'Indoor').toLowerCase();
  const category = (preferences.category || '').toLowerCase();

  let matchScore = 75;
  const reasons = [];

  const maxCap = Number(venue.max_capacity) || 0;
  const bookedDates = Array.isArray(venue.booked_dates) ? venue.booked_dates : [];
  const isAvailable = preferredDate ? !bookedDates.includes(preferredDate) : true;

  // 1. Capacity Analysis
  if (maxCap >= participants) {
    if (maxCap <= participants * 2.2) {
      matchScore += 18;
      reasons.push(`Perfect capacity match (${maxCap} seats comfortably hosts your expected ${participants} participants without overcrowding or feeling empty).`);
    } else {
      matchScore += 10;
      reasons.push(`Spacious venue (${maxCap} capacity) easily accommodates ${participants} attendees with ample breakout space.`);
    }
  } else {
    // Under-capacity
    const deficit = participants - maxCap;
    matchScore -= 25;
    reasons.push(`Capacity deficit: venue max capacity (${maxCap}) is smaller than your expected ${participants} participants (${deficit} overflow).`);
  }

  // 2. Availability on Date
  if (preferredDate) {
    if (isAvailable) {
      matchScore += 10;
      reasons.push(`Currently available on your preferred date (${preferredDate}).`);
    } else {
      matchScore -= 30;
      reasons.push(`⚠️ Already booked on ${preferredDate}. Alternative date required or pick another venue.`);
    }
  }

  // 3. Indoor vs Outdoor Fit
  const venueName = (venue.venue_name || '').toLowerCase();
  const venueCat = (venue.category || '').toLowerCase();
  const isOutdoorVenue = venueName.includes('ground') || venueName.includes('lawn') || venueName.includes('outdoor') || venueCat.includes('outdoor');

  if (indoorOutdoor.includes('outdoor')) {
    if (isOutdoorVenue) {
      matchScore += 8;
      reasons.push('Ideal open-air arena aligned with your outdoor event requirement.');
    } else {
      matchScore -= 10;
      reasons.push('Enclosed indoor hall; check if your outdoor program components can be adapted.');
    }
  } else {
    // Indoor preference
    if (!isOutdoorVenue) {
      matchScore += 8;
      reasons.push('Acoustically treated, weather-protected indoor auditorium/hall.');
    } else {
      matchScore -= 15;
      reasons.push('Open outdoor ground; contradicts your indoor preference.');
    }
  }

  // 4. Category-specific facilities check
  const facilities = Array.isArray(venue.facilities) ? venue.facilities : [];
  const facString = facilities.join(' ').toLowerCase();

  if (category.includes('hack') || category.includes('tech') || category.includes('workshop')) {
    if (facString.includes('wi-fi') || facString.includes('projector') || facString.includes('air conditioning')) {
      matchScore += 5;
      reasons.push('Equipped with essential tech facilities: Wi-Fi, digital projection, and AC.');
    }
  } else if (category.includes('cultur') || category.includes('fest')) {
    if (facString.includes('stage') || facString.includes('sound') || facString.includes('parking')) {
      matchScore += 5;
      reasons.push('Features elevated stage production, theatrical sound, and student parking.');
    }
  } else if (category.includes('sport')) {
    if (isOutdoorVenue || facString.includes('floodlight') || facString.includes('first aid')) {
      matchScore += 5;
      reasons.push('Fitted for athletics with open turf, spectator zones, and high illumination.');
    }
  }

  // Normalize match score between 40 and 99
  const finalScore = Math.max(40, Math.min(99, Math.round(matchScore)));

  return {
    venueId: venue._id ? venue._id.toString() : '',
    venueName: venue.venue_name,
    suitabilityReason: reasons.join(' '),
    matchScore: finalScore,
    capacity: maxCap,
    coverImage: venue.coverImage || (venue.images && venue.images[0]?.url) || '',
    isAvailable,
    facilities,
    location_type: venue.location_type || 'in_campus',
    pricing: venue.pricing || { pricingType: 'Free', price: 0, currency: 'INR' },
  };
}

/**
 * Filter and rank real campus venues from DB based on preferences
 */
export function rankVenuesForEvent(venues, preferences) {
  if (!Array.isArray(venues) || venues.length === 0) return [];

  const evaluated = venues.map((v) => evaluateVenueSuitability(v, preferences));

  // Sort by availability first (available venues prioritized), then match score descending
  evaluated.sort((a, b) => {
    if (a.isAvailable !== b.isAvailable) {
      return a.isAvailable ? -1 : 1;
    }
    return b.matchScore - a.matchScore;
  });

  return evaluated;
}

/**
 * Build dynamic budget breakdown based on requested budget and category
 */
export function buildBudgetBreakdown(category, totalBudget) {
  const template = CATEGORY_TEMPLATES[category] || CATEGORY_TEMPLATES.Other;
  const budget = Number(totalBudget) > 0 ? Number(totalBudget) : 20000;

  let allocatedTotal = 0;
  const items = template.budgetShares.map((share, idx) => {
    const isLast = idx === template.budgetShares.length - 1;
    const amount = isLast ? budget - allocatedTotal : Math.round(budget * share.pct);
    allocatedTotal += amount;
    return {
      category: share.category,
      estimatedAmount: Math.max(0, amount),
      notes: share.notes,
    };
  });

  return items;
}

/**
 * Build promotional copy for social channels
 */
export function buildPromotionalCopy(title, category, date, venueName, targetAudience) {
  const displayDate = date || 'Coming Soon';
  const displayVenue = venueName || 'Campus Venue';
  const displayAudience = targetAudience || 'All Students';

  return {
    socialCaptions: [
      `🚀 EXCITING ANNOUNCEMENT! Join us for ${title}! \n\n📅 Date: ${displayDate}\n📍 Venue: ${displayVenue}\n👥 Target: ${displayAudience}\n\nDon’t miss this incredible experience to learn, build, and connect. Register now on EventSphere! #CampusLife #EventSphere #${category.replace(/\s+/g, '')} #StudentLeadership`,
      `Mark your calendars! 🌟 ${title} is officially happening at ${displayVenue}. Tap the link in our bio to secure your spot before seats run out! 🎟️✨ #CampusEvents #CollegeFest #Innovate`,
      `Professional network update: Thrilled to organize "${title}" on ${displayDate}. A premier forum dedicated to ${category.toLowerCase()} and student empowerment. Looking forward to engaging with our campus community! #HigherEducation #EventManagement #Innovation`,
    ],
    posterContent: `★ ${title.toUpperCase()} ★\nFeaturing High-Impact Keynotes, Competitions & Live Experiences\nDate: ${displayDate} | Venue: ${displayVenue}\nEligibility: ${displayAudience}\nOfficial Partner: EventSphere Platform`,
    promotionalPitch: `Calling all innovators, leaders, and enthusiasts! "${title}" brings together the brightest campus minds for a transformative day of ${category.toLowerCase()}. Enjoy interactive sessions, live showcases, premium perks, and certificates of excellence. Reserve your free pass today on EventSphere!`,
  };
}

/**
 * Deterministic Fallback AI Planner
 */
export function generateDeterministicPlan({ preferences, existingEvent = null, venues = [] }) {
  const category = preferences.category || existingEvent?.category || 'Hackathons';
  const template = CATEGORY_TEMPLATES[category] || CATEGORY_TEMPLATES.Other;

  const title =
    existingEvent?.title ||
    preferences.eventName ||
    template.ideas[0]?.title ||
    `${category} 2026`;

  const theme =
    preferences.theme ||
    existingEvent?.description ||
    template.ideas[0]?.theme ||
    'Campus Excellence';

  // Real venue recommendations from DB
  const rankedVenues = rankVenuesForEvent(venues, preferences);
  const topVenues = rankedVenues.slice(0, 4);
  const bestVenueName = topVenues[0]?.venueName || 'Campus Auditorium';

  // Ideas
  const eventIdeas = template.ideas.map((idea) => ({
    title: idea.title,
    theme: idea.theme,
    description: idea.description,
    activities: idea.activities,
    engagementTips: idea.engagementTips,
  }));

  // Budget
  const budgetBreakdown = buildBudgetBreakdown(category, preferences.budget);

  // Equipment Checklist
  const requiredEquipment = [...template.defaultEquip];
  if (preferences.specialRequirements) {
    requiredEquipment.push(`Custom Organizer Requirement: ${preferences.specialRequirements}`);
  }

  // Schedule
  const schedule = template.scheduleHours.map((slot) => ({
    time: slot.time,
    title: slot.title,
    description: `Coordinated activity block for ${category.toLowerCase()} participants.`,
  }));

  // Promotional Copy
  const promotionalCopy = buildPromotionalCopy(
    title,
    category,
    preferences.date || existingEvent?.date || '',
    bestVenueName,
    preferences.audience
  );

  return {
    title,
    category,
    preferences: {
      participants: Number(preferences.participants) || 100,
      budget: Number(preferences.budget) || 20000,
      duration: preferences.duration || '4 Hours',
      date: preferences.date || existingEvent?.date || '',
      audience: preferences.audience || 'Open to All Students',
      indoorOutdoor: preferences.indoorOutdoor || 'Indoor',
      specialRequirements: preferences.specialRequirements || '',
    },
    eventIdeas,
    recommendedVenues: topVenues,
    schedule,
    budgetBreakdown,
    requiredEquipment,
    promotionalCopy,
  };
}

/**
 * Live Gemini API caller (when GEMINI_API_KEY or GOOGLE_API_KEY is present)
 */
async function callGeminiPlanner({ preferences, existingEvent, venues, apiKey }) {
  const ai = new GoogleGenAI({ apiKey });
  const category = preferences.category || existingEvent?.category || 'Hackathons';

  const venueContext = venues.map((v) => ({
    id: v._id?.toString() || v.id,
    name: v.venue_name,
    capacity: v.max_capacity,
    facilities: v.facilities,
    bookedDates: v.booked_dates || [],
  }));

  const systemInstruction = `You are an elite Campus Event Strategist & Planner for EventSphere.
Given the organizer's preferences and actual campus venue data, generate a complete JSON event plan.
IMPORTANT VENUE GROUNDING RULES:
1. ONLY recommend venues from the provided VENUE LIST. NEVER invent non-existent venues.
2. If the user specifies a date, check if the venue has bookedDates including that date. If so, flag isAvailable as false.
3. Keep the JSON schema strictly as requested. Return ONLY valid raw JSON with NO markdown code fences.`;

  const prompt = `Organizer Preferences:
- Mode: ${existingEvent ? 'Mode A (Plan Existing Event)' : 'Mode B (Discover New Ideas)'}
- Category: ${category}
- Event Title/Theme: ${preferences.eventName || existingEvent?.title || 'Not specified'}
- Expected Participants: ${preferences.participants || 100}
- Budget (INR ₹): ${preferences.budget || 20000}
- Duration: ${preferences.duration || '4 Hours'}
- Preferred Date: ${preferences.date || existingEvent?.date || 'Flexible'}
- Audience: ${preferences.audience || 'Open to All Students'}
- Setting: ${preferences.indoorOutdoor || 'Indoor'}
- Special Requirements: ${preferences.specialRequirements || 'None'}

Available Campus Venues in DB:
${JSON.stringify(venueContext, null, 2)}

Provide a JSON object adhering to this structure:
{
  "title": "Inspiring event title",
  "category": "${category}",
  "eventIdeas": [
    {
      "title": "Creative concept title",
      "theme": "Core theme slogan",
      "description": "2-3 sentence overview",
      "activities": ["Activity 1", "Activity 2", "Activity 3"],
      "engagementTips": ["Tip 1", "Tip 2"]
    }
  ],
  "recommendedVenueIds": [
    {
      "venueId": "must be an exact ID from Available Campus Venues",
      "suitabilityReason": "Why this real venue fits",
      "matchScore": 95
    }
  ],
  "schedule": [
    { "time": "09:00 AM - 10:00 AM", "title": "Check-in", "description": "Details" }
  ],
  "budgetBreakdown": [
    { "category": "Expense Name", "estimatedAmount": 5000, "notes": "Details" }
  ],
  "requiredEquipment": ["Item 1", "Item 2"],
  "promotionalCopy": {
    "socialCaptions": ["Caption 1 for Insta", "Caption 2 for LinkedIn"],
    "posterContent": "Catchy headline & bullet points",
    "promotionalPitch": "2-sentence elevator pitch"
  }
}`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      temperature: 0.7,
    },
  });

  const text = response.text || '';
  const parsed = JSON.parse(text);

  // Validate and match venues with real DB records
  const realVenueMap = new Map(venues.map((v) => [v._id?.toString() || v.id, v]));
  const matchedVenues = [];

  if (Array.isArray(parsed.recommendedVenueIds)) {
    for (const rec of parsed.recommendedVenueIds) {
      const realVenue = realVenueMap.get(rec.venueId);
      if (realVenue) {
        const evalResult = evaluateVenueSuitability(realVenue, preferences);
        matchedVenues.push({
          ...evalResult,
          suitabilityReason: rec.suitabilityReason || evalResult.suitabilityReason,
          matchScore: typeof rec.matchScore === 'number' ? rec.matchScore : evalResult.matchScore,
        });
      }
    }
  }

  // If Gemini failed to match enough real venues, supplement with ranked real venues
  if (matchedVenues.length === 0) {
    const fallbackRanked = rankVenuesForEvent(venues, preferences);
    matchedVenues.push(...fallbackRanked.slice(0, 3));
  }

  return {
    title: parsed.title || preferences.eventName || `${category} 2026`,
    category,
    preferences: {
      participants: Number(preferences.participants) || 100,
      budget: Number(preferences.budget) || 20000,
      duration: preferences.duration || '4 Hours',
      date: preferences.date || existingEvent?.date || '',
      audience: preferences.audience || 'Open to All Students',
      indoorOutdoor: preferences.indoorOutdoor || 'Indoor',
      specialRequirements: preferences.specialRequirements || '',
    },
    eventIdeas: Array.isArray(parsed.eventIdeas) && parsed.eventIdeas.length > 0
      ? parsed.eventIdeas
      : CATEGORY_TEMPLATES[category]?.ideas || CATEGORY_TEMPLATES.Other.ideas,
    recommendedVenues: matchedVenues,
    schedule: Array.isArray(parsed.schedule) && parsed.schedule.length > 0
      ? parsed.schedule
      : (CATEGORY_TEMPLATES[category] || CATEGORY_TEMPLATES.Other).scheduleHours,
    budgetBreakdown: Array.isArray(parsed.budgetBreakdown) && parsed.budgetBreakdown.length > 0
      ? parsed.budgetBreakdown
      : buildBudgetBreakdown(category, preferences.budget),
    requiredEquipment: Array.isArray(parsed.requiredEquipment) && parsed.requiredEquipment.length > 0
      ? parsed.requiredEquipment
      : (CATEGORY_TEMPLATES[category] || CATEGORY_TEMPLATES.Other).defaultEquip,
    promotionalCopy: parsed.promotionalCopy || buildPromotionalCopy(
      parsed.title || `${category} 2026`,
      category,
      preferences.date,
      matchedVenues[0]?.venueName,
      preferences.audience
    ),
  };
}

/**
 * Main AI Planner Interface with automatic fallback
 */
export async function generateEventPlan({ preferences = {}, existingEvent = null, venues = [] }) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  if (apiKey) {
    try {
      console.log('[AI Service] Calling Gemini 2.5 Flash for personalized event planning...');
      // 8-second timeout protection
      const geminiPromise = callGeminiPlanner({ preferences, existingEvent, venues, apiKey });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Gemini API call timed out')), 8000)
      );
      const plan = await Promise.race([geminiPromise, timeoutPromise]);
      console.log('[AI Service] Successfully generated event plan with Gemini.');
      return plan;
    } catch (err) {
      console.warn(`[AI Service] Gemini call failed (${err.message}). Seamlessly engaging deterministic planning engine.`);
    }
  }

  // Deterministic engine fallback
  return generateDeterministicPlan({ preferences, existingEvent, venues });
}
