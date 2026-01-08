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
        console.log('=== DEBUG START ===');
        console.log('1. User:', user?.id);
        console.log('2. Available points:', availablePoints);
        console.log('3. Required points:', requiredPoints);
        
        if (!user) {
            console.log('ERROR: No user');
            alert("Please login first");
            return;
        }
        
        if (availablePoints < requiredPoints) {
            console.log('ERROR: Insufficient points');
            alert("Insufficient points");
            return;
        }
        
        console.log('4. Showing confirmation dialog...');
        const isConfirmed = window.confirm(
            `Claim "${product.name}"?\n\n` +
            `Cost: ${requiredPoints} points\n` +
            `Your points: ${availablePoints}`
        );
        
        console.log('5. User confirmed?', isConfirmed);
        
        if (!isConfirmed) {
            console.log('User cancelled');
            return;
        }
        
        setIsClaiming(true);
        setLoading(true);
        
        console.log('6. Making API call...');
        
        try {
            const response = await api.post('/rewards/claim', {
                product_id: product.id,
            });
        
            console.log('7. API Response status:', response.status);
            console.log('8. API Response data:', response.data);
            
            // Check what structure the response actually has
            console.log('9. Response keys:', Object.keys(response.data));
            
            // Try different success checks
            let isSuccess = false;
            let successMessage = '';
            
            if (response.data.status === "success") {
                isSuccess = true;
                successMessage = 'status === "success"';
            } else if (response.data.success === true) {
                isSuccess = true;
                successMessage = 'success === true';
            } else if (response.data.message && response.data.message.includes('success')) {
                isSuccess = true;
                successMessage = 'message contains success';
            }
            
            console.log('10. Is success?', isSuccess, 'Reason:', successMessage);
            
            if (isSuccess) {
                console.log('11. SUCCESS! Showing refresh dialog...');
                
                // Force show a simple alert first
                alert(`✅ API SUCCESS! Response: ${JSON.stringify(response.data)}`);
                
                // Then show refresh confirm
                const shouldRefresh = window.confirm(
                    `✅ Successfully claimed ${product.name}!\n\n` +
                    `Click OK to refresh the page.\n` +
                    `Click Cancel to continue without refreshing.`
                );
                
                console.log('12. Should refresh?', shouldRefresh);
                
                if (shouldRefresh) {
                    console.log('13. Reloading page...');
                    window.location.reload();
                } else {
                    console.log('13. User chose not to refresh');
                }
                
                return;
            } else {
                console.log('11. NOT SUCCESS - Response:', response.data);
                alert(`API did not return success. Response: ${JSON.stringify(response.data)}`);
            }
        } catch (error: any) {
            console.error('ERROR:', error);
            console.log('Error response:', error.response?.data);
            alert(`Failed to claim reward. Error: ${error.message}`);
        } finally {
            console.log('14. Finally block');
            setIsClaiming(false);
            setLoading(false);
        }
        
        console.log('15. Function end');
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