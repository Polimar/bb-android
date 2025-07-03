export interface User {
  id: string;
  username: string;
  email: string;
  accountType: AccountType;
  emailVerified: boolean;
  level: number;
  xp: number;
  createdAt: string;
  updatedAt: string;
}

export enum AccountType {
  FREE = 'FREE',
  PREMIUM = 'PREMIUM',
  ADMIN = 'ADMIN',
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
}

export interface EmailVerificationData {
  email: string;
  code: string;
}

// P2P Game Types
export interface GamePlayer {
  id: string;
  userId: string;
  username: string;
  accountType: AccountType;
  deviceId: string;
  batteryLevel: number;
  connectionQuality: number;
  isHost: boolean;
  isReady: boolean;
  score: number;
  joinedAt: string;
}

export interface Game {
  id: string;
  hostId: string;
  name: string;
  language: Language;
  maxPlayers: number;
  questionCount: number;
  timePerQuestion: number;
  isPrivate: boolean;
  status: GameStatus;
  players: GamePlayer[];
  currentQuestion?: Question;
  questionIndex: number;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export enum GameStatus {
  WAITING = 'WAITING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export enum Language {
  IT = 'IT',
  EN = 'EN',
  ES = 'ES',
  DE = 'DE',
  FR = 'FR',
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
  difficulty: Difficulty;
  explanation?: string;
}

export enum Difficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
}

export interface QuestionSet {
  id: string;
  name: string;
  description?: string;
  language: Language;
  category: string;
  totalQuestions: number;
  isPublic: boolean;
  questions: Question[];
}

// P2P Architecture Types
export interface PeerConnection {
  id: string;
  userId: string;
  connection: any; // RTCPeerConnection
  dataChannel?: any; // RTCDataChannel
  status: PeerStatus;
  lastHeartbeat: number;
}

export enum PeerStatus {
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  FAILED = 'FAILED',
}

export interface P2PMessage {
  type: P2PMessageType;
  from: string;
  to?: string; // undefined for broadcast
  data: any;
  timestamp: number;
  gameId: string;
}

export enum P2PMessageType {
  // Connection Management
  HEARTBEAT = 'HEARTBEAT',
  PEER_JOIN = 'PEER_JOIN',
  PEER_LEAVE = 'PEER_LEAVE',
  
  // Game Flow
  GAME_START = 'GAME_START',
  QUESTION_DISTRIBUTION = 'QUESTION_DISTRIBUTION',
  ANSWER_SUBMISSION = 'ANSWER_SUBMISSION',
  SCORE_UPDATE = 'SCORE_UPDATE',
  GAME_END = 'GAME_END',
  
  // Server Election
  ELECTION_START = 'ELECTION_START',
  ELECTION_VOTE = 'ELECTION_VOTE',
  NEW_HOST = 'NEW_HOST',
  EMERGENCY_PROMOTION = 'EMERGENCY_PROMOTION',
}

export interface ServerElectionCandidate {
  userId: string;
  accountType: AccountType;
  batteryLevel: number;
  connectionQuality: number;
  deviceId: string;
  priority: number;
}

export interface GameAnswer {
  questionId: string;
  selectedOption: number;
  timeSpent: number; // milliseconds
  timestamp: number;
}

export interface GameResults {
  gameId: string;
  finalScores: Array<{
    userId: string;
    username: string;
    score: number;
    position: number;
    correctAnswers: number;
    averageTime: number;
  }>;
  questions: Question[];
  totalDuration: number;
}

// Device Info
export interface DeviceInfo {
  id: string;
  platform: 'ios' | 'android';
  version: string;
  model: string;
  batteryLevel: number;
  networkType: string;
  connectionQuality: number;
} 