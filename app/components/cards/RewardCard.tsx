"use client";
import React, { useState } from "react";
import Image from "next/image";
import { RewardProduct } from "../RewardSection";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import api from "@/api/api";
import { toast } from "react-toastify";
import { useLoading } from "@/context/LoadingContext";

interface RewardCardProps {
    product: RewardProduct;
    onClaimSuccess?: () => void;
}

const RewardCard: React.FC<RewardCardProps> = ({ product, onClaimSuccess }) => {
    const { user } = useAuth();
    const { t } = useLanguage();
    const { setLoading } = useLoading();
    const [isClaiming, setIsClaiming] = useState(false);
    
    const displayImage = product.image_url || "/img/default.png";

    // Helper function to get available points from user object
    const getAvailablePoints = () => {
        if (!user || !user.reward_points) return 0;
        
        if (typeof user.reward_points === 'number') {
            return user.reward_points;
        }
        
        if (typeof user.reward_points === 'object' && user.reward_points !== null) {
            const points = user.reward_points as any;
            return points.available || points.total || 0;
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
    
        try {
            const response = await api.post('/rewards/claim', {
                product_id: product.id,
            });
    
            if (response.data.status === "success") {
                const claimData = response.data.data;
                
                // Create a simple alert with refresh button
                const userConfirmed = window.confirm(
                    `✅ Successfully claimed ${product.name}!\n\n` +
                    `Click OK to refresh the page and see your updated points.`
                );
                
                if (userConfirmed) {
                    window.location.reload();
                }
                
                return;
            }
        } catch (error: any) {
            console.error('Error claiming reward:', error);
            
            if (error.response?.data?.errors) {
                const errors = error.response.data.errors;
                const firstError = Object.values(errors)[0];
                toast.error(Array.isArray(firstError) ? firstError[0] : firstError);
            } else if (error.response?.data?.message) {
                toast.error(error.response.data.message);
            } else {
                toast.error(t.claimFailed || "Failed to claim reward");
            }
        } finally {
            setIsClaiming(false);
            setLoading(false);
        }
    };
    
    // 🎯 CUSTOM ALERT FUNCTION
    const showRefreshAlert = (title: string, message: string, rewardCode?: string) => {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
        overlay.style.zIndex = '9999';
        overlay.style.display = 'flex';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        
        // Create alert box
        const alertBox = document.createElement('div');
        alertBox.style.backgroundColor = 'white';
        alertBox.style.padding = '24px';
        alertBox.style.borderRadius = '12px';
        alertBox.style.boxShadow = '0 10px 25px rgba(0,0,0,0.3)';
        alertBox.style.maxWidth = '400px';
        alertBox.style.width = '90%';
        
        // Add content
        alertBox.innerHTML = `
            <div style="text-align: center;">
                <div style="font-size: 24px; margin-bottom: 8px;">🎉</div>
                <h3 style="margin: 0 0 12px 0; color: #10b981; font-weight: bold;">${title}</h3>
                <p style="margin: 0 0 16px 0; color: #4b5563;">${message}</p>
                
                ${rewardCode ? `
                    <div style="background: #f3f4f6; padding: 12px; border-radius: 8px; margin-bottom: 16px;">
                        <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">Reward Code:</div>
                        <div style="font-family: monospace; font-size: 16px; font-weight: bold; color: #059669;">${rewardCode}</div>
                        <div style="font-size: 11px; color: #9ca3af; margin-top: 4px;">Copied to clipboard</div>
                    </div>
                ` : ''}
                
                <button id="refreshBtn" style="
                    background: linear-gradient(to right, #3b82f6, #1d4ed8);
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    font-weight: bold;
                    font-size: 16px;
                    cursor: pointer;
                    width: 100%;
                    margin-top: 8px;
                    transition: all 0.2s;
                " onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
                    🔄 Refresh Page to Update Points
                </button>
                
                <div style="margin-top: 12px; font-size: 12px; color: #9ca3af;">
                    Points will update after refresh
                </div>
            </div>
        `;
        
        // Add to page
        overlay.appendChild(alertBox);
        document.body.appendChild(overlay);
        
        // Add click handler for refresh button
        setTimeout(() => {
            const refreshBtn = document.getElementById('refreshBtn');
            if (refreshBtn) {
                refreshBtn.onclick = () => {
                    console.log('Refresh button clicked');
                    window.location.reload();
                };
                
                // Auto-click after 5 seconds
                setTimeout(() => {
                    refreshBtn.click();
                }, 5000);
            }
        }, 100);
        
        // Copy reward code if exists
        if (rewardCode) {
            navigator.clipboard.writeText(rewardCode);
        }
    };

    // Calculate progress percentage
    const progressPercentage = requiredPoints > 0 
        ? Math.min((availablePoints / requiredPoints) * 100, 100)
        : 0;
    
    const pointsNeeded = Math.max(0, requiredPoints - availablePoints);

    return (
        <div className="w-full rounded-xl bg-white border border-gray-200 shadow-md flex flex-col overflow-hidden transition-all hover:shadow-xl hover:border-blue-300">
            {/* Product Image */}
            <div className="relative w-full h-44">
                <Image
                    src={displayImage}
                    alt={product.name || "Reward product"}
                    fill
                    className="object-cover"
                    unoptimized
                    sizes="(max-width: 768px) 100vw"
                    onError={(e) => {
                        (e.target as HTMLImageElement).src = "/img/default.png";
                    }}
                />
                
                {/* Points Badge */}
                <div className="absolute top-2 right-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center">
                    <span className="mr-1">⭐</span>
                    {requiredPoints}
                </div>
            </div>

            {/* Product Info */}
            <div className="p-4 flex flex-col flex-1">
                <h3 className="font-bold text-gray-800 text-base mb-3 line-clamp-2 min-h-[3rem]">
                    {product.name || "Reward Item"}
                </h3>

                {/* Points Progress Bar */}
                <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">
                            {t.required || "Need"}:
                            <span className="font-bold ml-1">{requiredPoints}</span>
                        </span>
                        <span className="text-gray-600">
                            You have:
                            <span className="font-bold ml-1 text-blue-600">{availablePoints}</span>
                        </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                                hasEnoughPoints 
                                    ? 'bg-gradient-to-r from-green-500 to-emerald-600' 
                                    : 'bg-gradient-to-r from-red-500 to-orange-500'
                            }`}
                            style={{ 
                                width: `${progressPercentage}%` 
                            }}
                        />
                    </div>
                </div>

                {/* Claim Button */}
                <button
                    onClick={handleClaimReward}
                    disabled={isClaiming || !canClaim}
                    className={`
                        w-full py-3 px-4 rounded-lg font-bold text-sm transition-all
                        ${isClaiming
                            ? 'bg-gray-400 cursor-not-allowed'
                            : canClaim
                                ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-md hover:shadow-lg active:scale-95'
                                : !user
                                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md hover:shadow-lg'
                                    : 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-600 cursor-not-allowed'
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
                        <>
                            🔐 {t.loginRequired || "Login to Claim"}
                        </>
                    ) : !hasEnoughPoints ? (
                        <>
                            ⚠️ {t.needMorePoints || `Need ${pointsNeeded} more`}
                        </>
                    ) : (
                        <>
                            🎁 {t.claimNow || "Claim Now"}
                        </>
                    )}
                </button>

                {/* Status Message */}
                {user && (
                    <div className={`mt-2 text-center text-xs font-medium ${
                        hasEnoughPoints ? 'text-green-600' : 'text-red-600'
                    }`}>
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