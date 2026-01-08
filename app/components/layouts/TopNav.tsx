"use client";
import React, { useEffect, useState, useCallback } from "react";
import Icon from "../Icon";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import SpinWheelPic from "@/../public/spin-the-wheel.png";
import Image from "next/image";

const TopNav = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [displayPoints, setDisplayPoints] = useState(0);
  const [location, setLocation] = useState<string>("Fetching location...");
  const [error, setError] = useState<string | null>(null);
  const { language, toggleLanguage, t } = useLanguage();

  // Function to get points - ALWAYS works
  const getPoints = useCallback(() => {
    // 1. First try localStorage
    const savedPoints = localStorage.getItem('current_points');
    if (savedPoints) {
      const points = parseInt(savedPoints, 10);
      if (!isNaN(points)) {
        return points;
      }
    }
    
    // 2. Fallback to server points
    return user?.reward_points?.available || 0;
  }, [user]);

  // Initialize and update points
  useEffect(() => {
    const points = getPoints();
    console.log('TopNav: Setting points to', points);
    setDisplayPoints(points);
  }, [user, getPoints]);

  // 🎯 LISTEN FOR UI UPDATES - MULTIPLE METHODS FOR RELIABILITY
  useEffect(() => {
    console.log('TopNav: Setting up reliable update listeners');
    
    // Method 1: Custom event (most reliable)
    const handleUpdatePoints = (event: any) => {
      const newPoints = event.detail?.points;
      if (newPoints !== undefined) {
        console.log('🎯 Event received! Updating points to:', newPoints);
        setDisplayPoints(newPoints);
        localStorage.setItem('current_points', newPoints.toString());
      }
    };
    
    // Method 2: Storage event (works across tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'current_points' && e.newValue) {
        const newPoints = parseInt(e.newValue, 10);
        if (!isNaN(newPoints) && newPoints !== displayPoints) {
          console.log('💾 Storage event! Updating points to:', newPoints);
          setDisplayPoints(newPoints);
        }
      }
    };
    
    // Method 3: Interval check (never fails)
    const checkForUpdates = () => {
      const savedPoints = localStorage.getItem('current_points');
      if (savedPoints) {
        const points = parseInt(savedPoints, 10);
        if (!isNaN(points) && points !== displayPoints) {
          console.log('⏰ Interval check! Updating points to:', points);
          setDisplayPoints(points);
        }
      }
    };
    
    const interval = setInterval(checkForUpdates, 500); // Check every 500ms
    
    // Add all listeners
    window.addEventListener('updatePointsDisplay', handleUpdatePoints);
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('updatePointsDisplay', handleUpdatePoints);
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [displayPoints]);

  // Force check on mount
  useEffect(() => {
    const points = getPoints();
    if (points !== displayPoints) {
      console.log('🔄 Force update on mount:', points);
      setDisplayPoints(points);
    }
  }, [getPoints, displayPoints]);

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
      <div className="flex flex-row justify-between items-center">
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

        {/* Points Display - ALWAYS updates */}
        <div
          key={`points-${displayPoints}`} // Key forces DOM update
          onClick={() => router.push("/account/reward")}
          className="p-2 flex flex-row items-center min-w-[75px] rounded-[10px] bg-gradient-to-r from-yellow-400 to-yellow-500 text-white shadow-md cursor-pointer hover:from-yellow-500 hover:to-yellow-600 transition"
        >
          <Icon
            className="text-white"
            icon="vaadin:database"
            width={20}
            height={20}
          />
          <p className="text-[16px] font-medium ml-1">
            {displayPoints.toLocaleString()}
          </p>
        </div>
      </div>

      {error && <p className="text-red-500 text-[12px]">{error}</p>}
    </section>
  );
};

export default TopNav;