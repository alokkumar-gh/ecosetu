/**
 * EcoSetu Backend Event Bus
 * Lightweight in-process event emitter for asynchronous domain events:
 * - COLLECTOR_AVAILABILITY_CHANGED
 * - COLLECTOR_PICKUP_REQUEST_AVAILABLE
 * - PICKUP_REQUEST_SUBMITTED
 * 
 * Canonical Reference: docs/10_BACKEND_ARCHITECTURE.md
 */

const EventEmitter = require('events');

class EcoSetuEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50);
  }
}

const eventBus = new EcoSetuEventBus();

module.exports = eventBus;
