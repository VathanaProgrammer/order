"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

interface SalesUser {
  id: number;
  email: string;
  username: string;
  name: string;
  phone: string;
  role: string;
  business_id: number;
  profile_url?: string;
  token?: string;
  roles: string[];
}

interface SalesAuthContextType {
  salesUser: SalesUser | null;
  salesLoading: boolean;
  salesLogin: (email: string, password: string) => Promise<void>;
  salesLogout: () => Promise<void>;
  updateSalesUser: (userData: Partial<SalesUser>) => void;
  isSalesAuthenticated: boolean;
  refreshSalesUser: () => Promise<void>;
}

const SalesAuthContext = createContext<SalesAuthContextType | undefined>(undefined);

export const useSalesAuth = () => {
  const context = useContext(SalesAuthContext);
  if (!context) {
    throw new Error("useSalesAuth must be used within a SalesAuthProvider");
  }
  return context;
};

interface SalesAuthProviderProps {
  children: ReactNode;
}

export const SalesAuthProvider: React.FC<SalesAuthProviderProps> = ({ children }) => {
  const [salesUser, setSalesUser] = useState<SalesUser | null>(null);
  const [salesLoading, setSalesLoading] = useState(true);
  const router = useRouter();

  // Initialize from localStorage
  useEffect(() => {
    const initializeAuth = () => {
      try {
        const storedSalesUser = localStorage.getItem("sales_user");
        const storedToken = localStorage.getItem("sales_token");
        
        if (storedSalesUser && storedToken) {
          const parsedUser = JSON.parse(storedSalesUser);
          setSalesUser(parsedUser);
          
          // Set axios default header with Bearer token
          axios.defaults.headers.common["Authorization"] = `Bearer ${storedToken}`;
        }
      } catch (error) {
        console.error("Error initializing sales auth:", error);
        localStorage.removeItem("sales_user");
        localStorage.removeItem("sales_token");
      } finally {
        setSalesLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const salesLogin = async (email: string, password: string) => {
    setSalesLoading(true);
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/delivery/login`,
        { 
          email, 
          password,
          role: 'sales'
        }
      );

      if (response.data.success) {
        const userData = response.data.user;
        const token = response.data.token || response.headers['set-cookie']?.[0]?.split('=')[1]?.split(';')[0];
        
        const salesUserData: SalesUser = {
          id: userData.id,
          email: userData.email || userData.username,
          username: userData.username,
          name: getUserName(userData),
          phone: userData.contact_number || userData.phone || '',
          role: 'sales',
          business_id: userData.business_id,
          profile_url: getProfileUrl(userData),
          roles: response.data.roles || ['sales'],
          token: token
        };

        // Save to state
        setSalesUser(salesUserData);
        
        // Save to localStorage
        localStorage.setItem("sales_user", JSON.stringify(salesUserData));
        if (token) {
          localStorage.setItem("sales_token", token);
        }
        
        // Set axios default header for future requests
        if (token) {
          axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        }

        toast.success("Sales login successful!");
        
        router.push("/");
      } else {
        throw new Error(response.data.msg || "Login failed");
      }
    } catch (error: any) {
      console.error("Sales login error:", error);
      
      let errorMessage = "Login failed. Please try again.";
      
      if (error.response) {
        if (error.response.status === 401) {
          errorMessage = error.response.data?.msg || "Invalid email or password";
        } else if (error.response.status === 403) {
          errorMessage = error.response.data?.msg || "Access denied. Sales account required.";
        } else if (error.response.data?.msg) {
          errorMessage = error.response.data.msg;
        } else if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.request) {
        errorMessage = "Network error. Please check your connection.";
      }
      
      toast.error(errorMessage);
      throw error;
    } finally {
      setSalesLoading(false);
    }
  };

  const refreshSalesUser = async () => {
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/delivery/profile`);
      
      if (response.data.success) {
        const userData = response.data.user;
        
        const updatedUser: SalesUser = {
          id: userData.id,
          email: userData.email || userData.username,
          username: userData.username,
          name: getUserName(userData),
          phone: userData.contact_number || userData.phone || '',
          role: 'sales',
          business_id: userData.business_id,
          profile_url: getProfileUrl(userData),
          roles: response.data.roles || ['sales'],
          token: salesUser?.token // Keep existing token
        };

        setSalesUser(updatedUser);
        localStorage.setItem("sales_user", JSON.stringify(updatedUser));
        
        toast.success("Profile updated!");
      }
    } catch (error) {
      console.error("Error refreshing sales user:", error);
      // If refresh fails, log out
      await salesLogout();
    }
  };

  const salesLogout = async () => {
    try {
      // Call logout API
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/delivery/logout`);
    } catch (err) {
      console.error("Logout API error:", err);
    } finally {
      // Clear state
      setSalesUser(null);
      
      // Clear localStorage
      localStorage.removeItem("sales_user");
      localStorage.removeItem("sales_token");
      
      // Clear axios header
      delete axios.defaults.headers.common["Authorization"];
      
      toast.success("Sales logged out successfully!");
      
      // Redirect to sales login page
      router.push("/sales/login");
    }
  };

  const updateSalesUser = (userData: Partial<SalesUser>) => {
    if (salesUser) {
      const updatedUser = { ...salesUser, ...userData };
      setSalesUser(updatedUser);
      localStorage.setItem("sales_user", JSON.stringify(updatedUser));
    }
  };

  const isSalesAuthenticated = !!salesUser && !!salesUser.token;

  // Helper function to get user name
  const getUserName = (userData: any): string => {
    if (userData.first_name && userData.surname) {
      return `${userData.surname} ${userData.first_name}`;
    } else if (userData.first_name) {
      return userData.first_name;
    } else if (userData.username) {
      return userData.username;
    } else if (userData.name) {
      return userData.name;
    }
    return "Sales User";
  };

  // Helper function to get profile URL
  const getProfileUrl = (userData: any): string | undefined => {
    if (userData.profile_url) {
      return userData.profile_url;
    } else if (userData.image_url) {
      return userData.image_url;
    }
    return undefined;
  };

  return (
    <SalesAuthContext.Provider
      value={{
        salesUser,
        salesLoading,
        salesLogin,
        salesLogout,
        updateSalesUser,
        isSalesAuthenticated,
        refreshSalesUser,
      }}
    >
      {children}
    </SalesAuthContext.Provider>
  );
};