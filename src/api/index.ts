// Every endpoint of the server as a function. One line each: the path and the types.

import { get, post, upload } from './http'
import type {
  AppNotification,
  AuthResponse,
  Chat,
  ChatMember,
  ChatMessage,
  CreateEventRequest,
  EventDto,
  EventTypeCode,
  EventTypeInfo,
  FeedItem,
  Friend,
  FriendRequest,
  Invitation,
  MyProfile,
  Profile,
  ProfileCard,
  PublicEvent,
  SavePreferenceRequest,
  UpdateProfileRequest,
} from './types'

/** How many events the feed loads at a time. A full page means there may be more. */
export const FEED_PAGE = 20

/** How many notifications are loaded at a time. A full page means there may be more. */
export const NOTIFICATION_PAGE = 20

export const api = {
  // ---------------------------------------------------------------- auth
  register: (email: string, password: string, displayName: string) =>
    post<AuthResponse>('/auth/register', { email, password, displayName }),
  login: (email: string, password: string) => post<AuthResponse>('/auth/login', { email, password }),
  /** The link from the confirmation letter. Works without being logged in. */
  verifyEmail: (token: string) => post<void>('/auth/verify-email', { token }),
  /** "Send the confirmation letter again." The server allows it once a minute. */
  sendEmailVerification: () => post<void>('/account/email-verification/send'),

  // ---------------------------------------------------------------- profile
  myProfile: () => get<MyProfile>('/profile/me'),
  updateMyProfile: (request: UpdateProfileRequest) => post<MyProfile>('/profile/me', request),
  /** Adds a photo after the existing ones. The server accepts JPEG and PNG up to 6 MB. */
  uploadPhoto: (file: File) => upload<MyProfile>('/profile/me/photo', file),
  removePhoto: (photoId: number) => post<MyProfile>('/profile/me/photo/' + photoId + '/remove'),
  /** Puts the photo first: it becomes the picture shown next to the name everywhere. */
  makeMainPhoto: (photoId: number) => post<MyProfile>('/profile/me/photo/' + photoId + '/make-main'),
  profile: (userId: number) => get<Profile>('/profile/' + userId),
  searchPeople: (text: string) => get<ProfileCard[]>('/profile/search?text=' + encodeURIComponent(text)),

  // ---------------------------------------------------------------- friends
  friends: () => get<Friend[]>('/friend/list'),
  removeFriend: (userId: number) => post<void>('/friend/' + userId + '/remove'),
  sendFriendRequest: (userId: number) => post<{ requestId: number }>('/friend/request', { userId }),
  incomingFriendRequests: () => get<FriendRequest[]>('/friend/request/incoming'),
  outgoingFriendRequests: () => get<FriendRequest[]>('/friend/request/outgoing'),
  acceptFriendRequest: (requestId: number) => post<void>('/friend/request/' + requestId + '/accept'),
  declineFriendRequest: (requestId: number) => post<void>('/friend/request/' + requestId + '/decline'),

  // ---------------------------------------------------------------- events
  eventTypes: () => get<EventTypeInfo[]>('/event/type/list'),
  createEvent: (request: CreateEventRequest) => post<EventDto>('/event/create', request),
  events: () => get<EventDto[]>('/event/list'),
  event: (eventId: number) => get<EventDto>('/event/' + eventId),
  cancelEvent: (eventId: number) => post<void>('/event/' + eventId + '/cancel'),

  // ---------------------------------------------------------------- the feed (public events)
  /** A page of public events, newest first. `beforeId` = the id of the last one already shown. */
  feed: (eventType: EventTypeCode | null, beforeId: number | null) =>
    get<FeedItem[]>(
      '/feed/list?limit=' + FEED_PAGE +
        (eventType === null ? '' : '&eventType=' + eventType) +
        (beforeId === null ? '' : '&beforeId=' + beforeId),
    ),
  /** Joining a public event from the feed. */
  /**
   * Asking to join a public plan from the feed. The answer says where the caller stands now:
   * REQUESTED - the organiser has to approve; ACCEPTED - they were invited and are coming.
   */
  joinPublicEvent: (eventId: number) =>
    post<{ standing: 'REQUESTED' | 'ACCEPTED' | 'CREATOR' }>('/event/' + eventId + '/join'),
  /** The organiser lets in someone who asked to join. */
  approveJoinRequest: (eventId: number, userId: number) =>
    post<EventDto>('/event/' + eventId + '/request/' + userId + '/approve'),
  /** The organiser says no to someone who asked to join. They may ask again. */
  declineJoinRequest: (eventId: number, userId: number) =>
    post<EventDto>('/event/' + eventId + '/request/' + userId + '/decline'),
  /**
   * A guest who is coming changes their mind and leaves the chat. They may join again.
   * Someone whose request to join is still waiting takes it back with the same call.
   */
  leaveEvent: (eventId: number) => post<void>('/event/' + eventId + '/leave'),
  /** The creator takes a guest out. That person cannot join again. */
  removeGuest: (eventId: number, userId: number) =>
    post<EventDto>('/event/' + eventId + '/guest/' + userId + '/remove'),

  /** "Suggest places": the server looks for the best places and keeps the answer with the event. */
  refreshSuggestions: (eventId: number) => post<EventDto>('/event/' + eventId + '/suggestion/refresh'),
  /** A participant says where they are and how far they travel, for this event. */
  savePreference: (eventId: number, request: SavePreferenceRequest) =>
    post<EventDto>('/event/' + eventId + '/preference', request),
  /** The invitation a link leads to. Works without being logged in. */
  publicEvent: (shareToken: string) => get<PublicEvent>('/public/event/' + encodeURIComponent(shareToken)),
  /** Accepting by the link. Needs a logged-in user. */
  joinEvent: (shareToken: string) => post<EventDto>('/event/join/' + encodeURIComponent(shareToken)),

  // ---------------------------------------------------------------- invitations
  incomingInvitations: () => get<Invitation[]>('/invitation/incoming'),
  acceptInvitation: (invitationId: number) => post<void>('/invitation/' + invitationId + '/accept'),
  declineInvitation: (invitationId: number) => post<void>('/invitation/' + invitationId + '/decline'),

  // ---------------------------------------------------------------- chats
  chats: () => get<Chat[]>('/chat/list'),
  chatMembers: (chatId: number) => get<ChatMember[]>('/chat/' + chatId + '/member/list'),
  chatMessages: (chatId: number, beforeId?: number) =>
    get<ChatMessage[]>(
      '/chat/' + chatId + '/message/list' + (beforeId === undefined ? '' : '?beforeId=' + beforeId),
    ),
  postChatMessage: (chatId: number, text: string) =>
    post<ChatMessage>('/chat/' + chatId + '/message', { text }),

  // ---------------------------------------------------------------- notifications
  /** Newest first; the next page is asked with the id of the last one got. */
  notifications: (beforeId?: number) =>
    get<AppNotification[]>(
      '/notification/list?limit=' + NOTIFICATION_PAGE + (beforeId === undefined ? '' : '&beforeId=' + beforeId),
    ),
  unreadNotificationCount: () => get<{ count: number }>('/notification/unread-count'),
  /** @returns how many are still unread */
  markNotificationRead: (id: number) => post<{ count: number }>('/notification/' + id + '/read'),
  markAllNotificationsRead: () => post<{ count: number }>('/notification/read-all'),
}
