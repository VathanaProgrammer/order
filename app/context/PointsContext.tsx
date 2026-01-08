// src/context/PointsContext.tsx
"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";

interface PointsContextType {
  points: number;
  updatePoints: (newPoints: number) => void;
}

const PointsContext = createContext<PointsContextType>({
  points: 0,
  updatePoints: () => {},
});

export const PointsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [points, setPoints] = useState<number>(0);

  useEffect(() => {
    let availablePoints = 0;

    if (user?.reward_points) {
      if (typeof user.reward_points === "number") {
        availablePoints = user.reward_points;
      } else if (typeof user.reward_points === "object" && "available" in user.reward_points) {
        availablePoints = user.reward_points.available;
      }
      // You can add fallback to .total if needed:
      // else if ("total" in user.reward_points) {
      //   availablePoints = user.reward_points.total;
      // }
    }

    setPoints(availablePoints);
  }, [user]);

  const updatePoints = (newPoints: number) => {
    setPoints(newPoints);
  };

  return (
    <PointsContext.Provider value={{ points, updatePoints }}>
      {children}
    </PointsContext.Provider>
  );
};

export const usePoints = () => useContext(PointsContext);