export type Page = 
  | 'landing' 
  | 'login' 
  | 'signup' 
  | 'lister-dashboard' 
  | 'renter-dashboard' 
  | 'history'
  | 'equipment-details' 
  | 'messages' 
  | 'maintenance' 
  | 'booking-confirmation' 
  | 'list-equipment' 
  | 'settings';

export type BookingStatus = 'pending' | 'confirmed' | 'rejected';

export interface BookingConfirmationData {
  id: string;
  reservationId: string;
  equipmentId: string;
  equipmentName: string;
  category: string;
  location: string;
  imageUrl: string | null;
  startDate: string;
  endDate: string;
  rentalDays: number;
  dailyRate: number;
  subtotal: number;
  serviceFee: number;
  insuranceFee: number;
  total: number;
  status: BookingStatus;
  createdAt: string;
  ownerReviewedAt?: string | null;
  renterName?: string;
  renterPhone?: string;
}

export interface AuthUser {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  operationName: string | null;
  farmAddress: string | null;
}

export interface Equipment {
  id: string;
  title: string;
  category: string;
  brandModel: string;
  dailyRate: number;
  image: string;
  status: 'available' | 'in-use' | 'maintenance';
  nextAvailable?: string;
  location: string;
  distance?: string;
  rating: number;
  reviewsCount: number;
  owner: {
    name: string;
    avatar: string;
    isVerified: boolean;
  };
  specs: {
    horsepower: string;
    fuelType: string;
    transmission: string;
    weight: string;
  };
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  timestamp: string;
  isMe: boolean;
}

export interface Conversation {
  id: string;
  participantName: string;
  participantAvatar: string;
  equipmentName: string;
  equipmentImage: string;
  lastMessage: string;
  timestamp: string;
  isActive: boolean;
  status?: 'active' | 'completed' | 'pending';
}
