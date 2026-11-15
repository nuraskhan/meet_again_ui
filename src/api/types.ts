// The shapes the server sends and accepts. They mirror the DTO records of the backend
// (applications/hangelo/hangelo-mod/*/dto). Moments are ISO strings in UTC, e.g. 2030-01-01T02:30:00Z.

export interface AuthResponse {
  token: string
  userId: number
}

/** The privilege level of a person: the base of the future subscription plans. Set by the server. */
/** STANDARD is the free plan; PLUS is Hangelo Plus, which a person takes themselves. */
export type Privilege = 'STANDARD' | 'PLUS' | 'PRO' | 'MAX'

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
  /** How reliable the person is, counted from their history of plans. */
  reliability: Reliability
}

/**
 * How reliable a person is: of what they said they would do, how much they did.
 * A promise is saying "coming" to a plan, or creating one.
 */
export interface Reliability {
  /** 0 to 100: the share of promises kept. Null while there are too few promises to judge by. */
  score: number | null
  /** Came to a plan they said they would come to, or held their own. */
  kept: number
  /** Left after saying "coming", did not come, or cancelled a plan people were coming to. */
  broken: number
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
/**
 * REQUESTED: asked to join a public plan from the feed, the organiser has not answered. Not a
 * guest yet. Only the organiser sees such a person in the list of a plan.
 */
export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'REMOVED' | 'REQUESTED'

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
  /** The organiser marked, after the plan, that this guest said "coming" and did not come. */
  noShow: boolean
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
  /** The venue the organiser chose for the plan; null = not chosen. */
  place: Place | null
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
  /** The plan the chat belongs to; null for a chat without one. */
  eventId: number | null
  /** The kind of that plan, for its icon; null with eventId. */
  eventType: EventTypeCode | null
  /** The newest message; null while nobody has written. */
  lastMessage: ChatMessage | null
  /** How many messages others wrote after the last one the reader has seen. */
  unreadCount: number
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
  /** 0 to 5; null = nobody has rated it. */
  rating: number | null
  /** Null = what one spends there is not known. */
  priceMin: number | null
  priceMax: number | null
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
  /** The inviter's reliability, 0 to 100; null while there is too little history to judge by. */
  creatorReliability: number | null
  /** The name of the venue chosen for the plan; null = not chosen. */
  placeName: string | null
}

/** A venue: a place a plan can be held at. */
export interface Place {
  id: number
  name: string
  /** What one does there: the same values as the type of a plan. */
  category: EventTypeCode
  description: string | null
  address: string
  /** The city it is in; null if not known. */
  city: string | null
  latitude: number
  longitude: number
  /** 0 to 5; null = nobody has rated it. */
  rating: number | null
  /** How many reviews the rating rests on; null = unknown. */
  reviewCount: number | null
  /** Expected spending per person; null = not known. */
  priceMin: number | null
  priceMax: number | null
  website: string | null
  phone: string | null
  /** An invented demonstration place, not a real business. */
  sample: boolean
  /** How far it is from the point the search was made from, miles; null when no point was given. */
  distanceMi: number | null
}

/** What a person marked in their calendar for some days. */
export type AvailabilityKind = 'BUSY' | 'FREE' | 'TRIP'

/**
 * Days the current user marked in their own calendar. Days are plain dates ("2030-01-05"): no
 * time and no time zone - "the 5th" is the 5th for everyone.
 */
export interface Availability {
  id: number
  kind: AvailabilityKind
  fromDate: string
  /** The last day, included. */
  toDate: string
  /** Where to, for a TRIP; null otherwise. */
  city: string | null
  /** The user's own note; friends never see it. */
  note: string | null
}

export interface SaveAvailabilityRequest {
  kind: AvailabilityKind
  fromDate: string
  toDate: string
  city?: string
  note?: string
}

/** Days a friend marked, as their friends see them: no note. */
export interface FriendAvailability {
  userId: number
  displayName: string
  avatarUrl: string | null
  kind: AvailabilityKind
  fromDate: string
  toDate: string
  city: string | null
}

export type NotificationKind =
  | 'FRIEND_REQUEST'
  | 'FRIEND_ACCEPTED'
  | 'EVENT_INVITATION'
  | 'INVITATION_ACCEPTED'
  | 'INVITATION_DECLINED'
  | 'GUEST_JOINED'
  | 'GUEST_LEFT'
  | 'REMOVED_FROM_EVENT'
  | 'EVENT_CANCELLED'
  | 'JOIN_REQUESTED'
  | 'JOIN_APPROVED'
  | 'JOIN_DECLINED'

/**
 * Something that happened and concerns the logged-in person. (Not "Notification": that name is the
 * browser's own.)
 */
export interface AppNotification {
  id: number
  kind: NotificationKind
  /** The sentence to show, composed by the server. */
  text: string
  /** Who did it; null if that person is unknown. */
  actorId: number | null
  actorName: string | null
  actorAvatarUrl: string | null
  /** The plan it is about; null for what is not about a plan (friend requests). */
  eventId: number | null
  createdAt: string
  read: boolean
}

/** The figures of /admin/analytica, for the last so many days. A day is a UTC day. */
export interface Analytics {
  days: number
  /** Pages opened. */
  visits: number
  /** Different browsers that opened them. */
  visitors: number
  /** Of the visits, how many were by someone signed in. */
  signedInVisits: number
  /** Accounts there are in all. */
  users: number
  /** Accounts created in these days. */
  newUsers: number
  /** Plans created in these days. */
  plans: number
  /** Every day of the stretch, earliest first. */
  byDay: AnalyticsDay[]
  topPages: { path: string; visits: number; visitors: number }[]
}

export interface AnalyticsDay {
  /** "2030-01-05" */
  day: string
  visits: number
  visitors: number
}

/** What the signal "chat.message" carries. */
export interface ChatMessageSignal {
  chatId: number
  message: ChatMessage
}
