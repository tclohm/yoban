export async function notifyPagerDuty(routingKey, entry, violationRate) {
  await fetch("https://events.pagerduty.com/v2/enqueue", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      routing_key: routingKey,
      event_action: "trigger",
      payload: {
        summary: `${entry.service} SLA violation on ${entry.route} (${entry.tier})`,
        severity: "critical",
        custom_details: {
          violationRate: `${(violationRate * 100).toFixed(2)}%`,
          mean: entry.mean,
          median: entry.median
        }
      }
    })
  });
}
