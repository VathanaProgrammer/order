"use client";
import React, { useEffect, useState, useRef } from "react";
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
  const [forceUpdate, setForceUpdate] = useState(0); // Force update counter
  const lastUpdateRef = useRef<number>(0);
  const [location, setLocation] = useState<string>("Fetching location...");
  const [error, setError] = useState<string | null>(null);
  const { language, toggleLanguage, t } = useLanguage();

  // Initialize points from server
  useEffect(() => {
    const points = user?.reward_points?.available || 0;
    console.log('TopNav: Initial points from server:', points);
    setDisplayPoints(points);
    lastUpdateRef.current = points;
    localStorage.setItem('current_points', points.toString());
  }, [user]);

  // 🎯 LISTEN FOR ALL POSSIBLE UPDATE EVENTS
  useEffect(() => {
    console.log('TopNav: Setting up bulletproof update system');
    
    // Function to update points
    const updatePoints = (newPoints: number) => {
      console.log('🔄 Updating points to:', newPoints);
      setDisplayPoints(newPoints);
      setForceUpdate(prev => prev + 1); // Force re-render
      lastUpdateRef.current = newPoints;
    };
    
    // Event 1: Custom points display event
    const handleUpdatePoints = (event: any) => {
      const newPoints = event.detail?.points;
      if (newPoints !== undefined) {
        console.log('🎯 Custom event received:', newPoints);
        updatePoints(newPoints);
        localStorage.setItem('current_points', newPoints.toString());
      }
    };
    
    // Event 2: Generic claim success
    const handleClaimSuccess = () => {
      console.log('✅ Claim success event');
      // Read from localStorage
      const savedPoints = localStorage.getItem('current_points');
      if (savedPoints) {
        const points = parseInt(savedPoints, 10);
        if (!isNaN(points)) {
          updatePoints(points);
        }
      }
    };
    
    // Event 3: Points updated
    const handlePointsUpdated = () => {
      console.log('📊 Points updated event');
      const savedPoints = localStorage.getItem('current_points');
      if (savedPoints) {
        const points = parseInt(savedPoints, 10);
        if (!isNaN(points)) {
          updatePoints(points);
        }
      }
    };
    
    // Event 4: Final points update
    const handleFinalUpdate = (event: any) => {
      const newPoints = event.detail?.points;
      if (newPoints !== undefined) {
        console.log('🏁 Final update:', newPoints);
        updatePoints(newPoints);
      }
    };
    
    // Event 5: Storage event
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'current_points' && e.newValue) {
        const points = parseInt(e.newValue, 10);
        if (!isNaN(points)) {
          console.log('💾 Storage event:', points);
          updatePoints(points);
        }
      }
    };
    
    // Add ALL event listeners
    window.addEventListener('updatePointsDisplay', handleUpdatePoints);
    window.addEventListener('claimSuccess', handleClaimSuccess);
    window.addEventListener('pointsUpdated', handlePointsUpdated);
    window.addEventListener('finalPointsUpdate', handleFinalUpdate);
    window.addEventListener('storage', handleStorageChange);
    
    // 🎯 CRITICAL: Auto-check every 100ms (never fails)
    const interval = setInterval(() => {
      const savedPoints = localStorage.getItem('current_points');
      if (savedPoints) {
        const points = parseInt(savedPoints, 10);
        if (!isNaN(points) && points !== displayPoints) {
          console.log('⏰ Auto-check updating:', points);
          updatePoints(points);
        }
      }
      
      // Also force update every 5 seconds to catch any missed updates
      setForceUpdate(prev => prev + 1);
    }, 100);
    
    // Also check on page focus
    const handlePageFocus = () => {
      console.log('👀 Page focused, checking points');
      const savedPoints = localStorage.getItem('current_points');
      if (savedPoints) {
        const points = parseInt(savedPoints, 10);
        if (!isNaN(points)) {
          updatePoints(points);
        }
      }
    };
    
    window.addEventListener('focus', handlePageFocus);
    
    return () => {
      window.removeEventListener('updatePointsDisplay', handleUpdatePoints);
      window.removeEventListener('claimSuccess', handleClaimSuccess);
      window.removeEventListener('pointsUpdated', handlePointsUpdated);
      window.removeEventListener('finalPointsUpdate', handleFinalUpdate);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handlePageFocus);
      clearInterval(interval);
    };
  }, [displayPoints]);

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

        {/* 🎯 Points Display - ALWAYS UPDATES */}
        <div
          key={`points-${displayPoints}-${forceUpdate}-${Date.now()}-${Math.random()}`}
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