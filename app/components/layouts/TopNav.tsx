"use client";
import React, { useEffect, useState } from "react";
import Icon from "../Icon";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import SpinWheelPic from "@/../public/spin-the-wheel.png";
import Image from "next/image";

const TopNav = () => {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [points, setPoints] = useState(0);
  const [location, setLocation] = useState<string>("Fetching location...");
  const [error, setError] = useState<string | null>(null);
  const { language, toggleLanguage, t } = useLanguage();

  // Initialize points
  useEffect(() => {
    const currentPoints = getAvailablePoints(user);
    console.log('TopNav: Initial points set to', currentPoints);
    setPoints(currentPoints);
  }, [user]);

  // Helper function to get points
  const getAvailablePoints = (userObj: any) => {
    if (!userObj) return 0;
    
    if (typeof userObj.reward_points === 'number') {
      return userObj.reward_points;
    }
    
    if (userObj.reward_points && typeof userObj.reward_points === 'object') {
      return userObj.reward_points.available || userObj.reward_points.total || 0;
    }
    
    return 0;
  };

  // Debug: Log user data changes
  useEffect(() => {
    console.log('TopNav - User updated:', user);
    const currentPoints = getAvailablePoints(user);
    console.log('TopNav - Points:', currentPoints);
  }, [user]);

  // Listen for ALL update events
  useEffect(() => {
    const handlePointsUpdated = () => {
      console.log('TopNav: Points update event received, refreshing...');
      refreshUser();
      
      // Force update points from current user
      setTimeout(() => {
        const currentPoints = getAvailablePoints(user);
        console.log('TopNav: Updating points to', currentPoints);
        setPoints(currentPoints);
      }, 100);
    };
    
    // Listen for multiple event types
    window.addEventListener('userPointsUpdated', handlePointsUpdated);
    window.addEventListener('userUpdated', handlePointsUpdated);
    window.addEventListener('storage', handlePointsUpdated);
    
    // Also listen for page focus
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('TopNav: Page visible, refreshing...');
        refreshUser();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Force initial refresh
    refreshUser();
    
    return () => {
      window.removeEventListener('userPointsUpdated', handlePointsUpdated);
      window.removeEventListener('userUpdated', handlePointsUpdated);
      window.removeEventListener('storage', handlePointsUpdated);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshUser, user]);

  // Auto-refresh periodically (every 10 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('TopNav: Periodic refresh');
      refreshUser();
    }, 10000);
    
    return () => clearInterval(interval);
  }, [refreshUser]);

  const handleProfileClick = () => {
    if (user) {
      router.push("/account");
    } else {
      router.push("/sign-in");
    }
  };

  const handleWheelClick = () => {
    if (user) {
      router.push("/wheel");
    } else {
      router.push("/sign-in");
    }
  };

  useEffect(() => {
    if (!navigator.geolocation) {
      setTimeout(() => {
        setError("Geolocation is not supported by your browser");
        setLocation("");
      }, 0);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await res.json();
          const city =
            data.address.city ||
            data.address.town ||
            data.address.village ||
            "";
          const country = data.address.country || "";
          setLocation(
            city && country ? `${city}, ${country}` : "Unknown location"
          );
        } catch (err) {
          setLocation(`Lat: ${latitude}, Lon: ${longitude}`);
        }
      },
      (err) => {
        setError(err.message);
        setLocation("");
      }
    );
  }, []);

  return (
    <section className="flex flex-col gap-2">
      <div key={`points-${points}`} className="flex flex-row justify-between items-center">
        {/* Logo */}
        <h1 className="text-[32px] font-bold main-text">SOB</h1>

        <div className="flex flex-row gap-2">
          <button
            type="button"
            onClick={handleWheelClick}
            className="p-2 flex items-center rounded-[10px] cursor-pointer transition"
          >
            <Image src={SpinWheelPic} alt="wheel" width={40} height={40} />
          </button>
          
          {/* Language Toggle Button */}
          <button
            type="button"
            onClick={toggleLanguage}
            className="p-2 flex items-center rounded-[10px] border border-gray-300 cursor-pointer hover:bg-gray-100 transition"
          >
            {language === "en" ? "ភាសាខ្មែរ" : "English"}
          </button>
          
          <div
            onClick={handleProfileClick}
            className="p-2 flex items-center rounded-[10px] border border-gray-300 cursor-pointer hover:bg-gray-100 transition"
          >
            <Icon
              className="text-gray-500"
              icon="mdi:account"
              width={26}
              height={26}
            />
          </div>
        </div>
      </div>

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

        {/* Points Display - Use points state instead of user.reward_points */}
        <div
          key={`points-display-${points}`}
          onClick={() => {
            router.push("/account/reward");
            // Refresh when navigating to rewards page
            setTimeout(() => refreshUser(), 100);
          }}
          className="p-2 flex flex-row items-center min-w-[75px] rounded-[10px] bg-gradient-to-r from-yellow-400 to-yellow-500 text-white shadow-md cursor-pointer hover:from-yellow-500 hover:to-yellow-600 transition"
        >
          <Icon
            className="text-white"
            icon="vaadin:database"
            width={20}
            height={20}
          />
          <p className="text-[16px] font-medium ml-1">{points}</p>
        </div>
      </div>

      {error && <p className="text-red-500 text-[12px]">{error}</p>}
      
      {/* Debug info (remove in production) */}
      <div className="text-xs text-gray-400">
        Last update: {new Date().toLocaleTimeString()} | Points: {points}
      </div>
    </section>
  );
};

export default TopNav;