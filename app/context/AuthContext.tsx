"use client";
import {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from "react";
import api, { 
  isSafari,
  saveUserPhone,
  getSavedPhone,
  saveUserDataCache,
  getCachedUserData,
  clearAuthData,
  setAuthToken,
  clearAuthToken,
  getAuthToken
} from "@/api/api";
import { useRouter } from "next/navigation";

interface User {
  id: number;
  name: string;
  phone?: string | null;
  mobile?: string | null;
  profile_url?: string | null;
  reward_points: {
    total: number;
    used: number;
    expired: number;
    available: number;
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (phone: string, username: string) => Promise<void>;
  autoLogin: (phone: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Extract user data
  const extractUserFromResponse = (responseData: any): User | null => {
    if (!responseData) return null;
    
    let userData;
    
    if (responseData.user) {
      userData = responseData.user;
    } else if (responseData.data?.user) {
      userData = responseData.data.user;
    } else if (responseData.data) {
      userData = responseData.data;
    } else if (responseData.id) {
      userData = responseData;
    } else {
      return null;
    }
    
    return {
      id: userData.id || 0,
      name: userData.name || 'Unknown User',
      phone: userData.phone || userData.mobile || null,
      mobile: userData.mobile || userData.phone || null,
      profile_url: userData.profile_url || null,
      reward_points: userData.reward_points || {
        total: 0,
        used: 0,
        expired: 0,
        available: 0
      }
    };
  };

  // Auto-login with saved phone
  const autoLogin = async (phone: string): Promise<boolean> => {
    try {
      console.log('🔄 Attempting auto-login with phone:', phone);
      
      const response = await api.post('/login', { 
        phone, 
        name: 'Auto Login'
      });
      
      if (response.data.success) {
        console.log('✅ Auto-login successful');
        
        // Save token if provided
        if (response.data.token) {
          setAuthToken(response.data.token);
        }
        
        // Extract and set user data
        const userData = extractUserFromResponse(response.data);
        if (userData) {
          setUser(userData);
          saveUserDataCache(userData);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('🔴 Auto-login failed:', error);
      return false;
    }
  };

  // Initial load - Try auto-login
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('🚀 Initializing auth...');
        
        // Check for saved phone
        const savedPhone = getSavedPhone();
        
        if (savedPhone) {
          console.log('📱 Found saved phone, attempting auto-login...');
          
          // Try auto-login
          const success = await autoLogin(savedPhone);
          
          if (success) {
            console.log('✅ Auto-login successful');
            setLoading(false);
            return;
          } else {
            console.log('❌ Auto-login failed, clearing saved phone');
            clearAuthData();
          }
        }
        
        // If no saved phone or auto-login failed, try normal auth
        console.log('🔍 Checking existing session...');
        try {
          const response = await api.get('/user');
          const userData = extractUserFromResponse(response.data);
          
          if (userData) {
            console.log('✅ Existing session found');
            setUser(userData);
            
            // Save phone for future auto-login
            if (userData.mobile || userData.phone) {
              saveUserPhone(userData.mobile || userData.phone || '');
            }
          } else {
            console.log('❌ No active session');
            setUser(null);
          }
        } catch (error: any) {
          console.log('🔴 Session check failed:', error.message);
          setUser(null);
        }
      } catch (error) {
        console.log('🔴 Auth initialization failed:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Normal login
// In your AuthContext.tsx
const login = async (phone: string, username: string) => {
  setLoading(true);
  try {
    console.log('🔐 Logging in...');
    
    // Send only phone to backend (ignore username)
    const response = await api.post('/login', { phone });
    
    if (response.data.success) {
      console.log('✅ Login successful');
      
      // Save token if provided
      if (response.data.token) {
        setAuthToken(response.data.token);
      }
      
      // Extract user data
      const userData = extractUserFromResponse(response.data);
      
      if (userData) {
        // Save phone to localStorage for future auto-login
        saveUserPhone(phone);
        
        // Cache user data
        saveUserDataCache(userData);
        
        // Set user in state
        setUser(userData);
        
        router.push("/");
      } else {
        throw new Error("Could not get user data");
      }
    } else {
      throw new Error(response.data.message || "Login failed");
    }
  } catch (error: any) {
    console.error('🔴 Login failed:', error);
    
    // Clear any saved data on login failure
    clearAuthData();
    
    throw error;
  } finally {
    setLoading(false);
  }
};

  // Logout
  const logout = async () => {
    try {
      await api.post('/logout', {});
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    // Clear all local data
    clearAuthData();
    clearAuthToken();
    setUser(null);
    router.push("/sign-in");
  };

  // Refresh user
  const refreshUser = async () => {
    try {
      const response = await api.get('/user');
      const userData = extractUserFromResponse(response.data);
      
      if (userData) {
        setUser(userData);
        saveUserDataCache(userData);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Refresh failed:', error);
      throw error;
    }
  };

  // Update user
  const updateUser = (updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      saveUserDataCache(updatedUser);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      autoLogin, 
      logout, 
      refreshUser, 
      updateUser 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be inside AuthProvider");
  return context;
};