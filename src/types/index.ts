export type UserRole = 'Student' | 'Organizer' | 'Admin';

export interface IUser {
  _id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  createdAt?: string;
}

export interface IVenue {
  _id: string;
  venue_name: string;
  location_type: 'in_campus' | 'out_campus';
  max_capacity: number;
  booked_dates?: string[];
  createdAt?: string;
}

export type EventCategory = 'Hackathon' | 'Standup Comedy' | 'Seminar' | 'Cultural Show' | 'Other';
export type EventStatus = 'Pending' | 'Approved' | 'Rejected';

export interface IEvent {
  _id: string;
  title: string;
  category: EventCategory;
  description: string;
  venue_id: string | IVenue;
  organizer_id: string | IUser;
  event_date: string; // YYYY-MM-DD
  status: EventStatus;
  registered_count: number;
  createdAt?: string;
}

export interface IRegistration {
  _id: string;
  event_id: string | IEvent;
  user_id: string | IUser;
  createdAt: string;
}
