// Every endpoint of the server as a function. One line each: the path and the types.

import { get, post } from './http'
import type {
  AuthResponse,
  Chat,
  ChatMember,
  ChatMessage,
  CreateEventRequest,
  EventDto,
  EventTypeInfo,
  Friend,
  FriendRequest,
  Invitation,
  MyProfile,
  Profile,
  PublicEvent,
  SavePreferenceRequest,
  UpdateProfileRequest,
} from './types'

export const api = {
  // ---------------------------------------------------------------- auth
  register: (email: string, password: string, displayName: string) =>
    post<AuthResponse>('/auth/register', { email, password, displayName }),
  login: (email: string, password: string) => post<AuthResponse>('/auth/login', { email, password }),

  // ---------------------------------------------------------------- profile
  myProfile: () => get<MyProfile>('/profile/me'),
  updateMyProfile: (request: UpdateProfileRequest) => post<MyProfile>('/profile/me', request),
  profile: (userId: number) => get<Profile>('/profile/' + userId),
  searchPeople: (text: string) => get<Profile[]>('/profile/search?text=' + encodeURIComponent(text)),

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
  /** A guest says where they are and how far they travel, for this event. */
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
}
