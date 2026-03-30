import { and, db, eq, gt, lt } from "@usevon/db";
import { endpoint, inboundEndpoint, member, user } from "@usevon/db/schema";
import { EndpointDisabledEmail, render } from "@usevon/email";
import { MS_PER_DAY } from "@usevon/utils";
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

async function alertStaleRows(
  rows: { id: string; url: string; organizationId: string }[]
) {
  for (const row of rows) {
    log.warn(
      { endpointId: row.id, url: row.url },
      "Endpoint auto-disabled after sustained failures"
    );
    await sendDisabledAlert(row.url, row.organizationId);
  }
}

const runAutoDisable = async () => {
  const cutoff = new Date(
    Date.now() - env.AUTO_DISABLE_AFTER_DAYS * MS_PER_DAY
  );
  const recentFailureCutoff = new Date(Date.now() - MS_PER_DAY);
  const now = new Date();

  try {
    const [outboundStale, inboundStale] = await Promise.all([
      db
        .update(endpoint)
        .set({ status: "disabled", updatedAt: now })
        .where(
          and(
            eq(endpoint.status, "active"),
            eq(endpoint.circuitState, "open"),
            lt(endpoint.circuitOpenedAt, cutoff),
            gt(endpoint.lastFailureAt, recentFailureCutoff)
          )
        )
        .returning({
          id: endpoint.id,
          url: endpoint.url,
          organizationId: endpoint.organizationId,
        }),
      db
        .update(inboundEndpoint)
        .set({ status: "disabled", updatedAt: now })
        .where(
          and(
            eq(inboundEndpoint.status, "active"),
            eq(inboundEndpoint.circuitState, "open"),
            lt(inboundEndpoint.circuitOpenedAt, cutoff),
            gt(inboundEndpoint.lastFailureAt, recentFailureCutoff)
          )
        )
        .returning({
          id: inboundEndpoint.id,
          url: inboundEndpoint.forwardUrl,
          organizationId: inboundEndpoint.organizationId,
        }),
    ]);

    await Promise.all([
      alertStaleRows(outboundStale),
      alertStaleRows(inboundStale),
    ]);

    if (outboundStale.length > 0 || inboundStale.length > 0) {
      log.info(
        { outbound: outboundStale.length, inbound: inboundStale.length },
        "Auto-disable scan completed, endpoints disabled"
      );
    }
  } catch (error) {
    log.error({ error }, "Auto-disable scan failed");
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
