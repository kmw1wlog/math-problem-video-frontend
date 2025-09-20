export interface User {
  id: string;
  email: string;
  name?: string;
  isAdmin?: boolean;
}

class AuthManager {
  private currentUser: User | null = null;
  private accessToken: string | null = null;
  private listeners: Array<(user: User | null) => void> = [];

  constructor() {
    this.initialize();
  }

  private initialize() {
    // Load user from localStorage
    const savedUser = localStorage.getItem('manion_user');
    const savedToken = localStorage.getItem('manion_access_token');
    
    if (savedUser && savedToken) {
      try {
        this.currentUser = JSON.parse(savedUser);
        this.accessToken = savedToken;
      } catch (error) {
        console.error('Error loading saved user:', error);
        this.clearStoredAuth();
      }
    }
  }

  private saveToStorage() {
    if (this.currentUser && this.accessToken) {
      localStorage.setItem('manion_user', JSON.stringify(this.currentUser));
      localStorage.setItem('manion_access_token', this.accessToken);
    } else {
      this.clearStoredAuth();
    }
  }

  private clearStoredAuth() {
    localStorage.removeItem('manion_user');
    localStorage.removeItem('manion_access_token');
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.currentUser));
  }

  public getCurrentUser(): User | null {
    return this.currentUser;
  }

  public getAccessToken(): string | null {
    return this.accessToken;
  }

  public setUser(user: User, token?: string) {
    this.currentUser = user;
    if (token) {
      this.accessToken = token;
    }
    this.saveToStorage();
    this.notifyListeners();
  }

  public setAuthData(user: User, token: string) {
    this.currentUser = user;
    this.accessToken = token;
    this.saveToStorage();
    this.notifyListeners();
  }

  public clearUser() {
    this.currentUser = null;
    this.accessToken = null;
    this.clearStoredAuth();
    this.notifyListeners();
  }

  public onAuthChange(callback: (user: User | null) => void) {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  public async signOut() {
    this.currentUser = null;
    this.accessToken = null;
    this.clearStoredAuth();
    this.notifyListeners();
  }
}

export const authManager = new AuthManager();