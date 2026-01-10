"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import confetti from "canvas-confetti";
//import { Button } from "@/components/ui/button";

interface WheelSegment {
  label: string;
  color: string;
  type: string;
  originalData: any;
}

// const SEGMENTS: WheelSegment[] = [
//   { label: "🎁 Grand Prize", color: "hsl(340, 82%, 52%)" },
//   { label: "⭐ 50 Points", color: "hsl(174, 72%, 46%)" },
//   { label: "🎯 Try Again", color: "hsl(43, 96%, 56%)" },
//   { label: "💎 VIP Access", color: "hsl(262, 83%, 58%)" },
//   { label: "🔥 100 Points", color: "hsl(199, 89%, 48%)" },
//   { label: "🎉 Mystery Box", color: "hsl(16, 85%, 57%)" },
// ];

const SPIN_DURATION = 5000;
const ROTATIONS = 5;
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
  const wheelRef = useRef<HTMLDivElement>(null);

  // Fetch segments from Laravel API
  useEffect(() => {
    const fetchSegments = async () => {
      try {
        const response = await fetch('/api/spin-wheel/segments');
        const data = await response.json();
        
        if (data.success && data.segments.length > 0) {
          // Map Laravel data to React component format
          const mappedSegments = data.segments.map((segment: any) => ({
            label: `${segment.icon || ''} ${segment.display_name}`.trim(),
            color: segment.color || getRandomColor(),
            type: segment.type,
            originalData: segment
          }));
          setSegments(mappedSegments);
        } else {
          // Fallback to default segments if no data
          // setSegments([
          //   { label: "🎁 Grand Prize", color: "hsl(340, 82%, 52%)", type: "product" },
          //   { label: "⭐ 50 Points", color: "hsl(174, 72%, 46%)", type: "points" },
          //   { label: "🎯 Try Again", color: "hsl(43, 96%, 56%)", type: "none" },
          //   { label: "💎 VIP Access", color: "hsl(262, 83%, 58%)", type: "special" },
          //   { label: "🔥 100 Points", color: "hsl(199, 89%, 48%)", type: "points" },
          //   { label: "🎉 Mystery Box", color: "hsl(16, 85%, 57%)", type: "product" },
          // ]);
        }
      } catch (error) {
        console.error('Error fetching segments:', error);
        // Use fallback segments
        //setSegments(SEGMENTS);
      } finally {
        setLoading(false);
      }
    };

    fetchSegments();
  }, []);

  // Helper function for random colors
  const getRandomColor = () => {
    const hues = [340, 174, 43, 262, 199, 16];
    const randomHue = hues[Math.floor(Math.random() * hues.length)];
    return `hsl(${randomHue}, 82%, 52%)`;
  };

  const triggerConfetti = useCallback(() => {
    // ... keep your existing confetti code ...
  }, []);

  const spinWheel = useCallback(() => {
    if (isSpinning || segments.length === 0) return;

    setIsSpinning(true);
    setResult(null);

    const segmentAngle = 360 / segments.length;
    
    // Add random spins plus extra random degrees
    const extraRotation = ROTATIONS * 360 + Math.random() * 360;
    const totalRotation = rotation + extraRotation;

    setRotation(totalRotation);

    setTimeout(() => {
      setIsSpinning(false);
      
      // Calculate winning segment
      const normalizedRotation = totalRotation % 360;
      const pointerAngle = (360 - normalizedRotation + 360) % 360;
      const winningIndex = Math.floor(pointerAngle / segmentAngle) % segments.length;
      
      setResult(segments[winningIndex].label);
      triggerConfetti();
      
      // Optional: Send result to Laravel backend
      sendResultToBackend(segments[winningIndex]);
    }, SPIN_DURATION);
  }, [isSpinning, rotation, segments, triggerConfetti]);

  const sendResultToBackend = async (winningSegment: WheelSegment) => {
    try {
      await fetch('/api/spin-wheel/record-spin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
        },
        body: JSON.stringify({
          segment_label: winningSegment.label,
          segment_type: winningSegment.type,
          won_at: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Error recording spin:', error);
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
        disabled={isSpinning || segments.length === 0}
        size="lg"
        className="px-12 py-6 text-xl text-white font-display bg-blue-500 font-bold rounded-full button-glow transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        {isSpinning ? "Spinning..." : "SPIN TO WIN!"}
      </Button>

      {/* Result Display */}
      {result && (
        <div className="animate-bounce-in bg-card rounded-2xl p-6 shadow-lg border-2 border-accent">
          <p className="text-muted-foreground text-sm font-medium mb-1">🎊 Congratulations!</p>
          <p className="text-2xl font-display font-bold text-foreground">{result}</p>
        </div>
      )}

      {/* Statistics */}
      <div className="mt-4 text-center text-sm text-gray-500">
        <p>{segments.length} active segments</p>
      </div>
    </div>
  );
};