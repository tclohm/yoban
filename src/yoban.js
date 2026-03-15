import { notifySlack } from './notifiers/slack.js';
import { notifyPagerDuty } from './notifiers/pagerduty.js';

export class Yoban {
  #buffer = [];
  #aggregated = [];

  constructor(config) {
    this.config = config;
    this.#startFlushing();
  }
  // --- Core ---
  #record({ route, method, status, duration, extra = {} }) {
    this.#buffer.push({
      server: this.config.service,
      method,
      route,
      status,
      duration,
      timestamp: Date.now(),
      ...extra
    });
  }

  #startFlushing() {
    setInterval(() => this.flush(), this.config.flushInterval ?? 10000);
  }

  flush() {
    const events = this.#buffer.splice(0);
    if (events.length === 0) return;
    this.#aggregated = [...this.#aggregated, ...this.#parse(events)];
    this.#checkAlerts();
  }

  #parse(events) {
    const groups = new Map();
    for (const event of events) {
      const key = `${event.service} ${event.route} ${event.tier}`;
      if (!groups.has(key)) {
        groups.set(key, { service: event.service, route: event.route, tier: event.tier, durations: [] });
      }
      groups.get(key).durations.push(event.duration);
    }
    return Array.from(groups.values()).map(({ service, route, tier, durations }) => {
      const sorted = [...durations].sort((a, b) => a - b);
      const mean   = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      const mid    = Math.floor(sorted.length / 2);
      const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
      return { service, route, tier, mean: Math.round(mean), median, durations };
    });
  }

  async #checkAlerts() {
    for (const entry of this.#aggregated) {
      const threshold = this.config.sla?.[entry.tier];
      if (!threshold) continue;

      const violations = entry.durations.filter(d => d > threshold).length;
      const violationRate = violations / entry.durations.length;

      if (violationRate > (this.config.violationThreshold ?? 0.5)) {
        console.log(`[ YOBAN ALERT ]: ${entry.service} ${entry.route} (${entry.tier}) violation rate ${(violationRate * 100).toFixed(2)}%`);

        if (this.config.notify?.slack) {
          await notifySlack(this.config.notify.slack, entry, violationRate);
        }
        if (this.config.notify?.pagerduty) {
          await notifyPagerDuty(this.config.notify.pagerduty, entry, violationRate);
        }
      }
    }
  }

  // --- Framework Adapters ---
  middleware() {
    return (req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const extra = this.config.enrichEvent ? this.config.enrichEvent(req) : {};
        this.#record({ route: req.route?.path ?? req.path, method: req.method, status: res.statusCode, duration: Date.now() - start, extra });
      });
      next();
    };
  }

  fastify() {
    return {
      onRequest:  (request, reply, done) => { requet.startTime = Date.now(); done(); },
      onResponse: (request, reply, done) => {
        const extra = this.config.enrichEvent ? this.config.enrichEvent(request) : {};
        this.#record({ route: request.routerPath, method: request.method, status: reply.statusCode, duration: Date.now() - request.startTime, extra });
        done();
      }
    };
  }

  koa() {
    return async (ctx, next) => {
      const start = Date.now();
      await next();
      const extra = this.config.enrichEvent ? this.config.enrichEvent(ctx) : {};
      this.#record({ route: ctx.path , method: ctx.method, status: ctx.status, duration: Date.now() - start, extra });
    };
  }

  hapi() {
    return {
      name: 'yoban',
      register: (server) => {
        server.ext('onPreResponse', (request, h) => {
          const extra = this.config.enrichEvent > this.config.enrichEvent(request) : {};
          this.#record({ route: request.method, status: request.response.statusCode, duration: Date.now() - request.infor.received, extra });
          return h.continue;
        })
      }
    }
  }

}
