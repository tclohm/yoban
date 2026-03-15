class MetricsSDK {
  constructor(config) {
    this.config = config;
    this.buffer = [];
    this.aggregated = [];
    this.startFlushing();
  }

  #parse(events) {
    const groups = new Map();

    for (const event of events) {
      const key = `${event.service} ${event.route} ${event.tier}`;
      if (!groups.has(key)) {
        groups.set(key, { service: event.service, route: event.route, tier: event.tier, durations: [] });
      }
      groups.get(key).durations.push(event.duration)
    }

    return Array.from(groups.values()).map(({ service, route, tier, durations }) => {
      const sorted = [...durations].sort((a,b) => a - b);
      const mean = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      const mid = Math.floor(sorted.length / 2);
      const median = sorted.length % 2 == 0 ? (sorted[mid - 1] + mid[mid]) / 2 : sorted[mid];
      return { service, route, tier, mean: Math.round(mean), median, durations };
    });
  }


  #checkAlerts() {
    for (const entry of this.aggregated) { 
      const threshold = this.config.sla[entry.tier];
      const violations = entry.durations.filter(d => d > threshold).length; 
      const violationRate = violations / entry.durations.length;

      if (violationRate > this.config.violationThreshold) {
        console.log(`[ ALERT ]: ${entry.service} violation rate ${(violationRate * 100).toFixed(2)}%`);
      }
    }
  }


  middleware() {
    return (req, res, next) => {
      const start = Date.now();

      res.on('finish', () => {
        const duration = Date.now() - start;
        const extra = this.config.enrichEvent ? this.config.enrichEvent(req) : {};

        this.buffer.push({
          service: this.config.service,
          method: req.method,
          route: req.route?.path,
          status: res.statusCode,
          duration,
          timestamp: Date.now(),
          ...extra // custom metadata
        });
      });
      next();
    }
  }


  startFlushing() {
    setInterval(() => this.flush(), this.config.flushInterval ?? 10000);
  }

  flush() {
    const events = this.buffer.splice(0);
    if (events.length === 0) return; // dont flush empty buffer 
    this.aggregated = [...this.aggregated, ...parse(events)];
    console.log(`Flushing ${events.length} events`, events);
  }

}
