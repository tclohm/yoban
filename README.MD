# yoban

> Lightweight Express middleware for real-time API performance monitoring and SLA alerting.

## Install
```
npm install mihari 
```

## Usage
```javascript
import { MetricsSDK } from 'mihari';

const metrics = new MetricsSDK({
  service: "payments",
  flushInterval: 10000,       // flush every 10s
  violationThreshold: 0.5,    // alert if >50% of requests violate SLA
  sla: { premium: 400, standard: 800 },
  notify: {
    slack: process.env.SLACK_WEBHOOK,
    pagerduty: process.env.PAGERDUTY_KEY
  },
  enrichEvent: (req) => ({
    tier: req.user?.tier ?? 'standard'
  })
});

app.use(metrics.middleware());
```

## Config
| Option | Type | Default | Description |
|---|---|---|---|
| `service` | string | required | Name of your service |
| `flushInterval` | number | 10000 | How often to flush in ms |
| `violationThreshold` | number | 0.5 | Violation rate to trigger alert |
| `sla` | object | — | SLA thresholds per tier in ms |
| `notify.slack` | string | — | Slack webhook URL |
| `notify.pagerduty` | string | — | PagerDuty routing key |
| `enrichEvent` | function | — | Add custom metadata per request |

## License
MIT © tclohm
