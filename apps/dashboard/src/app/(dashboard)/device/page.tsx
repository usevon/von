import { Suspense } from "react";
import { DeviceAuthorization } from "@/components/device-authorization";

export default function DevicePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <DeviceAuthorization />
    </Suspense>
  );
}
