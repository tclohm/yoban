# @tclohm/yoban
> Lightweight, universal middleware for real-time API performance monitoring and SLA alerting.

[![npm version](https://badge.fury.io/js/%40tclohm%2Fyoban.svg)](https://www.npmjs.com/package/@tclohm/yoban)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## Install
```bash
npm install @tclohm/yoban
```

---

## Quick Start
```javascript
import { Yoban } from '@tclohm/yoban';

const yoban = new Yoban({
  service: "payments",
  flushInterval: 10000,
  violationThreshold: 0.5,
  sla: { premium: 400, standard: 800 },
  notify: {
    slack: process.env.SLACK_WEBHOOK,
    pagerduty: process.env.PAGERDUTY_KEY
  },
  enrichEvent: (req) => ({
    tier: req.user?.tier ?? 'standard'
  })
});
```

---

## Framework Support

### Express
```javascript
app.use(yoban.middleware());
```

### Fastify
```javascript
fastify.addHook('onRequest', yoban.fastify().onRequest);
fastify.addHook('onResponse', yoban.fastify().onResponse);
```

### Koa
```javascript
app.use(yoban.koa());
```

### Hapi
```javascript
await server.register(yoban.hapi());
```

---

## Config

| Option | Type | Default | Description |
|---|---|---|---|
| `service` | string | required | Name of your service |
| `flushInterval` | number | 10000 | How often to flush in ms |
| `violationThreshold` | number | 0.5 | Violation rate to trigger alert (0-1) |
| `sla` | object | — | SLA thresholds per tier in ms |
| `notify.slack` | string | — | Slack webhook URL |
| `notify.pagerduty` | string | — | PagerDuty routing key |
| `enrichEvent` | function | — | Attach custom metadata per request |

---

## How It Works
```
Request → Adapter (Express/Fastify/Koa/Hapi)
        → Buffer
        → Flush every N seconds
        → Aggregate (mean, median, violation rate)
        → Alert if violation rate exceeds threshold
        → Notify (Slack, PagerDuty)
```

---

## Roadmap

### v1.1
- [ ] TypeScript support
- [ ] Config file support (`.yobanrc`)

### v1.2
- [ ] p50 / p90 / p95 percentiles in output
- [ ] Email notifications via SendGrid
- [ ] SMS notifications via Twilio
- [ ] Discord webhook support

### v2.0
- [ ] Persistent storage — keep metrics across restarts
- [ ] Dashboard UI to visualize metrics and violation rates
- [ ] Anomaly detection — alert when something is unusually slow
- [ ] Trend detection — "this endpoint has been getting slower over 24 hours"
- [ ] Auto-tune SLA thresholds based on historical baselines

### v2.1
- [ ] Export to Datadog, Prometheus, Grafana
- [ ] Kubernetes health check endpoint
- [ ] CLI tool to replay and analyze log files

---

## License
MIT © [tclohm](https://github.com/tclohm)
