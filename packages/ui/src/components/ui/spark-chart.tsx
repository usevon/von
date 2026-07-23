"use client";

import * as React from "react";
import {
  Area,
  AreaChart as RechartsAreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { cn } from "@/lib/utils";

type SparkAreaChartProps = React.HTMLAttributes<HTMLDivElement> & {
  data: Record<string, unknown>[];
  categories: string[];
  index: string;
  colors?: string[];
  autoMinValue?: boolean;
  minValue?: number;
  maxValue?: number;
  connectNulls?: boolean;
  fill?: "gradient" | "solid" | "none";
  tooltipFormatter?: (value: number | string) => string;
};

const SparkAreaChart = (
    {
      data = [],
      categories = [],
      index,
      colors = ["var(--color-success)"],
      autoMinValue = false,
      minValue,
      maxValue,
      connectNulls = false,
      fill = "gradient",
      tooltipFormatter,
      className,
    ref,
      ...props
    }: SparkAreaChartProps & { ref?: React.RefObject<HTMLDivElement | null> }
  ) => {
    const areaId = React.useId();
    const [mounted, setMounted] = React.useState(false);
    React.useEffect(() => { setMounted(true); }, []);

    const yDomain: [number | string, number | string] = [
      autoMinValue ? "auto" : (minValue ?? 0),
      maxValue ?? "auto",
    ];

    const getFillContent = () => {
      switch (fill) {
        case "none":
          return <stop stopColor="currentColor" stopOpacity={0} />;
        case "gradient":
          return (
            <>
              <stop offset="5%" stopColor="currentColor" stopOpacity={0.4} />
              <stop offset="95%" stopColor="currentColor" stopOpacity={0} />
            </>
          );
        case "solid":
          return <stop stopColor="currentColor" stopOpacity={0.3} />;
        default:
          return null;
      }
    };

    if (!mounted) {
      return <div ref={ref} className={cn("h-14 w-24", className)} {...props} />;
    }

    return (
      <div ref={ref} className={cn("h-14 w-24", className)} {...props}>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsAreaChart
            data={data}
            margin={{ top: 1, right: 1, bottom: 1, left: 1 }}
          >
            <XAxis hide dataKey={index} />
            <YAxis hide domain={yDomain} />
            <Tooltip
              content={({ active, payload }) => {
                if (!(active && payload?.[0])) {
                  return null;
                }
                return (
                  <div className="rounded-sm border border-border bg-popover px-2 py-1 font-medium text-popover-foreground text-xs shadow-md">
                    {tooltipFormatter ? tooltipFormatter(payload[0].value as number | string) : payload[0].value}
                  </div>
                );
              }}
              cursor={{ stroke: "var(--color-border)", strokeWidth: 1 }}
            />
            {categories.map((category, i) => {
              const categoryId = `${areaId}-${category.replace(/[^a-zA-Z0-9]/g, "")}`;
              const color = colors[i % colors.length];
              return (
                <React.Fragment key={category}>
                  <defs>
                    <linearGradient
                      id={categoryId}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                      style={{ color }}
                    >
                      {getFillContent()}
                    </linearGradient>
                  </defs>
                  <Area
                    dot={false}
                    activeDot={false}
                    strokeOpacity={1}
                    name={category}
                    type="linear"
                    dataKey={category}
                    stroke={color}
                    strokeWidth={2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    isAnimationActive={false}
                    connectNulls={connectNulls}
                    fill={`url(#${categoryId})`}
                  />
                </React.Fragment>
              );
            })}
          </RechartsAreaChart>
        </ResponsiveContainer>
      </div>
    );
  };

SparkAreaChart.displayName = "SparkAreaChart";

export { SparkAreaChart };
