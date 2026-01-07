"use client";
import { useState, useRef, useCallback } from "react";
import confetti from "canvas-confetti";
//import { Button } from "@/components/ui/button";

interface WheelSegment {
  label: string;
  color: string;
}

const SEGMENTS: WheelSegment[] = [
  { label: "🎁 Grand Prize", color: "hsl(340, 82%, 52%)" },
  { label: "⭐ 50 Points", color: "hsl(174, 72%, 46%)" },
  { label: "🎯 Try Again", color: "hsl(43, 96%, 56%)" },
  { label: "💎 VIP Access", color: "hsl(262, 83%, 58%)" },
  { label: "🔥 100 Points", color: "hsl(199, 89%, 48%)" },
  { label: "🎉 Mystery Box", color: "hsl(16, 85%, 57%)" },
];

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
  const wheelRef = useRef<HTMLDivElement>(null);

  const triggerConfetti = useCallback(() => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) {
        return clearInterval(interval);
      }
      const particleCount = 50 * (timeLeft / duration);
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      });
    }, 250) as NodeJS.Timeout;
  }, []);

  const spinWheel = useCallback(() => {
    if (isSpinning) return;

    setIsSpinning(true);
    setResult(null);

    const segmentAngle = 360 / SEGMENTS.length;
    
    // Add random spins plus extra random degrees
    const extraRotation = ROTATIONS * 360 + Math.random() * 360;
    const totalRotation = rotation + extraRotation;

    setRotation(totalRotation);

    setTimeout(() => {
      setIsSpinning(false);
      
      // Calculate which segment the pointer lands on based on final rotation
      // Normalize rotation to 0-360 range
      const normalizedRotation = totalRotation % 360;
      // The pointer is at top (0°). Segments start from top going clockwise.
      // We need to find which segment is under the pointer after rotation
      const pointerAngle = (360 - normalizedRotation + 360) % 360;
      const winningIndex = Math.floor(pointerAngle / segmentAngle) % SEGMENTS.length;
      
      setResult(SEGMENTS[winningIndex].label);
      triggerConfetti();
    }, SPIN_DURATION);
  }, [isSpinning, rotation, triggerConfetti]);

  const segmentAngle = 360 / SEGMENTS.length;

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
              {SEGMENTS.map((segment, index) => {
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
        disabled={isSpinning}
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
    </div>
  );
};