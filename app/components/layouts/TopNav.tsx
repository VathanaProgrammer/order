"use client";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import Icon from "lucide-react"
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import SpinWheelPic from "@/../public/spin-the-wheel.png";
import Image from "next/image";

const TopNav = () => {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [points, setPoints] = useState<number>(0);
  const [location, setLocation] = useState<string>("Fetching location...");
  const [error, setError] = useState<string | null>(null);
  const { language, toggleLanguage, t } = useLanguage();

  // MEMOIZED: Calculate points from user object
  const currentPoints = useMemo(() => {
    if (!user) return 0;
    
    console.log('TopNav: Calculating points from user:', user);
    
    if (typeof user.reward_points === 'number') {
      return user.reward_points;
    }
    
    if (user.reward_points && typeof user.reward_points === 'object') {
      return (user.reward_points as any).available || 
             (user.reward_points as any).total || 0;
    }
    
    return 0;
  }, [user]); // This will recompute ONLY when user changes

  // Force update when points change
  useEffect(() => {
    console.log('TopNav: Points changed to', currentPoints);
    setPoints(currentPoints);
  }, [currentPoints]);

  // Force refresh user data on mount
  useEffect(() => {
    console.log('TopNav: Mounted, refreshing user data');
    refreshUser();
  }, [refreshUser]);

  // Listen for real-time updates
  useEffect(() => {
    const handleUserUpdate = () => {
      console.log('TopNav: Manual refresh triggered');
      refreshUser();
    };

    // Multiple triggers
    window.addEventListener('userUpdated', handleUserUpdate);
    
    // Refresh when page becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshUser();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('userUpdated', handleUserUpdate);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshUser]);

  // Refresh every 2 seconds for debugging (remove in production)
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('TopNav: Auto-refreshing...');
      refreshUser();
    }, 2000);
    
    return () => clearInterval(interval);
  }, [refreshUser]);

  // ... rest of your handlers ...

  return (
    <section className="flex flex-col gap-2">
      {/* ... your existing header code ... */}

      <div className="flex flex-row justify-between items-center mt-2">
        {/* Location */}
        <div className="flex items-center gap-1">
          <Icon
            icon="mdi:map-marker-outline"
            width={18}
            height={18}
            className="text-gray-600"
          />
          <p className="text-[13px] font-medium text-gray-600">
            {t.yourCurrentLocationIs} {location}
          </p>
        </div>

        {/* Points display - Add key and ensure it updates */}
        <div
          key={`nav-points-${points}-${Date.now()}`} // Force DOM update
          onClick={() => {
            router.push("/account/reward");
            // Force refresh when navigating to rewards page
            setTimeout(() => refreshUser(), 100);
          }}
          className="p-2 flex flex-row items-center min-w-[75px] rounded-[10px] bg-gradient-to-r from-yellow-400 to-yellow-500 text-white shadow-md cursor-pointer hover:from-yellow-500 hover:to-yellow-600 transition"
        >
          <Icon
            className="text-white"
            icon="vaadin:database"
            width={20}
            height={20}
          >
            {/* Add animation when points change */}
            <animate
              attributeName="opacity"
              values="1;0.5;1"
              dur="0.5s"
              begin="indefinite"
              id="pointsAnimation"
            />
          </Icon>
          <p 
            key={`points-value-${points}`}
            className="text-[16px] font-medium ml-1 transition-all duration-300"
          >
            {points.toLocaleString()} {/* Format with commas */}
          </p>
        </div>
      </div>

      {error && <p className="text-red-500 text-[12px]">{error}</p>}
      
      {/* Debug info - remove in production */}
      <div className="text-xs text-gray-500 mt-1">
        Last update: {new Date().toLocaleTimeString()}
      </div>
    </section>
  );
};

export default TopNav;