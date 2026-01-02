"use client";
import {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from "react";
import api from "@/api/api";
import { useRouter } from "next/navigation";

interface User {
  id: number;
  name: string;
  phone?: string | null;
  mobile?: string | null;
  profile_url?: string | null; // ✅ Use profile_url (backend field name)
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

  // 🔹 Restore user from cookie on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get("/user", { withCredentials: true });
        console.log('📥 User API response:', res.data);
        console.log('🔍 /api/user response after refresh:', res.data);
      console.log('🔍 Profile URL in API response:', res.data.user?.profile_url);
        
        if (res.data.success && res.data.user) {
          // ✅ Use the EXACT data from backend (no mapping needed)
          setUser(res.data.user);
          console.log('✅ User set in context:', res.data.user);
        } else {
          console.log('❌ No user data in response');
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

  const refreshUser = async () => {
    try {
      console.log('🔄 Refreshing user data...');
      const res = await api.get("/user", { withCredentials: true });
      console.log('🔄 Refresh response:', res.data);
      
      if (res.data?.success && res.data.user) {
        setUser(res.data.user);
        console.log('✅ User refreshed:', res.data.user);
        return res.data.user;
      } else {
        console.log('❌ Refresh failed: No user data');
        setUser(null);
        return null;
      }
    } catch (error) {
      console.error('❌ Refresh error:', error);
      setUser(null);
      return null;
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

  // 🔹 Login and set cookie
  const login = async (phone: string, username: string) => {
    setLoading(true);
    try {
      const res = await api.post(
        "/login",
        { phone, name: username },
        { withCredentials: true }
      );

      if (res.data.success && res.data.user) {
        setUser(res.data.user);
        await refreshUser();
        router.push("/");
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
      await api.post("/logout", {}, { withCredentials: true });
    } catch { }
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