import { cn } from "@/lib/utils";

type ErrorIllustrationProps = {
  left: string;
  right: string;
  className?: string;
};

export const ErrorIllustration = (props: ErrorIllustrationProps) => (
  <div
    className={cn(
      "flex select-none items-center justify-center",
      props.className
    )}
  >
    <span className="font-bold text-[12rem] text-foreground/20 leading-none drop-shadow-lg sm:text-[16rem]">
      {props.left}
    </span>

    <svg
      className="h-[12rem] w-[8rem] text-foreground opacity-20 sm:h-[16rem] sm:w-[10rem]"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="7"
      viewBox="-100 -20 200 320"
    >
      <circle cx="50" cy="52" r="14" />
      <path d="M50 0v38m0 28v86c0 62-58 92-108 54-36-36-18-94 40-104" />
    </svg>

    <span className="font-bold text-[12rem] text-foreground/20 leading-none drop-shadow-lg sm:text-[16rem]">
      {props.right}
    </span>
  </div>
);
