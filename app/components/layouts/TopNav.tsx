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
  const [updateCounter, setUpdateCounter] = useState(0); // Force updates
  const lastPointsRef = useRef(0);
  const [location, setLocation] = useState<string>("Fetching location...");
  const [error, setError] = useState<string | null>(null);
  const { language, toggleLanguage, t } = useLanguage();

  // Initialize points from server
  useEffect(() => {
    const points = user?.reward_points?.available || 0;
    console.log('TopNav: Initial points:', points);
    setDisplayPoints(points);
    lastPointsRef.current = points;
    if (typeof window !== 'undefined') {
      (window as any).__CURRENT_POINTS = points;
    }
  }, [user]);

  // 🎯 CRITICAL: Force update on ANY points change
  useEffect(() => {
    console.log('TopNav: Setting up force update system');
    
    const handleForceUpdate = (event: any) => {
      const newPoints = event.detail?.points;
      console.log('🎯 Force update event:', newPoints);
      
      if (newPoints !== undefined) {
        // Always update, even if same value
        setDisplayPoints(newPoints);
        
        // Force React to see this as a change
        setUpdateCounter(prev => {
          const newCounter = prev + 1;
          console.log('Update counter:', newCounter);
          return newCounter;
        });
        
        lastPointsRef.current = newPoints;
      }
    };
    
    const handleFinalUpdate = (event: any) => {
      const newPoints = event.detail?.points;
      if (newPoints !== undefined) {
        console.log('🏁 Final update:', newPoints);
        setDisplayPoints(newPoints);
        setUpdateCounter(prev => prev + 1);
      }
    };
    
    // Listen for both events
    window.addEventListener('forcePointsUpdate', handleForceUpdate);
    window.addEventListener('finalPointsUpdate', handleFinalUpdate);
    
    // 🎯 CRITICAL: Check global variable every 100ms
    const checkGlobalPoints = () => {
      if (typeof window !== 'undefined' && (window as any).__CURRENT_POINTS !== undefined) {
        const globalPoints = (window as any).__CURRENT_POINTS;
        if (globalPoints !== displayPoints) {
          console.log('🌍 Global variable changed:', globalPoints);
          setDisplayPoints(globalPoints);
          setUpdateCounter(prev => prev + 1);
        }
      }
    };
    
    const interval = setInterval(checkGlobalPoints, 100);
    
    return () => {
      window.removeEventListener('forcePointsUpdate', handleForceUpdate);
      window.removeEventListener('finalPointsUpdate', handleFinalUpdate);
      clearInterval(interval);
    };
  }, [displayPoints]);

  // Location handler
  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      setLocation("");
      return;
    }

    let mounted = true;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        if (!mounted) return;
        
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
          
          if (mounted) {
            setLocation(
              city && country ? `${city}, ${country}` : "Unknown location"
            );
          }
        } catch (err) {
          if (mounted) {
            setLocation(`Lat: ${latitude}, Lon: ${longitude}`);
          }
        }
      },
      (err) => {
        if (mounted) {
          setError(err.message);
          setLocation("");
        }
      }
    );

    return () => {
      mounted = false;
    };
  }, []);

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

  return (
    <section className="flex flex-col gap-2">
      <div className="flex flex-row justify-between items-center">
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
          key={`points-${displayPoints}-${updateCounter}`} // Counter ensures unique key
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