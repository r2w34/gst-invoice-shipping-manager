import { useEffect, useState } from "react";
import { Box, Text } from "@shopify/polaris";

interface SuccessAnimationProps {
  show: boolean;
  title?: string;
  message?: string;
  onComplete?: () => void;
}

export function SuccessAnimation({ 
  show, 
  title = "Success!", 
  message = "Operation completed successfully",
  onComplete 
}: SuccessAnimationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [animationPhase, setAnimationPhase] = useState(0);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      setAnimationPhase(1);
      
      const timer1 = setTimeout(() => setAnimationPhase(2), 500);
      const timer2 = setTimeout(() => setAnimationPhase(3), 1000);
      const timer3 = setTimeout(() => {
        setAnimationPhase(4);
        setTimeout(() => {
          setIsVisible(false);
          onComplete?.();
        }, 500);
      }, 2500);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    }
  }, [show, onComplete]);

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
        opacity: animationPhase === 4 ? 0 : 1,
        transition: "opacity 0.5s ease-in-out",
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "12px",
          padding: "40px",
          textAlign: "center",
          maxWidth: "400px",
          width: "90%",
          transform: animationPhase >= 2 ? "scale(1)" : "scale(0.8)",
          transition: "transform 0.3s ease-out",
        }}
      >
        {/* Success Checkmark Animation */}
        <div
          style={{
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            backgroundColor: "#008060",
            margin: "0 auto 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            transform: animationPhase >= 1 ? "scale(1)" : "scale(0)",
            transition: "transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
          }}
        >
          {/* Checkmark SVG */}
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M9 12L11 14L15 10"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                strokeDasharray: "20",
                strokeDashoffset: animationPhase >= 2 ? "0" : "20",
                transition: "stroke-dashoffset 0.6s ease-in-out 0.2s",
              }}
            />
          </svg>
          
          {/* Ripple Effect */}
          {animationPhase >= 2 && (
            <div
              style={{
                position: "absolute",
                top: "-10px",
                left: "-10px",
                right: "-10px",
                bottom: "-10px",
                borderRadius: "50%",
                border: "2px solid #008060",
                opacity: animationPhase === 3 ? 0 : 0.6,
                transform: animationPhase === 3 ? "scale(1.5)" : "scale(1)",
                transition: "all 0.8s ease-out",
              }}
            />
          )}
        </div>

        {/* Success Text */}
        <Box paddingBlockEnd="200">
          <Text
            variant="headingLg"
            as="h2"
            alignment="center"
            tone={animationPhase >= 2 ? undefined : "subdued"}
          >
            {title}
          </Text>
        </Box>
        
        <Text
          variant="bodyMd"
          as="p"
          alignment="center"
          tone="subdued"
        >
          {message}
        </Text>

        {/* Confetti Animation */}
        {animationPhase >= 3 && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              pointerEvents: "none",
              overflow: "hidden",
              borderRadius: "12px",
            }}
          >
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  width: "6px",
                  height: "6px",
                  backgroundColor: ["#008060", "#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1"][i % 5],
                  borderRadius: "50%",
                  left: `${Math.random() * 100}%`,
                  top: "-10px",
                  animation: `confetti-fall-${i} 2s ease-out forwards`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Confetti Animation Keyframes */}
      <style>
        {`
          ${[...Array(20)].map((_, i) => `
            @keyframes confetti-fall-${i} {
              to {
                transform: translateY(400px) rotate(${Math.random() * 360}deg);
                opacity: 0;
              }
            }
          `).join('')}
        `}
      </style>
    </div>
  );
}