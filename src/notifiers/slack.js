export async function notifySlack(webhookUrl, entry, violationRate) {
  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: `[yoban ALERT]: \`${entry.service}\` on \`${entry.route}\` (${entry.tier}) has a *${(violationRate * 100).toFixed(2)}%* SLA violation rate!`
    })
  });
}
