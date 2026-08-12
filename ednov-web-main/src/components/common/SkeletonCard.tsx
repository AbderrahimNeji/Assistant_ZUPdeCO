import * as React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonCardProps {
  className?: string;
  index?: number;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({ className, index = 0 }) => {
  return (
    <div
      className={cn('stat-card animate-fade-in-up animate-stagger', className)}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          <div className="h-3 w-20 rounded animate-shimmer" />
          <div className="h-8 w-24 rounded animate-shimmer" />
          <div className="h-5 w-16 rounded-full animate-shimmer" />
        </div>
        <div className="stat-card-icon-container animate-shimmer" />
      </div>
    </div>
  );
};

export const SkeletonTable: React.FC<SkeletonCardProps> = ({ className }) => {
  return (
    <div className={cn('table-container animate-fade-in', className)}>
      {/* Header */}
      <div className="p-5 border-b border-[var(--color-1-nuance-3)]/10">
        <div className="h-5 w-32 rounded animate-shimmer" />
      </div>

      {/* Rows */}
      <div className="divide-y divide-[var(--color-1-nuance-3)]/5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="p-4 flex items-center gap-4 animate-fade-in animate-stagger"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="h-4 w-28 rounded animate-shimmer" />
            <div className="h-4 w-20 rounded animate-shimmer" />
            <div className="h-6 w-24 rounded-full animate-shimmer" />
            <div className="flex-1" />
            <div className="h-8 w-8 rounded-lg animate-shimmer" />
          </div>
        ))}
      </div>
    </div>
  );
};

export const SkeletonChart: React.FC<SkeletonCardProps> = ({ className }) => {
  return (
    <div className={cn('section-card animate-fade-in', className)}>
      <div className="h-5 w-40 rounded animate-shimmer mb-6" />
      <div className="h-64 rounded-lg animate-shimmer" />
    </div>
  );
};

export const SkeletonCalendar: React.FC<SkeletonCardProps> = ({ className }) => {
  return (
    <div className={cn('mini-calendar animate-fade-in', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="h-8 w-8 rounded-lg animate-shimmer" />
        <div className="h-5 w-32 rounded animate-shimmer" />
        <div className="h-8 w-8 rounded-lg animate-shimmer" />
      </div>

      {/* Today button */}
      <div className="h-9 w-full rounded-lg animate-shimmer mb-4" />

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Day headers */}
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={`header-${i}`} className="h-6 rounded animate-shimmer" />
        ))}
        {/* Day cells */}
        {Array.from({ length: 35 }).map((_, i) => (
          <div
            key={`day-${i}`}
            className="aspect-square rounded-lg animate-shimmer"
            style={{ animationDelay: `${i * 10}ms` }}
          />
        ))}
      </div>
    </div>
  );
};
