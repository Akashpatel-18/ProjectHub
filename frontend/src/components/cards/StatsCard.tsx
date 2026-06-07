import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { type LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  description: string | React.ReactNode;
  icon: LucideIcon;
  iconColorClass: string;
  iconBgClass: string;
}

export function StatsCard({ title, value, description, icon: Icon, iconColorClass, iconBgClass }: StatsCardProps) {
  return (
    <Card className="border-border/50 bg-card/30 backdrop-blur-xl hover:border-primary/30 transition-all duration-300">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${iconBgClass}`}>
          <Icon className={`w-4 h-4 ${iconColorClass}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground mt-1">
          {description}
        </div>
      </CardContent>
    </Card>
  );
}
