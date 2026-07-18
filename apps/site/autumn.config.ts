// Pricing as code, `bunx atmn push` syncs this to Autumn (-p for production).

import { feature, item, plan } from "atmn";

export const messages = feature({
  id: "messages",
  name: "Messages",
  type: "metered",
  consumable: true,
});

export const free = plan({
  id: "free",
  name: "Free",
  autoEnable: true,
  items: [
    item({
      featureId: messages.id,
      included: 50_000,
      reset: { interval: "month" },
    }),
  ],
});

export const starter = plan({
  id: "starter",
  name: "Starter",
  price: { amount: 29, interval: "month" },
  items: [
    item({
      featureId: messages.id,
      included: 250_000,
      reset: { interval: "month" },
    }),
    item({
      featureId: messages.id,
      price: { amount: 1.0, billingUnits: 10_000, billingMethod: "usage_based" },
    }),
  ],
});

export const growth = plan({
  id: "growth",
  name: "Growth",
  price: { amount: 99, interval: "month" },
  items: [
    item({
      featureId: messages.id,
      included: 1_000_000,
      reset: { interval: "month" },
    }),
    item({
      featureId: messages.id,
      price: { amount: 0.5, billingUnits: 10_000, billingMethod: "usage_based" },
    }),
  ],
});

export const scale = plan({
  id: "scale",
  name: "Scale",
  price: { amount: 499, interval: "month" },
  items: [
    item({
      featureId: messages.id,
      included: 10_000_000,
      reset: { interval: "month" },
    }),
    item({
      featureId: messages.id,
      price: { amount: 0.25, billingUnits: 10_000, billingMethod: "usage_based" },
    }),
  ],
});
