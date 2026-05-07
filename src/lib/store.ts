import { create } from 'zustand'

export interface Client {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  channel: string
  status: string
  score: number | null
  scoreLabel: string | null
  scoreReasons: string | null
  step: number
  profile: string | null
  summary: string | null
  isManual: boolean
  createdAt: string
}

export interface Message {
  id: string
  clientId: string
  role: string
  content: string
  createdAt: string
}

export interface Booking {
  id: string
  clientId: string | null
  propertyId?: string | null
  title: string
  startDate: string
  endDate: string
  notes: string | null
  status: string
  price?: number | null
  createdAt: string
  property?: { id: string; name: string } | null
}

export interface Connection {
  id: string
  userId: string
  provider: string
  connected: boolean
  pageName?: string
  connectedAt?: string
}

export interface Stats {
  total: number
  avgScore: number
  byLabel: Record<string, number>
  byChannel: Record<string, number>
  byStatus: Record<string, number>
  totalMessages: number
  totalRevenue: number
  confirmedBookings: number
  pendingBookings: number
  completedBookings: number
  totalProperties: number
  activeProperties: number
  avgOccupancy: number
  avgRating: number
  propertyRevenue: number
  monthlyRevenue: Record<string, number>
}

export interface Property {
  id: string
  name: string
  address?: string | null
  city?: string | null
  country: string
  type: string
  bedrooms: number
  bathrooms: number
  guests: number
  pricePerNight: number
  description?: string | null
  amenities?: string | null
  petsAllowed: boolean
  minimumStay: number
  images?: string | null
  facebookPostId?: string | null
  facebookPublishedAt?: string | null
  status: string
  rating?: number | null
  totalBookings: number
  totalRevenue: number
  createdAt: string
}

export interface PropertyBooking {
  id: string
  propertyId: string
  clientId?: string | null
  guestName: string
  startDate: string
  endDate: string
  status: string
  totalPrice?: number | null
  notes?: string | null
  createdAt: string
}

export interface Notification {
  id: string
  type: string
  title: string
  content?: string | null
  read: boolean
  link?: string | null
  createdAt: string
}

export interface Activity {
  id: string
  type: string
  title: string
  content?: string | null
  metadata?: string | null
  createdAt: string
}

export interface Review {
  id: string
  guestName: string
  propertyId?: string | null
  propertyName?: string | null
  rating: number
  comment?: string | null
  source: string
  response?: string | null
  respondedAt?: string | null
  createdAt: string
}

interface AppState {
  // Auth
  token: string | null
  user: { username: string; name: string } | null
  setAuth: (token: string, user: { username: string; name: string }) => void
  clearAuth: () => void

  // Navigation
  currentView: string
  viewParams: Record<string, string>
  navigate: (view: string, params?: Record<string, string>) => void

  // Data
  clients: Client[]
  setClients: (clients: Client[]) => void
  currentFilter: string
  setCurrentFilter: (filter: string) => void
  searchQuery: string
  setSearchQuery: (q: string) => void

  // Chat
  activeChatId: string | null
  chatMessages: Message[]
  setActiveChat: (id: string | null) => void
  setChatMessages: (messages: Message[]) => void

  // Bookings
  bookings: Booking[]
  setBookings: (bookings: Booking[]) => void

  // Calendar
  calYear: number
  calMonth: number
  setCalMonth: (year: number, month: number) => void

  // Connections
  connections: Record<string, Connection>
  setConnection: (provider: string, conn: Connection) => void
  setConnections: (conns: Record<string, Connection>) => void

  // Properties
  properties: Property[]
  setProperties: (properties: Property[]) => void

  // Notifications
  notifications: Notification[]
  setNotifications: (notifications: Notification[]) => void
  unreadCount: number
  setUnreadCount: (count: number) => void
  showNotifications: boolean
  setShowNotifications: (show: boolean) => void

  // Activity
  activities: Activity[]
  setActivities: (activities: Activity[]) => void

  // Reviews
  reviews: Review[]
  setReviews: (reviews: Review[]) => void

  // Theme
  theme: 'dark' | 'light'
  setTheme: (theme: 'dark' | 'light') => void
}

export const useAppStore = create<AppState>((set) => ({
  // Auth
  token: typeof window !== 'undefined' ? localStorage.getItem('hm_token') : null,
  user: typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('hm_user') || 'null') : null,
  setAuth: (token, user) => {
    localStorage.setItem('hm_token', token)
    localStorage.setItem('hm_user', JSON.stringify(user))
    set({ token, user })
  },
  clearAuth: () => {
    localStorage.removeItem('hm_token')
    localStorage.removeItem('hm_user')
    set({ token: null, user: null, clients: [], properties: [], notifications: [], activities: [], reviews: [] })
  },

  // Navigation
  currentView: 'login',
  viewParams: {},
  navigate: (view, params = {}) => set({ currentView: view, viewParams: params }),

  // Data
  clients: [],
  setClients: (clients) => set({ clients }),
  currentFilter: 'ALL',
  setCurrentFilter: (filter) => set({ currentFilter: filter }),
  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),

  // Chat
  activeChatId: null,
  chatMessages: [],
  setActiveChat: (id) => set({ activeChatId: id }),
  setChatMessages: (messages) => set({ chatMessages: messages }),

  // Bookings
  bookings: [],
  setBookings: (bookings) => set({ bookings }),

  // Calendar
  calYear: new Date().getFullYear(),
  calMonth: new Date().getMonth(),
  setCalMonth: (year, month) => set({ calYear: year, calMonth: month }),

  // Connections
  connections: {},
  setConnection: (provider, conn) =>
    set((s) => ({ connections: { ...s.connections, [provider]: conn } })),
  setConnections: (conns) => set({ connections: conns }),

  // Properties
  properties: [],
  setProperties: (properties) => set({ properties }),

  // Notifications
  notifications: [],
  setNotifications: (notifications) => set({ notifications }),
  unreadCount: 0,
  setUnreadCount: (count) => set({ unreadCount: count }),
  showNotifications: false,
  setShowNotifications: (show) => set({ showNotifications: show }),

  // Activity
  activities: [],
  setActivities: (activities) => set({ activities }),

  // Reviews
  reviews: [],
  setReviews: (reviews) => set({ reviews }),

  // Theme
  theme: (typeof window !== 'undefined' ? localStorage.getItem('hm_theme') : null) === 'light' ? 'light' : 'dark',
  setTheme: (theme) => {
    localStorage.setItem('hm_theme', theme)
    set({ theme })
  },
}))
