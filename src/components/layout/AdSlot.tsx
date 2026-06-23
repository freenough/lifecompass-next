'use client';

interface AdSlotProps {
  slotId: string;
  className?: string;
}

export default function AdSlot({ slotId, className = '' }: AdSlotProps) {
  return (
    <div
      data-ad-slot={slotId}
      className={`hidden ${className}`}
      aria-hidden="true"
    />
  );
}
