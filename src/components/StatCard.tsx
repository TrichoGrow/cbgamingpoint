import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  className?: string;
}

const StatCard = ({ title, value, icon, className }: StatCardProps) => (
  <div className={cn(
    "rounded-lg border border-border bg-card p-4 transition-all hover:glow-card hover:border-primary/30",
    className
  )}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
        <p className="mt-1 font-display text-2xl font-bold text-foreground">{value}</p>
      </div>
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
    </div>
  </div>
);

export default StatCard;
