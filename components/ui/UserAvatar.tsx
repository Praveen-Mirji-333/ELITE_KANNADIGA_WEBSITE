'use client'

import React, { useState } from 'react'

interface UserAvatarProps {
  src?: string | null
  alt?: string
  name?: string
  className?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}

const sizeClasses: Record<string, string> = {
  xs: 'h-6 w-6 text-[9px]',
  sm: 'h-8 w-8 text-[10px]',
  md: 'h-10 w-10 text-xs',
  lg: 'h-14 w-14 text-base',
  xl: 'h-20 w-20 text-xl',
}

function getInitials(name?: string): string {
  if (!name || name.trim() === '') return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) {
    // Single word: take first 2 chars
    return parts[0].slice(0, 2).toUpperCase()
  }
  // Multiple words: take first letter of first two words
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

// Simple hash to pick a consistent color from the name
function getAvatarColor(name?: string): string {
  const colors = [
    'bg-red-700',
    'bg-orange-700',
    'bg-amber-700',
    'bg-green-700',
    'bg-teal-700',
    'bg-cyan-700',
    'bg-blue-700',
    'bg-indigo-700',
    'bg-purple-700',
    'bg-pink-700',
  ]
  if (!name) return colors[0]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

export function UserAvatar({
  src,
  alt = 'User profile',
  name,
  className = '',
  size = 'md',
}: UserAvatarProps) {
  const [imgError, setImgError] = useState(false)

  // Filter out known non-avatar URLs (old logo placeholder, /logo.png, etc.)
  const isLogoUrl = (url?: string | null) =>
    !url ||
    url.trim() === '' ||
    url.includes('/logo.png') ||
    url.includes('hebbkx1anhila5yf') // old vercel blob logo

  const hasValidSrc = !imgError && src && !isLogoUrl(src)
  const sizeClass = sizeClasses[size] || sizeClasses.md
  const initials = getInitials(name)
  const colorClass = getAvatarColor(name)

  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-neutral-900 shadow-md ${sizeClass} ${className}`}
      title={name || alt}
    >
      {hasValidSrc ? (
        <img
          src={src!}
          alt={alt || name || 'Player Avatar'}
          onError={() => {
            if (!imgError) setImgError(true)
          }}
          className="h-full w-full rounded-full object-cover"
          loading="lazy"
        />
      ) : (
        <span
          className={`flex h-full w-full items-center justify-center rounded-full font-black text-white ${colorClass}`}
        >
          {initials}
        </span>
      )}
    </div>
  )
}
