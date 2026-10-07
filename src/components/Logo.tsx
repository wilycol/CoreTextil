"use client";

import { useState } from "react";
import { LOGO_BASE64, ICON_BASE64 } from "./logo_base64";

interface LogoProps {
  className?: string;
  heightClass?: string;
}

export default function Logo({
  className = "",
  heightClass = "h-10",
}: LogoProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <img
          src={ICON_BASE64}
          alt="CoreTextil"
          className={`${heightClass} w-auto object-contain`}
        />
        <span className="text-xl font-black tracking-tight text-white">
          Core<span className="text-cyan-400">Textil</span>
        </span>
      </div>
    );
  }

  return (
    <img
      src={LOGO_BASE64}
      alt="CoreTextil"
      onError={() => setHasError(true)}
      className={`${heightClass} w-auto object-contain transition-transform group-hover:scale-105 ${className}`}
    />
  );
}
