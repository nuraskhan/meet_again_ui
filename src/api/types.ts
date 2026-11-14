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

export interface EventDto {
  id: number
  eventType: EventTypeCode
  title: string
  description: string | null
  distanceMinKm: number
  distanceMaxKm: number
  priceMin: number
  priceMax: number
  startsAt: string | null
  status: EventStatus
  createdAt: string
  chatId: number
  creatorId: number
  creatorName: string
  invitees: Invitee[]
}

export interface CreateEventRequest {
  eventType: EventTypeCode
  title: string
  description: string | null
  distanceMinKm: number
  distanceMaxKm: number
  priceMin: number
  priceMax: number
  startsAt: string | null
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
