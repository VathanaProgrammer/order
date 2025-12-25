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
  image_url?: string | null;
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
        if (res.data.success) {
          setUser(res.data.user);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.log("Auth restore failed:", err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const refreshUser = async () => {
    try {
      const res = await api.get("/user", { withCredentials: true });
      if (res.data?.success) {
        setUser(res.data.user);
      }
    } catch {
      setUser(null);
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

      console.log('username: ', username);
      console.log("phone: ", phone);

      if (res.data.success) {
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
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser  }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be inside AuthProvider");
  return context;
};
