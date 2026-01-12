"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import confetti from "canvas-confetti";
import api from "@/api/api";
import { useAuth } from "@/context/AuthContext";
import { usePoints } from "@/context/PointsContext";

interface WheelSegment {
  label: string;
  color: string;
  type: string;
  originalData: any;
  id: number;
  display_name: string;
  icon?: string;
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
  const [pointsPerSpin, setPointsPerSpin] = useState(5); // Will be updated from backend
  const [canSpin, setCanSpin] = useState(true);
  const wheelRef = useRef<HTMLDivElement>(null);
  
  const { points, updatePoints } = usePoints();
  const { user, refreshUser } = useAuth();
  
  // Get the database user ID (should be 7)
  const userId = user?.id || null;

  // Fetch spin wheel data (segments and points per spin) from Laravel API
  useEffect(() => {
    const fetchSpinData = async () => {
      try {
        console.log('Fetching spin wheel data...');
        
        // Use the new endpoint that returns both segments and points_per_spin
        const response = await api.get("/spin-wheel/segments");
        
        console.log('Spin wheel API response:', response.data);
        
        if (response.data.success) {
          // Set points per spin from backend (set by admin)
          setPointsPerSpin(response.data.points_per_spin || 5);
          
          if (response.data.segments?.length > 0) {
            // Map Laravel data to React component format
            const mappedSegments = response.data.segments.map((segment: any) => ({
              id: segment.id,
              label: `${segment.icon || ''} ${segment.display_name}`.trim(),
              color: segment.color || getRandomColor(),
              type: segment.type,
              display_name: segment.display_name,
              icon: segment.icon,
              originalData: segment
            }));
            setSegments(mappedSegments);
          } else {
            console.warn('No active segments found');
          }
        } else {
          // Fallback: try the old endpoint if new one fails
          await fetchSegmentsFallback();
        }
      } catch (error: any) {
        console.error('Error fetching spin wheel data:', error);
        
        if (error.response) {
          console.error('Error response:', error.response.data);
        }
        
        // Fallback to old endpoint
        await fetchSegmentsFallback();
      } finally {
        setLoading(false);
      }
    };

    // Fallback function for older API endpoint
    const fetchSegmentsFallback = async () => {
      try {
        const response = await api.get("/spin-wheel/settings");
        if (response.data) {
          const mappedSegments = response.data.map((segment: any) => ({
            id: segment.id,
            label: `${segment.icon || ''} ${segment.display_name}`.trim(),
            color: segment.color || getRandomColor(),
            type: segment.type,
            display_name: segment.display_name,
            icon: segment.icon,
            originalData: segment
          }));
          setSegments(mappedSegments);
        }
      } catch (fallbackError) {
        console.error('Fallback fetch also failed:', fallbackError);
      }
    };

    fetchSpinData();
  }, []);

  // Check if user can spin
  const checkSpinEligibility = useCallback(async () => {
    if (!userId) {
      console.log('User ID not found, cannot check eligibility');
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
      // If endpoint doesn't exist or fails, assume user can spin
      setCanSpin(true);
    }
  }, [userId]);

  // Check eligibility when userId changes
  useEffect(() => {
    if (userId) {
      checkSpinEligibility();
    }
  }, [userId, checkSpinEligibility]);

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
    if (isSpinning || segments.length === 0) return;
    
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
    
    // Check if user has enough points
    if (points < pointsPerSpin) {
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
      
      // Calculate winning segment
      const normalizedRotation = totalRotation % 360;
      const pointerAngle = (360 - normalizedRotation + 360) % 360;
      const winningIndex = Math.floor(pointerAngle / segmentAngle) % segments.length;
      const winningSegment = segments[winningIndex];
      
      setResult(winningSegment.label);
      triggerConfetti();
      
      // Send result to backend to deduct points and notify admin
      await sendResultToBackend(winningSegment);
    }, SPIN_DURATION);
  }, [isSpinning, rotation, segments, triggerConfetti, points, pointsPerSpin, userId, canSpin]);

  const sendResultToBackend = async (winningSegment: WheelSegment) => {
    try {
      console.log('Sending spin result to backend:', winningSegment);
      
      if (!userId) {
        alert('User not authenticated!');
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
          errorMessage += `Please check if user ID ${userId} exists in the database.`;
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

  const segmentAngle = 360 / segments.length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-8">
        <div className="relative">
          <div className="w-80 h-80 md:w-96 md:h-96 rounded-full bg-gray-200 animate-pulse"></div>
        </div>
        <div className="text-center">
          <p className="text-lg">Loading spin wheel...</p>
        </div>
      </div>
    );
  }

  if (segments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-8">
        <div className="text-center">
          <p className="text-lg text-gray-500">No active segments available.</p>
          <p className="text-sm text-gray-400">Please add segments in the admin panel.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8">
      {/* User Info */}
      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="flex flex-col items-center space-y-2">
          <div className="text-center">
            <p className="text-sm text-gray-500">User ID</p>
            <p className="text-xl font-bold text-blue-600">
              {userId ? `ID: ${userId}` : 'Not logged in'}
            </p>
            {userId && user?.name && (
              <p className="text-xs text-gray-500 mt-1">
                User: {user.name}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Points Info */}
      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="flex flex-col items-center space-y-2">
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <p className="text-sm text-gray-500">Your Points</p>
              <p className="text-2xl font-bold text-blue-600">
                {points}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">Points per Spin</p>
              <p className="text-2xl font-bold text-red-600">
                {pointsPerSpin} 
                <span className="text-xs text-gray-500 ml-2">
                  (set by admin)
                </span>
              </p>
            </div>
          </div>
          {points < pointsPerSpin && (
            <p className="text-sm text-red-500 mt-2">
              ⚠️ You need {pointsPerSpin - points} more points to spin!
            </p>
          )}
        </div>
      </div>

      {/* Wheel Container */}
      <div className="relative">
        {/* Pointer */}
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
          <div className="w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-t-[40px] border-t-foreground drop-shadow-lg" />
        </div>

        {/* Outer Ring */}
        <div className="relative w-80 h-80 md:w-96 md:h-96 rounded-full p-3 bg-gradient-to-br from-foreground/90 to-foreground wheel-shadow">
          {/* Decorative dots */}
          <div className="absolute inset-0 rounded-full">
            {Array.from({ length: 24 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-3 h-3 bg-accent rounded-full"
                style={{
                  top: "50%",
                  left: "50%",
                  transform: `rotate(${i * 15}deg) translateY(-${145}px) translate(-50%, -50%)`,
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
                  <g key={index}>
                    <path d={path} fill={segment.color} stroke="white" strokeWidth="0.5" />
                    <text
                      x={textX}
                      y={textY}
                      fill="white"
                      fontSize="4"
                      fontWeight="600"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      transform={`rotate(${midAngle + 90}, ${textX}, ${textY})`}
                      style={{ 
                        fontFamily: "'Fredoka', sans-serif",
                        textShadow: "0 1px 2px rgba(0,0,0,0.3)"
                      }}
                    >
                      {segment.label}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Center decoration */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-card to-muted border-4 border-foreground flex items-center justify-center shadow-lg">
              <span className="text-2xl md:text-3xl">🎰</span>
            </div>
          </div>
        </div>
      </div>

      {/* Spin Button */}
      <Button
        onClick={spinWheel}
        disabled={isSpinning || segments.length === 0 || !userId || points < pointsPerSpin || !canSpin}
        size="lg"
        className="px-12 py-6 text-xl text-white font-display bg-gradient-to-r from-blue-500 to-purple-600 font-bold rounded-full button-glow transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        {isSpinning ? "Spinning..." : `SPIN (${pointsPerSpin} points)`}
      </Button>

      {/* Result Display */}
      {result && (
        <div className="animate-bounce-in bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 shadow-lg border-2 border-green-300">
          <p className="text-green-600 text-sm font-medium mb-1">🎊 Congratulations!</p>
          <p className="text-2xl font-display font-bold text-gray-800">{result}</p>
          <p className="text-sm text-gray-600 mt-2">
            {pointsPerSpin} points deducted and admin notified via Telegram
          </p>
        </div>
      )}

      {/* Statistics */}
      <div className="mt-4 text-center">
        <p className="text-sm text-gray-500">
          {segments.length} active segments • {pointsPerSpin} points per spin (set by admin)
        </p>
        {!canSpin && (
          <p className="text-sm text-amber-600 mt-1">
            ⚠️ You cannot spin at the moment
          </p>
        )}
      </div>
    </div>
  );
};