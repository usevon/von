"use client";

import * as React from "react";
import {
  Area,
  AreaChart as RechartsAreaChart,
  ResponsiveContainer,
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
};

const SparkAreaChart = React.forwardRef<HTMLDivElement, SparkAreaChartProps>(
  (
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
      className,
      ...props
    },
    ref,
  ) => {
    const areaId = React.useId();

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
      }
    };

    return (
      <div ref={ref} className={cn("h-10 w-24", className)} {...props}>
        <ResponsiveContainer>
          <RechartsAreaChart
            data={data}
            margin={{ top: 1, right: 1, bottom: 1, left: 1 }}
          >
            <XAxis hide dataKey={index} />
            <YAxis hide domain={yDomain} />
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
  },
);

SparkAreaChart.displayName = "SparkAreaChart";

export { SparkAreaChart };
