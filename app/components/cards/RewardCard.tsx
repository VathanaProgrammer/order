"use client";

import React, { useState } from "react";
import Image from "next/image";
import { RewardProduct } from "../RewardSection";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { usePoints } from "@/context/PointsContext";
import { useLoading } from "@/context/LoadingContext";
import api from "@/api/api";
import { toast } from "react-toastify";

interface RewardCardProps {
  product: RewardProduct;
  onClaimSuccess?: () => void;
}

const RewardCard: React.FC<RewardCardProps> = ({ product, onClaimSuccess }) => {
  const { user, refreshUser } = useAuth();  // ← Get refreshUser
  const { t } = useLanguage();
  const { setLoading } = useLoading();
  const { updatePoints } = usePoints();

  const [isClaiming, setIsClaiming] = useState(false);

  const displayImage = product.image_url || "/img/default.png";

  // Safely get available points
  const getAvailablePoints = (): number => {
    if (!user?.reward_points) return 0;

    if (typeof user.reward_points === "number") {
      return user.reward_points;
    }

    if (typeof user.reward_points === "object" && user.reward_points !== null) {
      const points = user.reward_points as any;
      return points.available ?? points.total ?? 0;
    }

    return 0;
  };

  const availablePoints = getAvailablePoints();
  const requiredPoints = product.reward_points || 0;
  const hasEnoughPoints = availablePoints >= requiredPoints;
  const canClaim = user && hasEnoughPoints;

  const handleClaimReward = async () => {
    if (!user) {
      toast.error(t.loginRequired || "Please login first");
      return;
    }

    if (availablePoints < requiredPoints) {
      toast.error(t.insufficientPoints || "Insufficient points");
      return;
    }

    const isConfirmed = window.confirm(
      `${t.confirmClaimReward || "Claim"}: "${product.name}"?\n\n` +
      `${t.thisWillCost || "This will cost"}: ${requiredPoints} ${t.points || "points"}\n` +
      `${t.yourPoints || "Your points"}: ${availablePoints}`
    );

    if (!isConfirmed) return;

    setIsClaiming(true);
    setLoading(true);

    const newPoints = availablePoints - requiredPoints;

    // Instant optimistic update
    updatePoints(newPoints);

    try {
      const response = await api.post("/rewards/claim", {
        product_id: product.id,
      });

      if (response.data.status === "success") {
        const claimData = response.data.data;

        toast.success(
          <div className="space-y-2">
            <div className="font-bold text-green-600">
              ✅ {t.rewardClaimedSuccess || "Successfully claimed!"}
            </div>
            <div>
              <strong>{t.reward || "Reward"}:</strong> {claimData.product_name || product.name}
            </div>
            <div>
              <strong>{t.newPoints || "New points"}:</strong> {newPoints.toLocaleString()}
            </div>
          </div>,
          { autoClose: 8000 }
        );

        if (claimData.reward_code) {
          navigator.clipboard.writeText(claimData.reward_code);
          setTimeout(() => {
            toast.info(`📋 ${t.codeCopied || "Reward code copied to clipboard!"}`);
          }, 1000);
        }

        if (onClaimSuccess) onClaimSuccess();

        // Sync with server - eliminates need for manual refresh
        await refreshUser();

      } else {
        // Server rejected (unlikely if multiple claims allowed)
        updatePoints(availablePoints);
        toast.error(response.data.message || t.claimFailed || "Claim failed");
      }
    } catch (error: any) {
      // Network or server error → revert
      updatePoints(availablePoints);

      console.error("Claim error:", error);

      const message =
        error.response?.data?.message ||
        (error.response?.data?.errors
          ? Object.values(error.response.data.errors)[0]
          : null) ||
        t.claimFailed || "Failed to claim reward";

      toast.error(message);
    } finally {
      setIsClaiming(false);
      setLoading(false);
    }
  };

  const progressPercentage = requiredPoints > 0
    ? Math.min((availablePoints / requiredPoints) * 100, 100)
    : 0;

  const pointsNeeded = Math.max(0, requiredPoints - availablePoints);

  return (
    <div className="w-full rounded-xl bg-white border border-gray-200 shadow-md flex flex-col overflow-hidden transition-all hover:shadow-xl hover:border-blue-300">
      <div className="relative w-full h-44">
        <Image
          src={displayImage}
          alt={product.name || "Reward"}
          fill
          className="object-cover"
          unoptimized
          sizes="(max-width: 768px) 100vw"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/img/default.png";
          }}
        />
        <div className="absolute top-2 right-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center">
          <span className="mr-1">⭐</span>
          {requiredPoints.toLocaleString()}
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-bold text-gray-800 text-base mb-3 line-clamp-2 min-h-[3rem]">
          {product.name || "Reward Item"}
        </h3>

        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">
              {t.required || "Need"}:
              <span className="font-bold ml-1">{requiredPoints.toLocaleString()}</span>
            </span>
            <span className="text-gray-600">
              You have:
              <span className="font-bold ml-1 text-blue-600">{availablePoints.toLocaleString()}</span>
            </span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                hasEnoughPoints
                  ? "bg-gradient-to-r from-green-500 to-emerald-600"
                  : "bg-gradient-to-r from-red-500 to-orange-500"
              }`}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        <button
          onClick={handleClaimReward}
          disabled={isClaiming || !canClaim}
          className={`
            w-full py-3 px-4 rounded-lg font-bold text-sm transition-all
            ${isClaiming
              ? "bg-gray-400 cursor-not-allowed"
              : canClaim
              ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-md hover:shadow-lg active:scale-95"
              : !user
              ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md hover:shadow-lg"
              : "bg-gradient-to-r from-gray-300 to-gray-400 text-gray-600 cursor-not-allowed"
            }
            disabled:opacity-50 disabled:cursor-not-allowed
            flex items-center justify-center
          `}
        >
          {isClaiming ? (
            <>
              <svg className="animate-spin h-4 w-4 mr-2 text-white" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {t.claiming || "Processing..."}
            </>
          ) : !user ? (
            <>🔐 {t.loginRequired || "Login to Claim"}</>
          ) : !hasEnoughPoints ? (
            <>⚠️ {t.needMorePoints || `Need ${pointsNeeded} more`}</>
          ) : (
            <>🎁 {t.claimNow || "Claim Now"}</>
          )}
        </button>

        {user && (
          <div className={`mt-2 text-center text-xs font-medium ${hasEnoughPoints ? "text-green-600" : "text-red-600"}`}>
            {hasEnoughPoints ? (
              <div className="flex items-center justify-center">
                <span className="mr-1">✅</span>
                {t.readyToClaim || "Ready to claim!"}
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <span className="mr-1">❌</span>
                {t.insufficientPoints || "Insufficient points"}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RewardCard;