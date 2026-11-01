/**
 * Startup Seeder (JavaScript Edition)
 * Auto-seeds campus venues & demo accounts on boot if collections are empty.
 */

import { db } from './db.js';

export async function connectAndSeedDB() {
  await db.connect();

  const venueCount = await db.countVenues();
  if (venueCount === 0) {
    console.log('[Seeder] Seeding initial campus venues...');
    const shanti = await db.createVenue({
      venue_name: 'Shanti Devi Mittal Auditorium',
      location_type: 'in_campus',
      max_capacity: 2500,
    });
    const ashok = await db.createVenue({
      venue_name: 'Ashok Mittal Auditorium',
      location_type: 'in_campus',
      max_capacity: 1200,
    });
    const ground = await db.createVenue({
      venue_name: 'Main Campus Ground',
      location_type: 'in_campus',
      max_capacity: 5000,
    });
    const seminar = await db.createVenue({
      venue_name: 'Block 34 Seminar Hall',
      location_type: 'in_campus',
      max_capacity: 350,
    });
    const classroom = await db.createVenue({
      venue_name: 'Block 32 Classroom 401',
      location_type: 'in_campus',
      max_capacity: 120,
    });

    console.log('[Seeder] Venues seeded successfully.');

    // Seed Demo Users
    console.log('[Seeder] Seeding demo accounts...');
    const studentUser = await db.createUser({
      name: 'Alex Rivera',
      email: 'alex.student@campus.edu',
      password: 'password123',
      role: 'Student',
    });
    const organizerUser = await db.createUser({
      name: 'Priya Sharma (Tech Club Lead)',
      email: 'priya.organizer@campus.edu',
      password: 'password123',
      role: 'Organizer',
    });
    await db.createUser({
      name: 'Dean of Student Affairs',
      email: 'dean.admin@campus.edu',
      password: 'adminpassword',
      role: 'Admin',
    });

    // Seed Initial Events
    console.log('[Seeder] Seeding initial events...');
    const event1 = await db.createEvent({
      title: 'HackCampus 2026: 36-Hour National Hackathon',
      category: 'Hackathon',
      description:
        'The largest annual collegiate hackathon bringing together 1,000+ developers, designers, and innovators to solve real campus and civic problems.',
      venue_id: ashok._id,
      organizer_id: organizerUser._id,
      event_date: '2026-11-15',
    });
    await db.updateEventStatus(event1._id, 'Approved');

    const event2 = await db.createEvent({
      title: 'Campus Standup Night ft. The Punchliners',
      category: 'Standup Comedy',
      description:
        'An evening of non-stop comedy and satire featuring top campus comics and special guest improvisers. Free entry for enrolled students.',
      venue_id: seminar._id,
      organizer_id: organizerUser._id,
      event_date: '2026-11-20',
    });
    await db.updateEventStatus(event2._id, 'Approved');

    const event3 = await db.createEvent({
      title: 'Next-Gen AI & Robotics Annual Symposium',
      category: 'Seminar',
      description:
        'Keynotes from leading researchers on multimodal AI systems, autonomous robotics, and edge computing in higher education.',
      venue_id: shanti._id,
      organizer_id: organizerUser._id,
      event_date: '2026-11-28',
    });
    await db.updateEventStatus(event3._id, 'Approved');

    await db.createEvent({
      title: 'Web3 & Decentralized Systems Hands-on Workshop',
      category: 'Seminar',
      description:
        'Interactive coding lab covering smart contracts, distributed consensus, and cryptography fundamentals.',
      venue_id: classroom._id,
      organizer_id: organizerUser._id,
      event_date: '2026-12-05',
    });

    // Seed 1 registration for Alex Rivera
    try {
      await db.registerUserForEvent(event1._id, studentUser._id);
    } catch {
      // Ignore if exists
    }

    console.log('[Seeder] Database initialized with campus venues, accounts, and events.');
  }
}
