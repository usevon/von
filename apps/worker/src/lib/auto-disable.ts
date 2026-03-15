import { and, db, eq, gt, lt } from "@usevon/db";
import { endpoint, inboundEndpoint, member, user } from "@usevon/db/schema";
import { EndpointDisabledEmail, render } from "@usevon/email";
import { MS_PER_DAY } from "@usevon/utils";
import type { PgTableWithColumns } from "drizzle-orm/pg-core";
import { env } from "@/env";
import { resendClient } from "@/lib/email";
import { log } from "@/lib/logger";

async function sendDisabledAlert(
  endpointUrl: string,
  orgId: string
): Promise<void> {
  try {
    const [result] = await db
      .select({
        ownerEmail: user.email,
      })
      .from(member)
      .innerJoin(user, eq(user.id, member.userId))
      .where(eq(member.organizationId, orgId))
      .limit(1);

    if (!result) {
      return;
    }

    const now = new Date();
    const html = await render(
      EndpointDisabledEmail({
        endpointUrl,
        disabledAt: now.toLocaleString("en-US", {
          dateStyle: "long",
          timeStyle: "short",
        }),
        failureDays: env.AUTO_DISABLE_AFTER_DAYS,
        dashboardUrl: env.DASHBOARD_URL,
      })
    );

    await resendClient.sendEmail({
      to: result.ownerEmail,
      subject: `Endpoint auto-disabled: ${endpointUrl}`,
      html,
    });
  } catch (err) {
    log.error({ err, endpointUrl, orgId }, "Failed to send disabled alert");
  }
}

async function disableStaleEndpoints(
  // biome-ignore lint/suspicious/noExplicitAny: Drizzle PgTableWithColumns requires generic parameter
  table: PgTableWithColumns<any>,
  urlColumn: string
): Promise<number> {
  const cutoff = new Date(
    Date.now() - env.AUTO_DISABLE_AFTER_DAYS * MS_PER_DAY
  );
  const recentFailureCutoff = new Date(Date.now() - MS_PER_DAY);

  const stale = await db
    .update(table)
    .set({ status: "disabled", updatedAt: new Date() })
    .where(
      and(
        eq(table.status, "active"),
        eq(table.circuitState, "open"),
        lt(table.circuitOpenedAt, cutoff),
        gt(table.lastFailureAt, recentFailureCutoff)
      )
    )
    .returning({
      id: table.id,
      url: table[urlColumn],
      organizationId: table.organizationId,
    });

  for (const row of stale) {
    log.warn(
      { endpointId: row.id, url: row.url },
      "Endpoint auto-disabled after sustained failures"
    );
    await sendDisabledAlert(row.url, row.organizationId);
  }

  return stale.length;
}

const runAutoDisable = async () => {
  try {
    const [outbound, inbound] = await Promise.all([
      disableStaleEndpoints(endpoint, "url"),
      disableStaleEndpoints(inboundEndpoint, "forwardUrl"),
    ]);

    if (outbound > 0 || inbound > 0) {
      log.info(
        { outbound, inbound },
        "Auto-disable scan completed, endpoints disabled"
      );
    }
  } catch (error) {
    const cause =
      error instanceof Error
        ? (error as { cause?: { code?: string } }).cause
        : undefined;
    if (cause?.code === "42P01") {
      log.warn("Auto-disable scan skipped, tables do not exist yet");
    } else {
      log.error({ error }, "Auto-disable scan failed");
    }
  }
};

export const startAutoDisable = () => {
  if (!env.AUTO_DISABLE_ENABLED) {
    return () => undefined;
  }

  runAutoDisable();

  const timer = setInterval(() => {
    runAutoDisable();
  }, env.AUTO_DISABLE_CHECK_INTERVAL_MS);

  timer.unref?.();

  return () => {
    clearInterval(timer);
  };
};
