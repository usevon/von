"use client";

import { Toast } from "@base-ui/react/toast";
import {
  CheckCircleIcon,
  CircleNotchIcon,
  InfoIcon,
  WarningCircleIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const toastManager = Toast.createToastManager();
const anchoredToastManager = Toast.createToastManager();

const TOAST_ICONS = {
  error: WarningCircleIcon,
  info: InfoIcon,
  loading: CircleNotchIcon,
  success: CheckCircleIcon,
  warning: WarningIcon,
} as const;

type ToastPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

type ToastProviderProps = Toast.Provider.Props & {
  position?: ToastPosition;
};

function ToastProvider({
  children,
  position = "bottom-right",
  ...props
}: ToastProviderProps) {
  return (
    <Toast.Provider toastManager={toastManager} {...props}>
      {children}
      <Toasts position={position} />
    </Toast.Provider>
  );
}

function getSwipeDirection(position: string, isTop: boolean) {
  if (position.includes("center")) {
    return [isTop ? "up" : "down"];
  }
  if (position.includes("left")) {
    return ["left", isTop ? "up" : "down"];
  }
  return ["right", isTop ? "up" : "down"];
}

function Toasts({ position = "bottom-right" }: { position: ToastPosition }) {
  const { toasts } = Toast.useToastManager();
  const isTop = position.startsWith("top");

  return (
    <Toast.Portal data-slot="toast-portal">
      <Toast.Viewport
        className={cn(
          "fixed z-50 mx-auto flex w-[calc(100%-var(--toast-inset)*2)] max-w-90 [--toast-inset:--spacing(4)] sm:[--toast-inset:--spacing(8)]",
          // Vertical positioning
          "data-[position*=top]:top-(--toast-inset)",
          "data-[position*=bottom]:bottom-(--toast-inset)",
          // Horizontal positioning
          "data-[position*=left]:left-(--toast-inset)",
          "data-[position*=right]:right-(--toast-inset)",
          "data-[position*=center]:left-1/2 data-[position*=center]:-translate-x-1/2"
        )}
        data-position={position}
        data-slot="toast-viewport"
      >
        {toasts.map((toastEntry) => {
          const Icon = toastEntry.type
            ? TOAST_ICONS[toastEntry.type as keyof typeof TOAST_ICONS]
            : null;

          const swipeDirectionValue = getSwipeDirection(position, isTop);

          return (
            <Toast.Root
              className={cn(
                "absolute z-[calc(9999-var(--toast-index))] h-(--toast-calc-height) w-full select-none rounded-none border bg-popover bg-clip-padding text-popover-foreground shadow-lg [transition:transform_.5s_cubic-bezier(.22,1,.36,1),opacity_.5s,height_.15s] before:pointer-events-none before:absolute before:inset-0 before:rounded-none before:shadow-[0_1px_--theme(--color-black/4%)] dark:bg-clip-border dark:before:shadow-[0_-1px_--theme(--color-white/8%)]",
                // Base positioning using data-position
                "data-[position*=right]:right-0 data-[position*=right]:left-auto",
                "data-[position*=left]:right-auto data-[position*=left]:left-0",
                "data-[position*=center]:right-0 data-[position*=center]:left-0",
                "data-[position*=top]:top-0 data-[position*=top]:bottom-auto data-[position*=top]:origin-top",
                "data-[position*=bottom]:top-auto data-[position*=bottom]:bottom-0 data-[position*=bottom]:origin-bottom",
                // Gap fill for hover
                "after:absolute after:left-0 after:h-[calc(var(--toast-gap)+1px)] after:w-full",
                "data-[position*=top]:after:top-full",
                "data-[position*=bottom]:after:bottom-full",
                // Define some variables
                "[--toast-calc-height:var(--toast-frontmost-height,var(--toast-height))] [--toast-gap:--spacing(3)] [--toast-peek:--spacing(3)] [--toast-scale:calc(max(0,1-(var(--toast-index)*.1)))] [--toast-shrink:calc(1-var(--toast-scale))]",
                // Define offset-y variable
                "data-[position*=top]:[--toast-calc-offset-y:calc(var(--toast-offset-y)+var(--toast-index)*var(--toast-gap)+var(--toast-swipe-movement-y))]",
                "data-[position*=bottom]:[--toast-calc-offset-y:calc(var(--toast-offset-y)*-1+var(--toast-index)*var(--toast-gap)*-1+var(--toast-swipe-movement-y))]",
                // Default state transform
                "data-[position*=top]:transform-[translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)+(var(--toast-index)*var(--toast-peek))+(var(--toast-shrink)*var(--toast-calc-height))))_scale(var(--toast-scale))]",
                "data-[position*=bottom]:transform-[translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)-(var(--toast-index)*var(--toast-peek))-(var(--toast-shrink)*var(--toast-calc-height))))_scale(var(--toast-scale))]",
                // Limited state
                "data-limited:opacity-0",
                // Expanded state
                "data-expanded:h-(--toast-height)",
                "data-position:data-expanded:transform-[translateX(var(--toast-swipe-movement-x))_translateY(var(--toast-calc-offset-y))]",
                // Starting and ending animations
                "data-[position*=top]:data-starting-style:transform-[translateY(calc(-100%-var(--toast-inset)))]",
                "data-[position*=bottom]:data-starting-style:transform-[translateY(calc(100%+var(--toast-inset)))]",
                "data-ending-style:opacity-0",
                // Ending animations (direction-aware)
                "data-ending-style:not-data-limited:not-data-swipe-direction:transform-[translateY(calc(100%+var(--toast-inset)))]",
                "data-ending-style:data-[swipe-direction=left]:transform-[translateX(calc(var(--toast-swipe-movement-x)-100%-var(--toast-inset)))_translateY(var(--toast-calc-offset-y))]",
                "data-ending-style:data-[swipe-direction=right]:transform-[translateX(calc(var(--toast-swipe-movement-x)+100%+var(--toast-inset)))_translateY(var(--toast-calc-offset-y))]",
                "data-ending-style:data-[swipe-direction=up]:transform-[translateY(calc(var(--toast-swipe-movement-y)-100%-var(--toast-inset)))]",
                "data-ending-style:data-[swipe-direction=down]:transform-[translateY(calc(var(--toast-swipe-movement-y)+100%+var(--toast-inset)))]",
                // Ending animations (expanded)
                "data-expanded:data-ending-style:data-[swipe-direction=left]:transform-[translateX(calc(var(--toast-swipe-movement-x)-100%-var(--toast-inset)))_translateY(var(--toast-calc-offset-y))]",
                "data-expanded:data-ending-style:data-[swipe-direction=right]:transform-[translateX(calc(var(--toast-swipe-movement-x)+100%+var(--toast-inset)))_translateY(var(--toast-calc-offset-y))]",
                "data-expanded:data-ending-style:data-[swipe-direction=up]:transform-[translateY(calc(var(--toast-swipe-movement-y)-100%-var(--toast-inset)))]",
                "data-expanded:data-ending-style:data-[swipe-direction=down]:transform-[translateY(calc(var(--toast-swipe-movement-y)+100%+var(--toast-inset)))]"
              )}
              data-position={position}
              key={toastEntry.id}
              swipeDirection={swipeDirectionValue}
              toast={toastEntry}
            >
              <Toast.Content className="pointer-events-auto flex items-center justify-between gap-1.5 overflow-hidden px-3.5 py-3 text-sm transition-opacity duration-250 data-behind:pointer-events-none data-behind:opacity-0 data-expanded:opacity-100">
                <div className="flex gap-2">
                  {Icon ? (
                    <div
                      className="[&>svg]:h-lh [&>svg]:w-4 [&_svg]:pointer-events-none [&_svg]:shrink-0"
                      data-slot="toast-icon"
                    >
                      <Icon className="in-data-[type=loading]:animate-spin in-data-[type=error]:text-destructive in-data-[type=info]:text-info in-data-[type=success]:text-success in-data-[type=warning]:text-warning in-data-[type=loading]:opacity-80" />
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-0.5">
                    <Toast.Title
                      className="font-medium"
                      data-slot="toast-title"
                    />
                    <Toast.Description
                      className="text-muted-foreground"
                      data-slot="toast-description"
                    />
                  </div>
                </div>
                {toastEntry.actionProps ? (
                  <Toast.Action
                    className={buttonVariants({ size: "xs" })}
                    data-slot="toast-action"
                  >
                    {toastEntry.actionProps.children}
                  </Toast.Action>
                ) : null}
              </Toast.Content>
            </Toast.Root>
          );
        })}
      </Toast.Viewport>
    </Toast.Portal>
  );
}

function AnchoredToastProvider({ children, ...props }: Toast.Provider.Props) {
  return (
    <Toast.Provider toastManager={anchoredToastManager} {...props}>
      {children}
      <AnchoredToasts />
    </Toast.Provider>
  );
}

function AnchoredToasts() {
  const { toasts } = Toast.useToastManager();

  return (
    <Toast.Portal data-slot="toast-portal-anchored">
      <Toast.Viewport
        className="outline-none"
        data-slot="toast-viewport-anchored"
      >
        {toasts.map((toastItem) => {
          const Icon = toastItem.type
            ? TOAST_ICONS[toastItem.type as keyof typeof TOAST_ICONS]
            : null;
          const tooltipStyle =
            (toastItem.data as { tooltipStyle?: boolean })?.tooltipStyle ??
            false;
          const positionerProps = toastItem.positionerProps;

          if (!positionerProps?.anchor) {
            return null;
          }

          return (
            <Toast.Positioner
              className="z-50 max-w-[min(--spacing(64),var(--available-width))]"
              data-slot="toast-positioner"
              key={toastItem.id}
              sideOffset={positionerProps.sideOffset ?? 4}
              toast={toastItem}
            >
              <Toast.Root
                className={cn(
                  "relative text-balance border bg-popover bg-clip-padding text-popover-foreground text-xs transition-[scale,opacity] before:pointer-events-none before:absolute before:inset-0 before:shadow-[0_1px_--theme(--color-black/4%)] data-ending-style:scale-98 data-starting-style:scale-98 data-ending-style:opacity-0 data-starting-style:opacity-0 dark:bg-clip-border dark:before:shadow-[0_-1px_--theme(--color-white/8%)]",
                  tooltipStyle
                    ? "rounded-none shadow-black/5 shadow-md before:rounded-none"
                    : "rounded-none shadow-lg before:rounded-none"
                )}
                data-slot="toast-popup"
                toast={toastItem}
              >
                {tooltipStyle ? (
                  <Toast.Content className="pointer-events-auto px-2 py-1">
                    <Toast.Title data-slot="toast-title" />
                  </Toast.Content>
                ) : (
                  <Toast.Content className="pointer-events-auto flex items-center justify-between gap-1.5 overflow-hidden px-3.5 py-3 text-sm">
                    <div className="flex gap-2">
                      {Icon ? (
                        <div
                          className="[&>svg]:h-lh [&>svg]:w-4 [&_svg]:pointer-events-none [&_svg]:shrink-0"
                          data-slot="toast-icon"
                        >
                          <Icon className="in-data-[type=loading]:animate-spin in-data-[type=error]:text-destructive in-data-[type=info]:text-info in-data-[type=success]:text-success in-data-[type=warning]:text-warning in-data-[type=loading]:opacity-80" />
                        </div>
                      ) : null}

                      <div className="flex flex-col gap-0.5">
                        <Toast.Title
                          className="font-medium"
                          data-slot="toast-title"
                        />
                        <Toast.Description
                          className="text-muted-foreground"
                          data-slot="toast-description"
                        />
                      </div>
                    </div>
                    {toastItem.actionProps ? (
                      <Toast.Action
                        className={buttonVariants({ size: "xs" })}
                        data-slot="toast-action"
                      >
                        {toastItem.actionProps.children}
                      </Toast.Action>
                    ) : null}
                  </Toast.Content>
                )}
              </Toast.Root>
            </Toast.Positioner>
          );
        })}
      </Toast.Viewport>
    </Toast.Portal>
  );
}

type ToastPromiseOptions<T> = {
  loading: string;
  success: string | ((data: T) => string);
  error: string | ((err: unknown) => string);
};

async function toastPromise<T>(
  promise: Promise<T>,
  options: ToastPromiseOptions<T>
): Promise<T> {
  const startTime = performance.now();

  const toastId = toastManager.add({
    title: options.loading,
    type: "loading",
    timeout: 0,
  });

  try {
    const result = await promise;
    const duration = Math.round(performance.now() - startTime);
    const successMessage =
      typeof options.success === "function"
        ? options.success(result)
        : options.success;

    toastManager.update(toastId, {
      title:
        process.env.NODE_ENV === "development"
          ? `${successMessage} (${duration}ms)`
          : successMessage,
      type: "success",
      timeout: 4000,
    });

    return result;
  } catch (err) {
    const duration = Math.round(performance.now() - startTime);
    const errorMessage =
      typeof options.error === "function" ? options.error(err) : options.error;

    toastManager.update(toastId, {
      title:
        process.env.NODE_ENV === "development"
          ? `${errorMessage} (${duration}ms)`
          : errorMessage,
      type: "error",
      timeout: 4000,
    });

    throw err;
  }
}

type ToastTimedOptions = {
  loading?: string;
};

async function toastTimed<T>(
  fn: () => Promise<T>,
  options?: ToastTimedOptions
): Promise<{
  data: T;
  duration: number;
  showSuccess: (title: string) => void;
  showError: (title: string) => void;
}> {
  const startTime = performance.now();

  const toastId = options?.loading
    ? toastManager.add({ title: options.loading, type: "loading", timeout: 0 })
    : null;

  const data = await fn();
  const duration = Math.round(performance.now() - startTime);
  const isDev = process.env.NODE_ENV === "development";

  return {
    data,
    duration,
    showSuccess: (title: string) => {
      const message = isDev ? `${title} (${duration}ms)` : title;
      if (toastId) {
        toastManager.update(toastId, {
          title: message,
          type: "success",
          timeout: 4000,
        });
      } else {
        toastManager.add({ title: message, type: "success" });
      }
    },
    showError: (title: string) => {
      const message = isDev ? `${title} (${duration}ms)` : title;
      if (toastId) {
        toastManager.update(toastId, {
          title: message,
          type: "error",
          timeout: 4000,
        });
      } else {
        toastManager.add({ title: message, type: "error" });
      }
    },
  };
}

const toast = {
  success: (title: string, description?: string) =>
    toastManager.add({ title, description, type: "success" }),
  error: (title: string, description?: string) =>
    toastManager.add({ title, description, type: "error" }),
  info: (title: string, description?: string) =>
    toastManager.add({ title, description, type: "info" }),
  warning: (title: string, description?: string) =>
    toastManager.add({ title, description, type: "warning" }),
  loading: (title: string, description?: string) =>
    toastManager.add({ title, description, type: "loading", timeout: 0 }),
  promise: toastPromise,
  timed: toastTimed,
};

export {
  ToastProvider,
  type ToastPosition,
  toastManager,
  toast,
  AnchoredToastProvider,
  anchoredToastManager,
};
