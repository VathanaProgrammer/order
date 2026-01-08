"use client";
import React, { useState } from "react";
import Image from "next/image";
import { RewardProduct } from "../RewardSection";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import api from "@/api/api";
import { toast } from "react-toastify";
import { useLoading } from "@/context/LoadingContext";
import Swal from 'sweetalert2';

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
            toast.info("Please login first");
            return;
        }
        
        if (availablePoints < requiredPoints) {
            toast.warning(`You need ${requiredPoints - availablePoints} more points`);
            return;
        }
        
        // Use SweetAlert2 for confirmation (mobile-friendly)
        const { value: isConfirmed } = await Swal.fire({
            title: `Claim "${product.name}"?`,
            html: `
                <div style="text-align: center;">
                    <div style="font-size: 16px; margin-bottom: 10px;">
                        <strong>Cost:</strong> ${requiredPoints} points<br>
                        <strong>Your points:</strong> ${availablePoints}
                    </div>
                    <div style="font-size: 14px; color: #666; margin-top: 10px;">
                        After claiming, your points will be deducted
                    </div>
                </div>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#10B981',
            cancelButtonColor: '#6B7280',
            confirmButtonText: 'Yes, claim it!',
            cancelButtonText: 'Cancel',
            reverseButtons: true,
            background: '#ffffff',
            backdrop: 'rgba(0,0,0,0.4)',
            showClass: {
                popup: 'animate__animated animate__fadeInDown animate__faster'
            },
            hideClass: {
                popup: 'animate__animated animate__fadeOutUp animate__faster'
            }
        });
        
        if (!isConfirmed) {
            return;
        }
        
        setIsClaiming(true);
        setLoading(true);
        
        try {
            const response = await api.post('/rewards/claim', {
                product_id: product.id,
            });
        
            // Check for success
            const isSuccess = response.data.status === "success" || 
                            response.data.success === true ||
                            (response.data.message && response.data.message.includes('success'));
            
            if (isSuccess) {
                toast.success(`Successfully claimed ${product.name}!`);
                
                // SweetAlert2 for refresh confirmation
                setTimeout(async () => {
                    const { value: shouldRefresh } = await Swal.fire({
                        title: 'Success! 🎉',
                        html: `
                            <div style="text-align: center;">
                                <div style="font-size: 48px; margin-bottom: 10px;">✅</div>
                                <div style="font-size: 16px; margin-bottom: 15px;">
                                    You claimed <strong>${product.name}</strong>
                                </div>
                                <div style="font-size: 14px; color: #666;">
                                    Your points have been updated
                                </div>
                            </div>
                        `,
                        icon: 'success',
                        showCancelButton: true,
                        confirmButtonColor: '#10B981',
                        cancelButtonColor: '#3B82F6',
                        confirmButtonText: 'Refresh Page',
                        cancelButtonText: 'Continue Browsing',
                        reverseButtons: true,
                        background: '#ffffff',
                        backdrop: 'rgba(0,0,0,0.4)',
                        showClass: {
                            popup: 'animate__animated animate__fadeInDown animate__faster'
                        },
                        hideClass: {
                            popup: 'animate__animated animate__fadeOutUp animate__faster'
                        }
                    });
                    
                    if (shouldRefresh) {
                        window.location.reload();
                    } else if (onClaimSuccess) {
                        onClaimSuccess(); // Callback to update parent state
                    }
                }, 1000); // Small delay for better UX
                
            } else {
                toast.error("Failed to claim reward. Please try again.");
            }
        } catch (error: any) {
            console.error('Claim error:', error);
            const errorMessage = error.response?.data?.message || error.message || "Unknown error";
            
            // SweetAlert2 for error
            Swal.fire({
                title: 'Claim Failed',
                text: errorMessage,
                icon: 'error',
                confirmButtonColor: '#EF4444',
                confirmButtonText: 'OK',
                background: '#ffffff',
                backdrop: 'rgba(0,0,0,0.4)',
                showClass: {
                    popup: 'animate__animated animate__shakeX animate__faster'
                }
            });
        } finally {
            setIsClaiming(false);
            setLoading(false);
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