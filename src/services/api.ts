import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CONFIG from '../config';
import {
  User,
  AuthTokens,
  LoginCredentials,
  RegisterData,
  EmailVerificationData,
  QuestionSet,
  Game,
} from '../types';

class ApiService {
  private client: AxiosInstance;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: CONFIG.API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
    this.loadTokensFromStorage();
  }

  private setupInterceptors() {
    // Request interceptor to add authorization header
    this.client.interceptors.request.use(
      async (config) => {
        if (this.accessToken) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const newTokens = await this.refreshTokens();
            if (newTokens) {
              originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed, redirect to login
            await this.clearTokens();
            // Emit event for navigation to login
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private async loadTokensFromStorage() {
    try {
      const tokens = await AsyncStorage.getItem('authTokens');
      if (tokens) {
        const { accessToken, refreshToken } = JSON.parse(tokens);
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
      }
    } catch (error) {
      console.error('Error loading tokens from storage:', error);
    }
  }

  private async saveTokensToStorage(tokens: AuthTokens) {
    try {
      await AsyncStorage.setItem('authTokens', JSON.stringify(tokens));
      this.accessToken = tokens.accessToken;
      this.refreshToken = tokens.refreshToken;
    } catch (error) {
      console.error('Error saving tokens to storage:', error);
    }
  }

  private async clearTokens() {
    try {
      await AsyncStorage.removeItem('authTokens');
      this.accessToken = null;
      this.refreshToken = null;
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  }

  // Authentication Methods
  async register(data: RegisterData): Promise<{ message: string }> {
    const response = await this.client.post('/auth/register', data);
    return response.data;
  }

  async verifyEmail(data: EmailVerificationData): Promise<AuthTokens> {
    const response = await this.client.post('/auth/verify-email', data);
    const tokens: AuthTokens = response.data;
    await this.saveTokensToStorage(tokens);
    return tokens;
  }

  async login(credentials: LoginCredentials): Promise<AuthTokens> {
    const response = await this.client.post('/auth/login', credentials);
    const tokens: AuthTokens = response.data;
    await this.saveTokensToStorage(tokens);
    return tokens;
  }

  async logout(): Promise<void> {
    try {
      await this.client.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await this.clearTokens();
    }
  }

  async refreshTokens(): Promise<AuthTokens | null> {
    if (!this.refreshToken) {
      return null;
    }

    try {
      const response = await this.client.post('/auth/refresh', {
        refreshToken: this.refreshToken,
      });
      const tokens: AuthTokens = response.data;
      await this.saveTokensToStorage(tokens);
      return tokens;
    } catch (error) {
      console.error('Token refresh error:', error);
      await this.clearTokens();
      return null;
    }
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.client.get('/auth/me');
    return response.data;
  }

  // Question Sets
  async getQuestionSets(): Promise<QuestionSet[]> {
    const response = await this.client.get('/question-sets');
    return response.data;
  }

  async getQuestionSet(id: string): Promise<QuestionSet> {
    const response = await this.client.get(`/question-sets/${id}`);
    return response.data;
  }

  // Games
  async createGame(gameData: Partial<Game>): Promise<Game> {
    const response = await this.client.post('/games', gameData);
    return response.data;
  }

  async joinGame(gameId: string, password?: string): Promise<Game> {
    const response = await this.client.post(`/games/${gameId}/join`, { password });
    return response.data;
  }

  async getGame(gameId: string): Promise<Game> {
    const response = await this.client.get(`/games/${gameId}`);
    return response.data;
  }

  async updateGameStatus(gameId: string, status: string): Promise<Game> {
    const response = await this.client.patch(`/games/${gameId}`, { status });
    return response.data;
  }

  async submitGameResults(gameId: string, results: any): Promise<void> {
    await this.client.post(`/games/${gameId}/results`, results);
  }

  // Health Check
  async healthCheck(): Promise<{ status: string }> {
    const response = await this.client.get('/health');
    return response.data;
  }

  // Utility Methods
  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }
}

export default new ApiService(); 