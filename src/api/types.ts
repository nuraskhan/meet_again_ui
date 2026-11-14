// The shapes the server sends and accepts. They mirror the DTO records of the backend
// (applications/magain/magain-mod/*/dto). Moments are ISO strings in UTC, e.g. 2030-01-01T02:30:00Z.

export interface AuthResponse {
  token: string
  userId: number
}

/** The privilege level of a person: the base of the future subscription plans. Set by the server. */
export type Privilege = 'STANDARD' | 'PRO' | 'MAX'

export interface Photo {
  /** What remove / make-main take; meaningful only to the owner. */
  id: number
  /** The server path of the photo (/public/photo/<token>). Shown through serverFileUrl() of api/http.ts. */
  url: string
}

/** A question the person chose and their answer. */
export interface Prompt {
  question: string
  answer: string
}

/** A person in a list (search results): just enough to recognise them. */
export interface ProfileCard {
  userId: number
  displayName: string
  city: string | null
  avatarUrl: string | null
}

/** A person's profile as anyone logged in sees it. No e-mail, no date of birth - only the age. */
export interface Profile {
  userId: number
  displayName: string
  /** Whole years; null if the person gave no date of birth. */
  age: number | null
  pronouns: string | null
  city: string | null
  hometown: string | null
  occupation: string | null
  education: string | null
  languages: string | null
  bio: string | null
  /** The address of the main photo (the first of `photos`); null without photos. */
  avatarUrl: string | null
  privilege: Privilege
  /** All photos, the main one first. */
  photos: Photo[]
  interests: string[]
  prompts: Prompt[]
}

/** The current user's own profile: everything others see, plus what only they may see. */
export interface MyProfile extends Profile {
  email: string
  /** The person confirmed the address by the link we sent. Reminders go only to a confirmed one. */
  emailVerified: boolean
  /** A date, not a moment: 1995-03-01. Others see only `age`. */
  birthDate: string | null
  /** How many photos the privilege level allows. */
  maxPhotos: number
}

/**
 * Everything a person writes about themselves; the whole of it is replaced on every save. Photos
 * are uploaded separately as files, and the privilege level cannot be sent at all.
 */
export interface UpdateProfileRequest {
  displayName: string
  birthDate: string | null
  pronouns: string | null
  city: string | null
  hometown: string | null
  occupation: string | null
  education: string | null
  languages: string | null
  bio: string | null
  interests: string[]
  prompts: Prompt[]
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

/**
 * PENDING - invited, not answered; ACCEPTED - coming; DECLINED - not coming by their own choice (may
 * join again); REMOVED - taken out by the creator (may not).
 */
export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'REMOVED'

/** PRIVATE - only the invited; PUBLIC - shown in the feed, anyone can join. */
export type EventVisibility = 'PRIVATE' | 'PUBLIC'
/**
 * ACTIVE - open; CANCELLED - called off by its creator; EXPIRED - its last date has passed (set by
 * the server).
 */
export type EventStatus = 'ACTIVE' | 'CANCELLED' | 'EXPIRED'

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
  visibility: EventVisibility
  /** The secret part of the link to the event. Only the creator gets it. */
  shareToken: string | null
  creatorId: number
  /** Everyone invited by name or joined by the link. */
  invitees: Invitee[]
  /** What the current user said about themselves for this event; null until they say it. */
  myPreference: Preference | null
  /** When places were last suggested; null = never. */
  suggestedAt: string | null
  /** The places suggested, best first. Empty while never suggested, and when nothing was found. */
  suggestions: Suggestion[]
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
  /** Left out = PRIVATE. */
  visibility: EventVisibility
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

/**
 * A place suggested for an event. The distances are miles as the crow flies, measured when the
 * suggestions were computed, from the people whose location was known then.
 */
export interface Suggestion {
  /** 1 = the best. */
  rank: number
  placeId: number
  name: string
  category: EventTypeCode
  description: string | null
  address: string
  latitude: number
  longitude: number
  /** How good the place is, 0 to 5. */
  rating: number
  priceMin: number
  priceMax: number
  website: string | null
  phone: string | null
  averageDistanceMi: number
  farthestDistanceMi: number
  /** Each of those people is within their own travel radius. */
  withinEveryonesReach: boolean
  /** The prices of the place overlap the budget of the event. */
  fitsBudget: boolean
  /** How many people's locations the suggestion is based on. */
  participantsConsidered: number
  /** From the current user's own saved location; null if they gave none. */
  myDistanceMi: number | null
  /** An invented demonstration place, not a real business. */
  sample: boolean
}

/** Someone in the feed: enough to show a face and to open their profile. */
export interface FeedPerson {
  userId: number
  displayName: string
  avatarUrl: string | null
}

/**
 * A public event as the feed shows it: what the invitation says, who invites, who is coming, and
 * where the current user stands. The chat and the link are not here - one joins to get them.
 */
export interface FeedItem extends EventFacts {
  id: number
  createdAt: string
  creatorId: number
  creatorAvatarUrl: string | null
  creatorCity: string | null
  /** How many guests are coming (the creator is not counted). */
  goingCount: number
  /** The first few of them. */
  going: FeedPerson[]
  /** No place is left. */
  full: boolean
  /** CREATOR, the current user's own answer, or NONE for someone not part of it yet. */
  myStanding: 'CREATOR' | 'NONE' | InvitationStatus
}
