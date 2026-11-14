// The shapes the server sends and accepts. They mirror the DTO records of the backend
// (applications/magain/magain-mod/*/dto). Moments are ISO strings in UTC, e.g. 2030-01-01T02:30:00Z.

export interface AuthResponse {
  token: string
  userId: number
}

export interface Profile {
  userId: number
  displayName: string
  bio: string | null
  city: string | null
  birthDate: string | null // a date, not a moment: 1995-03-01
  /**
   * The server path of the uploaded picture (/public/avatar/<token>), never a link to another
   * site. Shown through serverFileUrl() of api/http.ts.
   */
  avatarUrl: string | null
}

export interface MyProfile extends Profile {
  email: string
  /** The person confirmed the address by the link we sent. Reminders go only to a confirmed one. */
  emailVerified: boolean
}

/** The text part of a profile. The picture is uploaded separately, as a file. */
export interface UpdateProfileRequest {
  displayName: string
  bio: string | null
  city: string | null
  birthDate: string | null
}

export interface Friend {
  userId: number
  displayName: string
  city: string | null
  avatarUrl: string | null
  friendsSince: string
}

export interface FriendRequest {
  requestId: number
  /** The other person: the sender of an incoming request, the addressee of an outgoing one. */
  userId: number
  displayName: string
  avatarUrl: string | null
  createdAt: string
}

export type EventTypeCode =
  | 'BATH'
  | 'FOOD'
  | 'COFFEE'
  | 'BAR'
  | 'WALK'
  | 'CINEMA'
  | 'SPORT'
  | 'BOARD_GAMES'
  | 'OTHER'

/** A type of event with the values its invitation form is pre-filled with. */
export interface EventTypeInfo {
  eventType: EventTypeCode
  defaultTitle: string
  defaultDistanceMinMi: number
  defaultDistanceMaxMi: number
  defaultPriceMin: number
  defaultPriceMax: number
}

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED'
export type EventStatus = 'ACTIVE' | 'CANCELLED'

export interface Invitee {
  invitationId: number
  userId: number
  displayName: string
  status: InvitationStatus
  respondedAt: string | null
  /** The farthest the guest is ready to go, miles. Null = not said yet. */
  travelRadiusMi: number | null
  /** The place as the guest typed it. Null if they shared coordinates only, or said nothing. */
  locationText: string | null
  /** The guest shared the location of their device. The coordinates themselves are never sent. */
  locationShared: boolean
}

/** The current user's own preference for an event, coordinates included. */
export interface Preference {
  latitude: number | null
  longitude: number | null
  locationText: string | null
  travelRadiusMi: number
}

/** Coordinates (both together), a typed place, or both - at least one. */
export interface SavePreferenceRequest {
  latitude: number | null
  longitude: number | null
  locationText: string | null
  travelRadiusMi: number
}

/** What an invitation says. Shared by the event a participant sees and the one opened by a link. */
export interface EventFacts {
  eventType: EventTypeCode
  title: string
  description: string | null
  distanceMinMi: number
  distanceMaxMi: number
  priceMin: number
  priceMax: number
  /** The dates the creator offers, earliest first. Empty = to be agreed in the chat. */
  proposedTimes: string[]
  status: EventStatus
  creatorName: string
}

/** An event as its participants see it. */
export interface EventDto extends EventFacts {
  id: number
  createdAt: string
  chatId: number
  /** The secret part of the link to the event. Only the creator gets it. */
  shareToken: string | null
  creatorId: number
  /** Everyone invited by name or joined by the link. */
  invitees: Invitee[]
  /** What the current user said about themselves for this event; null until they say it. */
  myPreference: Preference | null
}

/** An event as anyone with its link sees it, logged in or not: no ids, no guest names. */
export interface PublicEvent extends EventFacts {
  invitedCount: number
  goingCount: number
}

export interface CreateEventRequest {
  eventType: EventTypeCode
  title: string
  description: string | null
  distanceMinMi: number
  distanceMaxMi: number
  priceMin: number
  priceMax: number
  proposedTimes: string[]
  /** The time zone the dates are meant in (IANA name, from the browser). Reminders show it. */
  timeZone: string | null
  /** May be empty: people then come by the link. */
  inviteeIds: number[]
}

/** An invitation the current user has not answered yet. */
export interface Invitation {
  invitationId: number
  event: EventDto
}

export interface Chat {
  id: number
  title: string
  createdAt: string
  memberCount: number
}

export interface ChatMember {
  userId: number
  displayName: string
  avatarUrl: string | null
}

export interface ChatMessage {
  id: number
  authorId: number
  authorName: string
  text: string
  createdAt: string
}
