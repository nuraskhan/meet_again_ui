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
  avatarUrl: string | null
}

export interface MyProfile extends Profile {
  email: string
}

export interface UpdateProfileRequest {
  displayName: string
  bio: string | null
  city: string | null
  birthDate: string | null
  avatarUrl: string | null
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
  defaultDistanceMinKm: number
  defaultDistanceMaxKm: number
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
}

/** What an invitation says. Shared by the event a participant sees and the one opened by a link. */
export interface EventFacts {
  eventType: EventTypeCode
  title: string
  description: string | null
  distanceMinKm: number
  distanceMaxKm: number
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
  distanceMinKm: number
  distanceMaxKm: number
  priceMin: number
  priceMax: number
  proposedTimes: string[]
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
