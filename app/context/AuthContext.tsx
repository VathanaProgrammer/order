"use client";
import {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from "react";
import api, { isSafari } from "@/api/api";
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
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // 🔹 Unified function to extract user data from API response
  const extractUserFromResponse = (responseData: any): User | null => {
    console.log('Extracting user from:', responseData);
    
    let userData;
    
    if (responseData.user) {
      userData = responseData.user;
    } else if (responseData.data) {
      userData = responseData.data;
    } else if (responseData.id) {
      userData = responseData;
    } else {
      console.log('No user data found in response');
      return null;
    }
    
    return {
      id: userData.id || 0,
      name: userData.name || '',
      phone: userData.phone || null,
      mobile: userData.mobile || null,
      profile_url: userData.profile_url || null,
      reward_points: userData.reward_points || {
        total: 0,
        used: 0,
        expired: 0,
        available: 0
      }
    };
  };

  // 🔹 Restore user on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        console.log('🔄 Fetching user on mount...');
        console.log('📱 Browser is Safari?', isSafari());
        
        // Use the api instance which handles auth automatically
        const res = await api.get("/user");
        
        console.log('📥 User API response:', res.data);
        
        const userData = extractUserFromResponse(res.data);
        
        if (userData) {
          console.log('✅ Setting user in context:', userData);
          setUser(userData);
        } else {
          console.log('❌ No valid user data in response');
          setUser(null);
        }
      } catch (err) {
        console.error("Auth restore failed:", err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  // 🔹 Refresh user data
  const refreshUser = async (): Promise<void> => {
    console.log('🔄 refreshUser() called');
    
    try {
      const response = await api.get(`/user`);
      
      console.log('📥 Refresh API response:', response.data);
      
      const newUser = extractUserFromResponse(response.data);
      
      if (!newUser) {
        console.warn('⚠️ No user data in refresh response');
        setUser(null);
        return;
      }
      
      const updatedUser: User = {
        ...newUser,
        reward_points: { ...newUser.reward_points }
      };
      
      setUser(updatedUser);
      console.log('✅ User refreshed successfully');
      
      // Notify other components
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('userRefreshed', {
          detail: { 
            userId: updatedUser.id,
            timestamp: Date.now()
          }
        }));
      }
      
    } catch (error) {
      console.error('🔴 AuthContext: Failed to refresh user', error);
      setUser(null);
      throw error;
    }
  };

  // 🔹 Update user data
  const updateUser = (updates: Partial<User>) => {
    if (user) {
      const updatedUser = {
        ...user,
        ...updates
      };
      console.log('📝 Updating user context:', updatedUser);
      setUser(updatedUser);
    }
  };

  // 🔹 Login
  const login = async (phone: string, username: string) => {
    setLoading(true);
    try {
      const res = await api.post(
        "/login",
        { phone, name: username }
      );

      console.log('Login response:', res.data);
      
      if (res.data.success) {
        const userData = extractUserFromResponse(res.data);
        if (userData) {
          setUser(userData);
          
          // For Safari: Save token if returned
          if (isSafari() && res.data.token) {
            localStorage.setItem('auth_token', res.data.token);
            api.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
          }
          
          await refreshUser();
          router.push("/");
        } else {
          throw new Error("Invalid user data in response");
        }
      } else {
        throw new Error(res.data.message || "Login failed");
      }
    } catch (err) {
      console.error("Login error:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Logout
  const logout = async () => {
    try {
      await api.post("/logout");
      
      // Clean up Safari token
      if (isSafari()) {
        localStorage.removeItem('auth_token');
        delete api.defaults.headers.common['Authorization'];
      }
    } catch (error) {
      console.error("Logout error:", error);
    }
    
    setUser(null);
    router.push("/sign-in");
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
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