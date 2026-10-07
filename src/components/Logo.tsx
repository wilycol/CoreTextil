"use client";

import { useState } from "react";

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
          src="/icon.png?v=2"
          alt="CoreTextil Icon"
          className={`${heightClass} w-auto object-contain`}
        />
        <span className="text-xl font-extrabold tracking-tight text-slate-100">
          Core<span className="text-cyan-400">Textil</span>
        </span>
      </div>
    );
  }

  return (
    <img
      src="/logo.png?v=2"
      alt="CoreTextil"
      onError={() => setHasError(true)}
      className={`${heightClass} w-auto object-contain transition-transform group-hover:scale-105 ${className}`}
    />
  );
}
