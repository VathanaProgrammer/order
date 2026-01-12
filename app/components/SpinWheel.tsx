"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import confetti from "canvas-confetti";
import api from "@/api/api";
import { useAuth } from "@/context/AuthContext";
import { usePoints } from "@/context/PointsContext";

interface WheelSegment {
  id: number;
  label: string;
  color: string;
  type: string;
  display_name: string;
  icon?: string;
  probability?: number;
  originalData?: any;
}

const SPIN_DURATION = 5000;
const ROTATIONS = 5;

// Button component
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };

export const SpinWheel = () => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const [segments, setSegments] = useState<WheelSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [pointsPerSpin, setPointsPerSpin] = useState<number | null>(null); // Will be fetched from backend
  const [canSpin, setCanSpin] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const wheelRef = useRef<HTMLDivElement>(null);
  
  const { points, updatePoints } = usePoints();
  const { user, refreshUser } = useAuth();
  
  // Get the database user ID
  const userId = user?.id || null;

  // Fetch spin wheel data (segments and points per spin) from Laravel API
  const fetchSpinData = useCallback(async () => {
    try {
      setLoading(true);
      setFetchError(null);
      console.log('Fetching spin wheel data...');
      
      // Fetch data from backend - this endpoint should return both segments and points_per_spin
      const response = await api.get("/spin-wheel/active-segments");
      
      console.log('Spin wheel API response:', response.data);
      
      if (response.data.success) {
        // Set points per spin from backend (set by admin)
        setPointsPerSpin(response.data.points_per_spin);
        
        if (response.data.segments?.length > 0) {
          // Map Laravel data to React component format
          const mappedSegments = response.data.segments.map((segment: any) => ({
            id: segment.id,
            label: `${segment.icon || ''} ${segment.display_name}`.trim(),
            color: segment.color || getRandomColor(),
            type: segment.type,
            display_name: segment.display_name,
            icon: segment.icon,
            probability: segment.probability || 0,
            originalData: segment
          }));
          setSegments(mappedSegments);
        } else {
          console.warn('No active segments found');
          setFetchError('No active wheel segments configured. Please contact admin.');
        }
      } else {
        setFetchError(response.data.message || 'Failed to load spin wheel data');
      }
    } catch (error: any) {
      console.error('Error fetching spin wheel data:', error);
      setFetchError('Failed to connect to server. Please try again.');
      
      // Fallback: Try alternative endpoint
      try {
        const fallbackResponse = await api.get("/spin/segments");
        if (fallbackResponse.data?.segments) {
          const mappedSegments = fallbackResponse.data.segments.map((segment: any) => ({
            id: segment.id,
            label: `${segment.icon || ''} ${segment.name || segment.display_name}`.trim(),
            color: segment.color || getRandomColor(),
            type: segment.type || 'none',
            display_name: segment.display_name || segment.name,
            icon: segment.icon,
            originalData: segment
          }));
          setSegments(mappedSegments);
          setPointsPerSpin(fallbackResponse.data.points_per_spin || 5);
        }
      } catch (fallbackError) {
        console.error('Fallback fetch also failed:', fallbackError);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSpinData();
  }, [fetchSpinData]);

  // Check if user can spin
  const checkSpinEligibility = useCallback(async () => {
    if (!userId || pointsPerSpin === null) {
      console.log('User ID or points per spin not found');
      return;
    }
    
    try {
      const response = await api.get("/spin/check-eligibility", {
        params: { user_id: userId }
      });
      
      if (response.data.success) {
        setCanSpin(response.data.can_spin);
        
        if (!response.data.can_spin) {
          console.log('Cannot spin:', response.data);
        }
      }
    } catch (error) {
      console.error('Error checking eligibility:', error);
      // If endpoint doesn't exist or fails, check based on points
      if (points !== undefined && pointsPerSpin !== null) {
        setCanSpin(points >= pointsPerSpin);
      }
    }
  }, [userId, points, pointsPerSpin]);

  // Check eligibility when userId or pointsPerSpin changes
  useEffect(() => {
    if (userId && pointsPerSpin !== null) {
      checkSpinEligibility();
    }
  }, [userId, pointsPerSpin, checkSpinEligibility]);

  const getRandomColor = () => {
    const hues = [340, 174, 43, 262, 199, 16];
    const randomHue = hues[Math.floor(Math.random() * hues.length)];
    return `hsl(${randomHue}, 82%, 52%)`;
  };

  const triggerConfetti = useCallback(() => {
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 }
    });
  }, []);

  const spinWheel = useCallback(async () => {
    if (isSpinning || segments.length === 0 || pointsPerSpin === null) return;
    
    console.log("Spin attempt - Current state:", {
      userId,
      points,
      pointsPerSpin,
      canSpin,
      segmentsCount: segments.length
    });
    
    // Check if user is authenticated
    if (!userId) {
      alert('Please log in to spin the wheel!');
      return;
    }
    
    // Check if we have points per spin value
    if (pointsPerSpin === null) {
      alert('Spin wheel configuration is loading. Please try again in a moment.');
      return;
    }
    
    // Check if user has enough points
    if (points !== undefined && points < pointsPerSpin) {
      alert(`You need ${pointsPerSpin} points to spin! You have ${points} points.`);
      return;
    }

    if (!canSpin) {
      alert('You cannot spin at this time. Please check your eligibility.');
      return;
    }

    setIsSpinning(true);
    setResult(null);

    const segmentAngle = 360 / segments.length;
    
    // Add random spins plus extra random degrees
    const extraRotation = ROTATIONS * 360 + Math.random() * 360;
    const totalRotation = rotation + extraRotation;

    setRotation(totalRotation);

    setTimeout(async () => {
      setIsSpinning(false);
      
      // Calculate winning segment (considering probabilities if available)
      const normalizedRotation = totalRotation % 360;
      const pointerAngle = (360 - normalizedRotation + 360) % 360;
      
      // If probabilities are available, use weighted random selection
      let winningIndex;
      if (segments.every(s => s.probability !== undefined)) {
        // Weighted random selection based on probabilities
        const totalProbability = segments.reduce((sum, seg) => sum + (seg.probability || 0), 0);
        let random = Math.random() * totalProbability;
        
        for (let i = 0; i < segments.length; i++) {
          random -= segments[i].probability || 0;
          if (random <= 0) {
            winningIndex = i;
            break;
          }
        }
      } else {
        // Fallback to equal probability
        winningIndex = Math.floor(pointerAngle / segmentAngle) % segments.length;
      }
      
      const winningSegment = segments[winningIndex!];
      
      setResult(winningSegment.display_name);
      triggerConfetti();
      
      // Send result to backend to deduct points and notify admin
      await sendResultToBackend(winningSegment);
    }, SPIN_DURATION);
  }, [isSpinning, rotation, segments, triggerConfetti, points, pointsPerSpin, userId, canSpin]);

  const sendResultToBackend = async (winningSegment: WheelSegment) => {
    try {
      console.log('Sending spin result to backend:', winningSegment);
      
      if (!userId || pointsPerSpin === null) {
        alert('User not authenticated or configuration missing!');
        return;
      }

      // Send to your API endpoint
      const response = await api.post("/spin/process", {
        user_id: userId,
        prize_won: winningSegment.display_name
      });

      console.log('Spin API response:', response.data);
      
      if (response.data.success) {
        // Show success message
        let message = `🎉 Congratulations! You won: ${winningSegment.display_name}`;
        
        if (response.data.points_deducted !== undefined) {
          message += `\n💰 Points deducted: ${response.data.points_deducted}`;
        }
        
        if (response.data.new_balance !== undefined) {
          message += `\n💎 New balance: ${response.data.new_balance}`;
          
          // Update points in context
          updatePoints(response.data.new_balance);
        }
        
        alert(message);
        
        console.log('Admin notified via Telegram:', response.data.telegram_notified);
        
        // Refresh user data to get updated points
        if (refreshUser) {
          await refreshUser();
        }
        
        // Re-check eligibility after spin
        checkSpinEligibility();
        
        // Refetch spin data in case admin changed segments
        setTimeout(() => {
          fetchSpinData();
        }, 1000);
        
      } else {
        alert('Error: ' + response.data.message);
      }
    } catch (error: any) {
      console.error('Error recording spin:', error);
      
      if (error.response?.status === 422) {
        // Validation error
        const errorData = error.response.data;
        console.error('Validation errors:', errorData.errors);
        
        let errorMessage = 'Validation failed:\n';
        if (errorData.errors?.user_id) {
          errorMessage += `• User ID: ${errorData.errors.user_id[0]}\n`;
          errorMessage += `Current user_id: ${userId}\n`;
        }
        alert(errorMessage);
      } else if (error.response) {
        console.error('Error response:', error.response.data);
        alert('Spin failed: ' + (error.response.data?.message || error.message));
      } else {
        alert('Spin failed! Please try again.');
      }
    }
  };

  const segmentAngle = segments.length > 0 ? 360 / segments.length : 0;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-8 p-8">
        <div className="relative">
          <div className="w-80 h-80 md:w-96 md:h-96 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 md:w-20 md:h-20 rounded-full bg-gray-400 animate-pulse"></div>
        </div>
        <div className="text-center">
          <p className="text-lg font-medium">Loading spin wheel...</p>
          <p className="text-sm text-gray-500 mt-1">Fetching configuration from server</p>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center gap-8 p-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md text-center">
          <div className="text-red-500 text-4xl mb-3">⚠️</div>
          <h3 className="text-lg font-semibold text-red-700 mb-2">Spin Wheel Unavailable</h3>
          <p className="text-red-600 mb-4">{fetchError}</p>
          <button 
            onClick={fetchSpinData}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (segments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-8 p-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 max-w-md text-center">
          <div className="text-yellow-500 text-4xl mb-3">🎰</div>
          <h3 className="text-lg font-semibold text-yellow-700 mb-2">No Active Segments</h3>
          <p className="text-yellow-600 mb-2">The spin wheel is not configured yet.</p>
          <p className="text-sm text-yellow-500">Please contact the administrator to set up wheel segments.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8 p-4">
      {/* User Info */}
      {userId && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg shadow-md border border-blue-100">
          <div className="flex flex-col items-center space-y-2">
            <div className="text-center">
              <p className="text-sm text-gray-500">Logged in as</p>
              <p className="text-xl font-bold text-blue-700">
                {user?.name || `User ID: ${userId}`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Points Info */}
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 w-full max-w-md">
        <div className="flex flex-col items-center space-y-4">
          <div className="grid grid-cols-2 gap-6 w-full">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-2">
                <span className="text-2xl">💰</span>
              </div>
              <p className="text-sm text-gray-500 font-medium">Your Points</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">
                {points !== undefined ? points.toLocaleString() : '...'}
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mb-2">
                <span className="text-2xl">🎯</span>
              </div>
              <p className="text-sm text-gray-500 font-medium">Cost per Spin</p>
              <p className="text-3xl font-bold text-red-600 mt-1">
                {pointsPerSpin !== null ? pointsPerSpin.toLocaleString() : '...'}
              </p>
            </div>
          </div>
          
          {points !== undefined && pointsPerSpin !== null && points < pointsPerSpin && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 w-full">
              <p className="text-red-700 text-sm font-medium text-center">
                ⚠️ You need {pointsPerSpin - points} more points to spin!
              </p>
            </div>
          )}
          
          {pointsPerSpin === 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 w-full">
              <p className="text-green-700 text-sm font-medium text-center">
                🎉 Free spins! No points required
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Wheel Container */}
      <div className="relative">
        {/* Pointer */}
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-30">
          <div className="w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-t-[30px] border-t-red-500 filter drop-shadow-lg"></div>
        </div>

        {/* Outer Ring */}
        <div className="relative w-80 h-80 md:w-96 md:h-96 rounded-full p-3 bg-gradient-to-br from-gray-900 to-black shadow-2xl">
          {/* Decorative outer ring */}
          <div className="absolute inset-0 rounded-full border-4 border-yellow-400/30"></div>
          
          {/* Decorative dots */}
          <div className="absolute inset-0 rounded-full">
            {Array.from({ length: 36 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 bg-yellow-400 rounded-full"
                style={{
                  top: "50%",
                  left: "50%",
                  transform: `rotate(${i * 10}deg) translateY(-${152}px) translate(-50%, -50%)`,
                }}
              />
            ))}
          </div>

          {/* Wheel */}
          <div
            ref={wheelRef}
            className="relative w-full h-full rounded-full overflow-hidden"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: isSpinning
                ? `transform ${SPIN_DURATION}ms cubic-bezier(0.17, 0.67, 0.12, 0.99)`
                : "none",
            }}
          >
            {/* Segments */}
            <svg viewBox="0 0 100 100" className="w-full h-full">
              {segments.map((segment, index) => {
                const startAngle = index * segmentAngle - 90;
                const endAngle = startAngle + segmentAngle;
                
                const startRad = (startAngle * Math.PI) / 180;
                const endRad = (endAngle * Math.PI) / 180;
                
                const x1 = 50 + 50 * Math.cos(startRad);
                const y1 = 50 + 50 * Math.sin(startRad);
                const x2 = 50 + 50 * Math.cos(endRad);
                const y2 = 50 + 50 * Math.sin(endRad);
                
                const largeArc = segmentAngle > 180 ? 1 : 0;
                
                const path = `M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArc} 1 ${x2} ${y2} Z`;
                
                // Text position
                const midAngle = startAngle + segmentAngle / 2;
                const midRad = (midAngle * Math.PI) / 180;
                const textX = 50 + 32 * Math.cos(midRad);
                const textY = 50 + 32 * Math.sin(midRad);

                return (
                  <g key={segment.id || index}>
                    <path 
                      d={path} 
                      fill={segment.color} 
                      stroke="white" 
                      strokeWidth="0.5" 
                      className="transition-opacity hover:opacity-90"
                    />
                    <text
                      x={textX}
                      y={textY}
                      fill="white"
                      fontSize="3.5"
                      fontWeight="600"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      transform={`rotate(${midAngle + 90}, ${textX}, ${textY})`}
                      style={{ 
                        fontFamily: "'Fredoka', 'Inter', sans-serif",
                        textShadow: "0 1px 3px rgba(0,0,0,0.5)",
                        letterSpacing: "0.5px"
                      }}
                    >
                      {segment.label}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Center decoration */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 border-4 border-white shadow-2xl flex items-center justify-center">
              <span className="text-3xl md:text-4xl">🎰</span>
            </div>
          </div>
        </div>
      </div>

      {/* Spin Button */}
      <Button
        onClick={spinWheel}
        disabled={
          isSpinning || 
          segments.length === 0 || 
          !userId || 
          pointsPerSpin === null ||
          (points !== undefined && points < pointsPerSpin) || 
          !canSpin
        }
        size="lg"
        className="px-14 py-7 text-2xl text-white font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        {isSpinning ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Spinning...
          </span>
        ) : (
          `SPIN (${pointsPerSpin} points)`
        )}
      </Button>

      {/* Result Display */}
      {result && (
        <div className="animate-bounce-in bg-gradient-to-r from-green-100 to-emerald-100 rounded-2xl p-6 shadow-xl border-2 border-green-300 max-w-md">
          <div className="text-center">
            <div className="text-green-500 text-4xl mb-2">🎊</div>
            <p className="text-green-700 text-sm font-medium mb-1">CONGRATULATIONS!</p>
            <p className="text-2xl font-bold text-gray-800 mb-3">{result}</p>
            <p className="text-sm text-gray-600">
              {pointsPerSpin} points deducted • Admin notified
            </p>
          </div>
        </div>
      )}

      {/* Statistics */}
      <div className="mt-2 text-center">
        <div className="inline-flex items-center gap-4 bg-gray-50 px-4 py-2 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-sm">Segments:</span>
            <span className="font-semibold">{segments.length}</span>
          </div>
          <div className="h-4 w-px bg-gray-300"></div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-sm">Cost:</span>
            <span className="font-semibold text-red-600">{pointsPerSpin} points</span>
          </div>
        </div>
        
        {!canSpin && (
          <p className="text-sm text-amber-600 mt-3 bg-amber-50 px-4 py-2 rounded-lg">
            ⚠️ You cannot spin at the moment. Please check your eligibility.
          </p>
        )}
      </div>

      {/* Refresh Button */}
      <button
        onClick={fetchSpinData}
        className="mt-2 text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
        </svg>
        Refresh wheel data
      </button>
    </div>
  );
};