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
  const [localPoints, setLocalPoints] = useState(0);
  const [location, setLocation] = useState<string>("Fetching location...");
  const [error, setError] = useState<string | null>(null);
  const { language, toggleLanguage, t } = useLanguage();

  // Initialize points from user context
  useEffect(() => {
    const points = user?.reward_points?.available || 0;
    console.log('TopNav: Initializing points from user context:', points);
    setLocalPoints(points);
  }, [user]);

  // 🎯 LISTEN FOR MANUAL UI UPDATES FROM REWARDCARD
  useEffect(() => {
    console.log('TopNav: Setting up UI update listeners');
    
    const handlePointsManuallyUpdated = (event: any) => {
      const newPoints = event.detail?.newPoints;
      if (newPoints !== undefined) {
        console.log('🎯 TopNav: Manual UI update received!');
        console.log('Current points:', localPoints);
        console.log('New points from event:', newPoints);
        setLocalPoints(newPoints);
        
        // Store in localStorage for persistence
        localStorage.setItem('current_points', newPoints.toString());
        localStorage.setItem('last_ui_update', Date.now().toString());
      }
    };
    
    const handleForceUIRefresh = () => {
      console.log('💥 TopNav: Force UI refresh event received');
      // Check localStorage for expected points
      const storedPoints = localStorage.getItem('expected_points');
      if (storedPoints) {
        const newPoints = parseInt(storedPoints, 10);
        if (!isNaN(newPoints) && newPoints !== localPoints) {
          console.log('💥 Setting points from localStorage:', newPoints);
          setLocalPoints(newPoints);
        }
      }
    };
    
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'expected_points' && e.newValue) {
        const newPoints = parseInt(e.newValue, 10);
        if (!isNaN(newPoints)) {
          console.log('💾 TopNav: Storage event - new points:', newPoints);
          setLocalPoints(newPoints);
        }
      }
    };
    
    // Listen for events
    window.addEventListener('pointsManuallyUpdated', handlePointsManuallyUpdated);
    window.addEventListener('forceUIRefresh', handleForceUIRefresh);
    window.addEventListener('storage', handleStorageChange);
    
    // Check for stored points on mount
    const storedPoints = localStorage.getItem('expected_points');
    if (storedPoints) {
      const points = parseInt(storedPoints, 10);
      if (!isNaN(points)) {
        console.log('📦 Restoring points from localStorage:', points);
        setLocalPoints(points);
      }
    }
    
    return () => {
      window.removeEventListener('pointsManuallyUpdated', handlePointsManuallyUpdated);
      window.removeEventListener('forceUIRefresh', handleForceUIRefresh);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [localPoints]);

  // Sync localPoints with server periodically (optional)
  useEffect(() => {
    const interval = setInterval(() => {
      // Refresh from server every 30 seconds to stay in sync
      refreshUser();
    }, 30000);
    
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

        {/* Points Display - Shows localPoints from UI updates */}
        <div
          key={`nav-points-${localPoints}-${Date.now()}`} // Key forces DOM update when points change
          onClick={() => {
            router.push("/account/reward");
            // Optional: Refresh server data when navigating to rewards page
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
          <p className="text-[16px] font-medium ml-1">
            {localPoints.toLocaleString()}
          </p>
        </div>
      </div>

      {error && <p className="text-red-500 text-[12px]">{error}</p>}
      
      {/* Debug info - remove in production by deleting this div */}
      <div className="text-xs text-gray-400 mt-1 px-1">
        <div className="flex justify-between">
          <span>UI Points: {localPoints.toLocaleString()}</span>
          <span>Server Points: {user?.reward_points?.available?.toLocaleString() || 0}</span>
        </div>
        <div className="flex justify-between mt-1">
          <span>Match: {localPoints === (user?.reward_points?.available || 0) ? '✅' : '❌'}</span>
          <button 
            onClick={() => {
              console.log('Manual sync clicked');
              refreshUser();
            }}
            className="text-blue-500 hover:underline"
          >
            Sync Now
          </button>
        </div>
      </div>
    </section>
  );
};

export default TopNav;