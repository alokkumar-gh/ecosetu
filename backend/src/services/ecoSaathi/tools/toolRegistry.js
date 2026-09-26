// EcoSetu Tool Registry & Schema Definitions
// Canonical Reference: docs/10_BACKEND_ARCHITECTURE.md

const { ROLES } = require('../../../utils/constants');
const readTools = require('./readTools');
const writeTools = require('./writeTools');

const TOOL_DEFINITIONS = [
  // ── READ TOOLS ──
  {
    name: 'getUserProfile',
    type: 'READ',
    description: 'Get authenticated user profile details, roles, city, and total pickups.',
    parameters: {
      type: 'object',
      properties: {},
    },
    allowedRoles: [ROLES.CITIZEN, ROLES.INFORMAL_COLLECTOR, ROLES.RECYCLER, ROLES.ADMIN],
    handler: readTools.getUserProfile.bind(readTools),
  },
  {
    name: 'getPickupRequests',
    type: 'READ',
    description: 'List collection/pickup requests belonging to the current user or available for pickup.',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Maximum number of requests to return (1-20)' },
      },
    },
    allowedRoles: [ROLES.CITIZEN, ROLES.INFORMAL_COLLECTOR, ROLES.ADMIN],
    handler: readTools.getPickupRequests.bind(readTools),
  },
  {
    name: 'getPickupRequestDetails',
    type: 'READ',
    description: 'Get detailed item list, offers received, and status for a specific pickup request.',
    parameters: {
      type: 'object',
      properties: {
        requestId: { type: 'string', description: 'The UUID of the collection request' },
      },
      required: ['requestId'],
    },
    allowedRoles: [ROLES.CITIZEN, ROLES.INFORMAL_COLLECTOR, ROLES.ADMIN],
    handler: readTools.getPickupRequestDetails.bind(readTools),
  },
  {
    name: 'getPickupRequestStatus',
    type: 'READ',
    description: 'Get clear human-readable status explanation and next action for a pickup request.',
    parameters: {
      type: 'object',
      properties: {
        requestId: { type: 'string', description: 'The UUID of the collection request' },
      },
      required: ['requestId'],
    },
    allowedRoles: [ROLES.CITIZEN, ROLES.INFORMAL_COLLECTOR, ROLES.ADMIN],
    handler: readTools.getPickupRequestStatus.bind(readTools),
  },
  {
    name: 'getReceivedOffers',
    type: 'READ',
    description: 'Get all collector price offers for a collection request.',
    parameters: {
      type: 'object',
      properties: {
        requestId: { type: 'string', description: 'Optional request UUID. If omitted, latest active request is used.' },
      },
    },
    allowedRoles: [ROLES.CITIZEN, ROLES.ADMIN],
    handler: readTools.getReceivedOffers.bind(readTools),
  },
  {
    name: 'getOfferDetails',
    type: 'READ',
    description: 'Get details of a specific price offer submitted by a collector.',
    parameters: {
      type: 'object',
      properties: {
        offerId: { type: 'string', description: 'The UUID of the offer' },
      },
      required: ['offerId'],
    },
    allowedRoles: [ROLES.CITIZEN, ROLES.INFORMAL_COLLECTOR, ROLES.ADMIN],
    handler: readTools.getOfferDetails.bind(readTools),
  },
  {
    name: 'getCategoryPricing',
    type: 'READ',
    description: 'Get standard market reference prices per kg for an e-waste category (e.g. CIRCUIT_BOARD, MOBILE_PHONE, LAPTOP, BATTERY, CABLE_CHARGER).',
    parameters: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'E-waste category code' },
        weightKg: { type: 'number', description: 'Approximate weight in kg' },
      },
    },
    allowedRoles: [ROLES.CITIZEN, ROLES.INFORMAL_COLLECTOR, ROLES.RECYCLER, ROLES.ADMIN],
    handler: readTools.getCategoryPricing.bind(readTools),
  },
  {
    name: 'calculateItemValue',
    type: 'READ',
    description: 'Calculate grounded deterministic estimated value range for an e-waste item based on category, condition, weight, and market benchmarks.',
    parameters: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'E-waste category code (e.g. LAPTOP, MOBILE_PHONE)' },
        condition: { type: 'string', description: 'Condition: WORKING, TESTED_WORKING, REPAIRABLE, PARTIALLY_WORKING, NOT_WORKING, DAMAGED, UNKNOWN' },
        weightKg: { type: 'number', description: 'Weight in kg if available' },
        location: { type: 'string', description: 'Optional location code' },
      },
      required: ['category'],
    },
    allowedRoles: [ROLES.CITIZEN, ROLES.INFORMAL_COLLECTOR, ROLES.RECYCLER, ROLES.ADMIN],
    handler: readTools.calculateItemValue.bind(readTools),
  },
  {
    name: 'getMatchingRequests',
    type: 'READ',
    description: 'Get open e-waste collection requests eligible and recommended for the current collector with transparent distance and valuation signals.',
    parameters: {
      type: 'object',
      properties: {
        filterCategory: { type: 'string', description: 'Filter by category (e.g. LAPTOP, MOBILE_PHONE)' },
        maxDistanceKm: { type: 'number', description: 'Maximum distance in kilometers' },
        sortBy: { type: 'string', description: 'Sort by: distance, value, newest, score' },
      },
    },
    allowedRoles: [ROLES.INFORMAL_COLLECTOR, ROLES.ADMIN],
    handler: readTools.getMatchingRequests.bind(readTools),
  },
  {
    name: 'checkOfferSanity',
    type: 'READ',
    description: 'Check collector offer amount against platform benchmark range to provide non-blocking sanity guidance.',
    parameters: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'E-waste category code' },
        condition: { type: 'string', description: 'Hardware condition' },
        weightKg: { type: 'number', description: 'Weight in kg' },
        offeredPrice: { type: 'number', description: 'Proposed offer price in INR' },
      },
      required: ['category', 'offeredPrice'],
    },
    allowedRoles: [ROLES.INFORMAL_COLLECTOR, ROLES.ADMIN],
    handler: readTools.checkOfferSanity.bind(readTools),
  },
  {
    name: 'getCollectorNegotiations',
    type: 'READ',
    description: 'Get pending negotiations and citizen counter-offers that require collector response.',
    parameters: {
      type: 'object',
      properties: {},
    },
    allowedRoles: [ROLES.INFORMAL_COLLECTOR, ROLES.ADMIN],
    handler: readTools.getCollectorNegotiations.bind(readTools),
  },
  {
    name: 'getCollectorActivePickups',
    type: 'READ',
    description: 'Get active scheduled pickups assigned to this collector.',
    parameters: {
      type: 'object',
      properties: {},
    },
    allowedRoles: [ROLES.INFORMAL_COLLECTOR, ROLES.ADMIN],
    handler: readTools.getCollectorActivePickups.bind(readTools),
  },
  {
    name: 'getCollectorMetrics',
    type: 'READ',
    description: 'Get dashboard summary metrics for the collector.',
    parameters: {
      type: 'object',
      properties: {},
    },
    allowedRoles: [ROLES.INFORMAL_COLLECTOR, ROLES.ADMIN],
    handler: readTools.getCollectorMetrics.bind(readTools),
  },
  {
    name: 'getLifecycleTrace',
    type: 'READ',
    description: 'Get server-authoritative end-to-end e-waste lifecycle trace, chronological event timeline, delay status, and next step.',
    parameters: {
      type: 'object',
      properties: {
        requestId: { type: 'string', description: 'Optional collection request UUID' },
        itemId: { type: 'string', description: 'Optional e-waste item UUID' },
        language: { type: 'string', description: 'Preferred language: en, hi, or' },
      },
    },
    allowedRoles: [ROLES.CITIZEN, ROLES.INFORMAL_COLLECTOR, ROLES.RECYCLER, ROLES.ADMIN],
    handler: readTools.getLifecycleTrace.bind(readTools),
  },
  {
    name: 'getAttentionSummary',
    type: 'READ',
    description: 'Get proactive attention summary of pending actionable items requiring user response.',
    parameters: {
      type: 'object',
      properties: {
        language: { type: 'string', description: 'Preferred language: en, hi, or' },
      },
    },
    allowedRoles: [ROLES.CITIZEN, ROLES.INFORMAL_COLLECTOR, ROLES.RECYCLER, ROLES.ADMIN],
    handler: readTools.getAttentionSummary.bind(readTools),
  },

  // ── WRITE TOOLS (Require Confirmation) ──
  {
    name: 'createPickupRequest',
    type: 'WRITE',
    description: 'Create a new e-waste collection pickup request.',
    parameters: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'E-waste category (e.g. CIRCUIT_BOARD, MOBILE_PHONE, LAPTOP)' },
        condition: { type: 'string', description: 'Condition: WORKING, DAMAGED, SCRAP, UNKNOWN' },
        estimatedWeightKg: { type: 'number', description: 'Estimated weight in kg' },
        pickupAddress: { type: 'string', description: 'Full doorstep pickup address' },
        notes: { type: 'string', description: 'Optional instructions' },
      },
      required: ['category', 'pickupAddress'],
    },
    allowedRoles: [ROLES.CITIZEN],
    handler: writeTools.createPickupRequest.bind(writeTools),
  },
  {
    name: 'sendCounterOffer',
    type: 'WRITE',
    description: 'Submit a price counter-offer to negotiate with a collector.',
    parameters: {
      type: 'object',
      properties: {
        offerId: { type: 'string', description: 'The offer UUID to counter' },
        counterPrice: { type: 'number', description: 'Desired price in INR' },
        notes: { type: 'string', description: 'Optional reason or note' },
        requestId: { type: 'string', description: 'Optional request UUID' },
      },
      required: ['offerId', 'counterPrice'],
    },
    allowedRoles: [ROLES.CITIZEN],
    handler: writeTools.sendCounterOffer.bind(writeTools),
  },
  {
    name: 'acceptOffer',
    type: 'WRITE',
    description: 'Accept a collector offer and assign the pickup.',
    parameters: {
      type: 'object',
      properties: {
        offerId: { type: 'string', description: 'The offer UUID to accept' },
        requestId: { type: 'string', description: 'Optional request UUID' },
      },
      required: ['offerId'],
    },
    allowedRoles: [ROLES.CITIZEN],
    handler: writeTools.acceptOffer.bind(writeTools),
  },
  {
    name: 'cancelPickupRequest',
    type: 'WRITE',
    description: 'Cancel an open collection request.',
    parameters: {
      type: 'object',
      properties: {
        requestId: { type: 'string', description: 'The UUID of the request to cancel' },
        reason: { type: 'string', description: 'Reason for cancellation' },
      },
      required: ['requestId'],
    },
    allowedRoles: [ROLES.CITIZEN],
    handler: writeTools.cancelPickupRequest.bind(writeTools),
  },
];

class ToolRegistry {
  constructor() {
    this.tools = new Map();
    for (const def of TOOL_DEFINITIONS) {
      this.tools.set(def.name, def);
    }
  }

  /**
   * Get all tools permitted for a user role
   * @param {string} role
   * @returns {Array<object>}
   */
  getPermittedTools(role) {
    const list = [];
    for (const tool of this.tools.values()) {
      if (!tool.allowedRoles || tool.allowedRoles.includes(role)) {
        list.push({
          name: tool.name,
          type: tool.type,
          description: tool.description,
          parameters: tool.parameters,
        });
      }
    }
    return list;
  }

  /**
   * Get tool definition by name
   * @param {string} name
   */
  getTool(name) {
    return this.tools.get(name) || null;
  }

  /**
   * Execute a tool with authorization and error safety
   * @param {object} actor - Authenticated user { id, role }
   * @param {string} toolName
   * @param {object} params
   */
  async execute(actor, toolName, params = {}) {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool '${toolName}' not found`);
    }

    if (tool.allowedRoles && !tool.allowedRoles.includes(actor.role)) {
      throw new Error(`Unauthorized: Role '${actor.role}' cannot execute '${toolName}'`);
    }

    return await tool.handler(actor, params);
  }

  /**
   * Helper alias for executeTool(toolName, params, actor)
   */
  async executeTool(toolName, params = {}, actor) {
    try {
      const data = await this.execute(actor, toolName, params);
      return {
        success: true,
        data,
      };
    } catch (err) {
      return {
        success: false,
        message: err.message || 'Tool execution failed',
      };
    }
  }
}

module.exports = new ToolRegistry();
