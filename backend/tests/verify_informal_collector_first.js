// EcoSetu Informal Collector First Workflow Verification Suite
// Canonical Reference: docs/01_PRD.md, docs/02_SYSTEM_ARCHITECTURE.md, docs/04_DATABASE_SCHEMA.md,
// docs/05_API_SPECIFICATION.md, docs/06_ROLES_AND_PERMISSIONS.md, docs/07_BUSINESS_WORKFLOWS.md,
// docs/21_TRACEABILITY_AND_AUDIT.md

const assert = require('assert');
const { randomUUID } = require('crypto');
const jwt = require('jsonwebtoken');
const http = require('http');
const app = require('../src/app');
const prisma = require('../src/config/database');
const environment = require('../src/config/environment');
const {
  ROLES,
  USER_STATUS,
  ITEM_STATUS,
  REQUEST_STATUS,
  PICKUP_STATUS,
  CONSIGNMENT_STATUS,
  RECYCLING_STATUS,
  AUDIT_ACTIONS,
  NOTIFICATION_TYPES,
} = require('../src/utils/constants');

async function runInformalCollectorFirstTests() {
  console.log('====================================================');
  console.log('ECOSETU INFORMAL COLLECTOR FIRST VERIFICATION SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  async function testAsync(name, fn) {
    total++;
    try {
      await fn();
      console.log(`✔ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] ${name}`);
      console.error(err);
    }
  }

  function createToken(user) {
    return jwt.sign({ userId: user.id }, environment.jwtAccessSecret, { expiresIn: '15m' });
  }

  // --- Entities & Test Identities ---
  const citizen1 = {
    id: 'a1111111-1111-4111-8111-111111111111',
    email: 'citizen1@ecosetu.org',
    name: 'Citizen Ananya',
    phone: '+919876543210',
    role: ROLES.CITIZEN,
    status: USER_STATUS.ACTIVE,
  };

  const citizen2 = {
    id: 'a2222222-2222-4222-8222-222222222222',
    email: 'citizen2@ecosetu.org',
    name: 'Citizen Rohan',
    phone: '+919876543220',
    role: ROLES.CITIZEN,
    status: USER_STATUS.ACTIVE,
  };

  const collector1 = {
    id: 'b1111111-1111-4111-8111-111111111111',
    email: 'collector1@ecosetu.org',
    name: 'Kabadiwala Ramesh',
    phone: '+919876543211',
    role: ROLES.INFORMAL_COLLECTOR,
    status: USER_STATUS.ACTIVE,
  };

  const collector2 = {
    id: 'b2222222-2222-4222-8222-222222222222',
    email: 'collector2@ecosetu.org',
    name: 'Kabadiwala Suresh',
    phone: '+919876543212',
    role: ROLES.INFORMAL_COLLECTOR,
    status: USER_STATUS.ACTIVE,
  };

  const recycler1 = {
    id: 'c1111111-1111-4111-8111-111111111111',
    email: 'recycler1@ecosetu.org',
    name: 'Green Earth Formal Recyclers Ltd',
    phone: '+919876543214',
    role: ROLES.RECYCLER,
    status: USER_STATUS.ACTIVE,
  };

  const admin1 = {
    id: 'e1111111-1111-4111-8111-111111111111',
    email: 'admin@ecosetu.org',
    name: 'System Admin',
    phone: '+919876543219',
    role: ROLES.ADMIN,
    status: USER_STATUS.ACTIVE,
  };

  const collector1Profile = {
    id: 'd1111111-1111-4111-8111-111111111111',
    userId: collector1.id,
    serviceAreaLat: 28.6139,
    serviceAreaLng: 77.2090,
    serviceRadiusKm: 10.0,
    isAvailable: true,
    totalPickups: 0,
    user: collector1,
  };

  const collector2Profile = {
    id: 'd2222222-2222-4222-8222-222222222222',
    userId: collector2.id,
    serviceAreaLat: 28.7000,
    serviceAreaLng: 77.3000,
    serviceRadiusKm: 5.0,
    isAvailable: true,
    totalPickups: 0,
    user: collector2,
  };

  const recycler1Profile = {
    id: 'f1111111-1111-4111-8111-111111111111',
    userId: recycler1.id,
    facilityName: 'Green Earth Formal Recycler Facility',
    facilityAddress: 'Plot 42, Eco Processing Park, Okhla, New Delhi',
    facilityLat: 28.5355,
    facilityLng: 77.2711,
    totalConsignments: 0,
    user: recycler1,
  };

  // --- In-Memory Stores ---
  const usersDb = new Map();
  [citizen1, citizen2, collector1, collector2, recycler1, admin1].forEach((u) => usersDb.set(u.id, u));

  const collectorProfilesDb = new Map();
  collectorProfilesDb.set(collector1.id, collector1Profile);
  collectorProfilesDb.set(collector2.id, collector2Profile);

  const recyclerProfilesDb = new Map();
  recyclerProfilesDb.set(recycler1Profile.id, recycler1Profile);
  recyclerProfilesDb.set(recycler1.id, recycler1Profile);

  const itemsDb = new Map();
  const requestsDb = new Map();
  const pickupsDb = new Map();
  const consignmentsDb = new Map();
  const consignmentItemsDb = new Map();
  const recyclingRecordsDb = new Map();
  const notificationsDb = [];
  const auditLogsDb = [];

  // --- Save Original Prisma Methods ---
  const orig = {
    userFindUnique: prisma.user.findUnique,
    userFindMany: prisma.user.findMany,
    collectorProfileFindUnique: prisma.collectorProfile.findUnique,
    collectorProfileFindMany: prisma.collectorProfile.findMany,
    collectorProfileUpdate: prisma.collectorProfile.update,
    recyclerProfileFindUnique: prisma.recyclerProfile.findUnique,
    recyclerProfileFindMany: prisma.recyclerProfile.findMany,
    recyclerProfileUpdate: prisma.recyclerProfile.update,
    ewasteItemCreate: prisma.ewasteItem.create,
    ewasteItemFindUnique: prisma.ewasteItem.findUnique,
    ewasteItemFindMany: prisma.ewasteItem.findMany,
    ewasteItemUpdate: prisma.ewasteItem.update,
    ewasteItemUpdateMany: prisma.ewasteItem.updateMany,
    collectionRequestCreate: prisma.collectionRequest.create,
    collectionRequestFindUnique: prisma.collectionRequest.findUnique,
    collectionRequestFindMany: prisma.collectionRequest.findMany,
    collectionRequestCount: prisma.collectionRequest.count,
    collectionRequestUpdate: prisma.collectionRequest.update,
    pickupCreate: prisma.pickup ? prisma.pickup.create : undefined,
    pickupFindUnique: prisma.pickup ? prisma.pickup.findUnique : undefined,
    pickupFindMany: prisma.pickup ? prisma.pickup.findMany : undefined,
    pickupUpdate: prisma.pickup ? prisma.pickup.update : undefined,
    consignmentCreate: prisma.consignment ? prisma.consignment.create : undefined,
    consignmentFindUnique: prisma.consignment ? prisma.consignment.findUnique : undefined,
    consignmentFindMany: prisma.consignment ? prisma.consignment.findMany : undefined,
    consignmentCount: prisma.consignment ? prisma.consignment.count : undefined,
    consignmentUpdate: prisma.consignment ? prisma.consignment.update : undefined,
    recyclingRecordCreate: prisma.recyclingRecord ? prisma.recyclingRecord.create : undefined,
    recyclingRecordFindUnique: prisma.recyclingRecord ? prisma.recyclingRecord.findUnique : undefined,
    recyclingRecordFindMany: prisma.recyclingRecord ? prisma.recyclingRecord.findMany : undefined,
    recyclingRecordCount: prisma.recyclingRecord ? prisma.recyclingRecord.count : undefined,
    recyclingRecordUpdate: prisma.recyclingRecord ? prisma.recyclingRecord.update : undefined,
    notificationCreate: prisma.notification.create,
    notificationCreateMany: prisma.notification.createMany,
    auditLogCreate: prisma.auditLog ? prisma.auditLog.create : undefined,
    transaction: prisma.$transaction,
  };

  // --- Prisma Mocking ---
  prisma.user.findUnique = async ({ where }) => usersDb.get(where.id) || null;

  prisma.collectorProfile.findUnique = async ({ where }) => {
    if (where.userId) return collectorProfilesDb.get(where.userId) || null;
    if (where.id) {
      for (const p of collectorProfilesDb.values()) {
        if (p.id === where.id) return p;
      }
    }
    return null;
  };

  prisma.recyclerProfile.findUnique = async ({ where, include }) => {
    let p = null;
    if (where.id) p = recyclerProfilesDb.get(where.id);
    else if (where.userId) p = recyclerProfilesDb.get(where.userId);
    if (!p) return null;
    const res = { ...p };
    if (include && include.user) {
      res.user = usersDb.get(p.userId);
    }
    return res;
  };

  prisma.recyclerProfile.findMany = async ({ where, include }) => {
    let list = Array.from(new Set(recyclerProfilesDb.values()));
    if (where && where.user) {
      list = list.filter((rp) => {
        const u = usersDb.get(rp.userId);
        if (!u) return false;
        if (where.user.status && u.status !== where.user.status) return false;
        return true;
      });
    }
    return list.map((p) => {
      const copy = { ...p };
      if (include && include.user) {
        copy.user = usersDb.get(p.userId);
      }
      return copy;
    });
  };

  prisma.recyclerProfile.update = async ({ where, data }) => {
    const profile = recyclerProfilesDb.get(where.id);
    if (!profile) throw new Error('Recycler profile not found');
    if (data.totalConsignments && data.totalConsignments.increment) {
      profile.totalConsignments = (profile.totalConsignments || 0) + data.totalConsignments.increment;
    }
    return profile;
  };

  prisma.ewasteItem.create = async ({ data }) => {
    const item = {
      id: randomUUID(),
      ...data,
      citizenId: citizen1.id,
      status: ITEM_STATUS.SUBMITTED,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    itemsDb.set(item.id, item);
    return { ...item };
  };

  prisma.ewasteItem.findUnique = async ({ where, include }) => {
    const item = itemsDb.get(where.id);
    if (!item) return null;
    const res = { ...item };
    if (include && include.citizen) {
      res.citizen = usersDb.get(res.citizenId);
    }
    if (include && include.collectionRequest) {
      const cr = item.collectionRequestId ? requestsDb.get(item.collectionRequestId) : null;
      if (cr) {
        res.collectionRequest = { ...cr };
        if (cr.collectorId) {
          for (const cp of collectorProfilesDb.values()) {
            if (cp.id === cr.collectorId) {
              res.collectionRequest.collector = { ...cp, user: usersDb.get(cp.userId) };
              break;
            }
          }
        }
        for (const p of pickupsDb.values()) {
          if (p.collectionRequestId === cr.id) {
            res.collectionRequest.pickup = p;
            break;
          }
        }
      }
    }
    if (include && include.consignmentItems) {
      const cItems = [];
      for (const ci of consignmentItemsDb.values()) {
        if (ci.ewasteItemId === item.id) {
          const c = consignmentsDb.get(ci.consignmentId);
          let recRecord = null;
          for (const rr of recyclingRecordsDb.values()) {
            if (rr.consignmentId === c?.id) {
              recRecord = rr;
              break;
            }
          }
          const colProf = c ? collectorProfilesDb.get(c.collectorId) : null;
          const recProf = c ? recyclerProfilesDb.get(c.recyclerId) : null;
          cItems.push({
            ...ci,
            consignment: c ? {
              ...c,
              collector: colProf ? { ...colProf, user: usersDb.get(colProf.userId) } : null,
              recycler: recProf ? { ...recProf, user: usersDb.get(recProf.userId) } : null,
              recyclingRecord: recRecord,
            } : null,
          });
        }
      }
      res.consignmentItems = cItems;
    }
    return res;
  };

  prisma.ewasteItem.findMany = async ({ where, include }) => {
    let list = Array.from(itemsDb.values());
    if (where && where.citizenId) {
      list = list.filter((i) => i.citizenId === where.citizenId);
    }
    if (where && where.id && where.id.in) {
      list = list.filter((i) => where.id.in.includes(i.id));
    }
    return list.map((item) => {
      const res = { ...item };
      if (include && include.collectionRequest) {
        res.collectionRequest = item.collectionRequestId ? requestsDb.get(item.collectionRequestId) : null;
      }
      if (include && include.consignmentItems) {
        const cItems = [];
        for (const ci of consignmentItemsDb.values()) {
          if (ci.ewasteItemId === item.id) {
            cItems.push({
              ...ci,
              consignment: consignmentsDb.get(ci.consignmentId),
            });
          }
        }
        res.consignmentItems = cItems;
      }
      return res;
    });
  };

  prisma.ewasteItem.update = async ({ where, data }) => {
    const item = itemsDb.get(where.id);
    if (!item) throw new Error('Item not found');
    Object.assign(item, data, { updatedAt: new Date() });
    itemsDb.set(where.id, item);
    return { ...item };
  };

  prisma.ewasteItem.updateMany = async ({ where, data }) => {
    let count = 0;
    for (const item of itemsDb.values()) {
      let match = true;
      if (where.id && where.id.in && !where.id.in.includes(item.id)) match = false;
      if (where.collectionRequestId && item.collectionRequestId !== where.collectionRequestId) match = false;
      if (match) {
        Object.assign(item, data, { updatedAt: new Date() });
        itemsDb.set(item.id, item);
        count++;
      }
    }
    return { count };
  };

  prisma.collectionRequest.create = async ({ data, include }) => {
    const reqId = randomUUID();
    const req = {
      id: reqId,
      ...data,
      status: REQUEST_STATUS.SUBMITTED,
      collectorId: null,
      submittedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    requestsDb.set(reqId, req);

    if (data.ewasteItems && data.ewasteItems.connect) {
      for (const conn of data.ewasteItems.connect) {
        const it = itemsDb.get(conn.id);
        if (it) {
          it.collectionRequestId = reqId;
          itemsDb.set(it.id, it);
        }
      }
    }

    const res = { ...req };
    if (include && include.ewasteItems) {
      res.ewasteItems = Array.from(itemsDb.values()).filter((i) => i.collectionRequestId === reqId);
    }
    return res;
  };

  prisma.collectionRequest.findUnique = async ({ where, include }) => {
    const r = requestsDb.get(where.id);
    if (!r) return null;
    const res = { ...r };
    if (include && include.ewasteItems) {
      res.ewasteItems = Array.from(itemsDb.values()).filter((i) => i.collectionRequestId === r.id);
    }
    if (include && include.citizen) {
      res.citizen = usersDb.get(r.citizenId);
    }
    if (include && include.collector) {
      for (const p of collectorProfilesDb.values()) {
        if (p.id === r.collectorId) {
          res.collector = { ...p, user: usersDb.get(p.userId) };
          break;
        }
      }
    }
    return res;
  };

  prisma.collectionRequest.findMany = async ({ where, include }) => {
    let list = Array.from(requestsDb.values());
    if (where && where.citizenId) {
      list = list.filter((r) => r.citizenId === where.citizenId);
    }
    if (where && where.status) {
      list = list.filter((r) => r.status === where.status);
    }
    return list.map((r) => {
      const copy = { ...r };
      if (include && include.ewasteItems) {
        copy.ewasteItems = Array.from(itemsDb.values()).filter((i) => i.collectionRequestId === r.id);
      }
      return copy;
    });
  };

  prisma.collectionRequest.count = async ({ where }) => {
    let list = Array.from(requestsDb.values());
    if (where && where.citizenId) {
      list = list.filter((r) => r.citizenId === where.citizenId);
    }
    if (where && where.status) {
      list = list.filter((r) => r.status === where.status);
    }
    return list.length;
  };

  prisma.collectionRequest.update = async ({ where, data, include }) => {
    const r = requestsDb.get(where.id);
    if (!r) throw new Error('Collection request not found');
    Object.assign(r, data, { updatedAt: new Date() });
    requestsDb.set(where.id, r);

    const res = { ...r };
    if (include && include.ewasteItems) {
      res.ewasteItems = Array.from(itemsDb.values()).filter((i) => i.collectionRequestId === r.id);
    }
    if (include && include.collector) {
      for (const p of collectorProfilesDb.values()) {
        if (p.id === r.collectorId) {
          res.collector = { ...p, user: usersDb.get(p.userId) };
          break;
        }
      }
    }
    return res;
  };

  if (prisma.pickup) {
    prisma.pickup.create = async ({ data }) => {
      const p = { id: randomUUID(), ...data, createdAt: new Date(), updatedAt: new Date() };
      pickupsDb.set(p.id, p);
      return p;
    };
    prisma.pickup.findUnique = async ({ where }) => pickupsDb.get(where.id) || null;
    prisma.pickup.update = async ({ where, data }) => {
      const p = pickupsDb.get(where.id);
      if (!p) throw new Error('Pickup not found');
      Object.assign(p, data, { updatedAt: new Date() });
      pickupsDb.set(where.id, p);
      return p;
    };
  }

  if (prisma.consignment) {
    prisma.consignment.create = async ({ data, include }) => {
      const id = randomUUID();
      const consignment = {
        id,
        collectorId: data.collectorId,
        recyclerId: data.recyclerId,
        status: CONSIGNMENT_STATUS.CREATED,
        totalWeightKg: data.totalWeightKg,
        notes: data.notes || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      consignmentsDb.set(id, consignment);

      if (data.consignmentItems && data.consignmentItems.create) {
        for (const itemData of data.consignmentItems.create) {
          const ci = {
            id: randomUUID(),
            consignmentId: id,
            ewasteItemId: itemData.ewasteItemId,
            notes: itemData.notes || null,
          };
          consignmentItemsDb.set(ci.id, ci);
        }
      }

      const res = { ...consignment };
      if (include && include.consignmentItems) {
        res.consignmentItems = Array.from(consignmentItemsDb.values()).filter((ci) => ci.consignmentId === id);
      }
      return res;
    };

    prisma.consignment.findUnique = async ({ where, include }) => {
      const c = consignmentsDb.get(where.id);
      if (!c) return null;
      const res = { ...c };
      if (include && include.consignmentItems) {
        res.consignmentItems = Array.from(consignmentItemsDb.values())
          .filter((ci) => ci.consignmentId === c.id)
          .map((ci) => ({ ...ci, ewasteItem: itemsDb.get(ci.ewasteItemId) }));
      }
      if (include && include.collector) {
        for (const cp of collectorProfilesDb.values()) {
          if (cp.id === c.collectorId) res.collector = cp;
        }
      }
      if (include && include.recycler) {
        res.recycler = recyclerProfilesDb.get(c.recyclerId);
      }
      return res;
    };

    prisma.consignment.findMany = async ({ where, skip = 0, take = 20, include }) => {
      let list = Array.from(consignmentsDb.values());
      if (where && where.collectorId) list = list.filter((c) => c.collectorId === where.collectorId);
      if (where && where.recyclerId) list = list.filter((c) => c.recyclerId === where.recyclerId);
      if (where && where.status) list = list.filter((c) => c.status === where.status);
      const sliced = list.slice(skip, skip + take);
      return sliced.map((c) => {
        const copy = { ...c };
        if (include && include.consignmentItems) {
          copy.consignmentItems = Array.from(consignmentItemsDb.values())
            .filter((ci) => ci.consignmentId === c.id)
            .map((ci) => ({ ...ci, ewasteItem: itemsDb.get(ci.ewasteItemId) }));
        }
        return copy;
      });
    };

    prisma.consignment.count = async ({ where }) => {
      let list = Array.from(consignmentsDb.values());
      if (where && where.collectorId) list = list.filter((c) => c.collectorId === where.collectorId);
      if (where && where.recyclerId) list = list.filter((c) => c.recyclerId === where.recyclerId);
      if (where && where.status) list = list.filter((c) => c.status === where.status);
      return list.length;
    };

    prisma.consignment.update = async ({ where, data, include }) => {
      const c = consignmentsDb.get(where.id);
      if (!c) throw new Error('Consignment not found');
      Object.assign(c, data, { updatedAt: new Date() });
      consignmentsDb.set(where.id, c);
      const res = { ...c };
      if (include && include.consignmentItems) {
        res.consignmentItems = Array.from(consignmentItemsDb.values())
          .filter((ci) => ci.consignmentId === c.id)
          .map((ci) => ({ ...ci, ewasteItem: itemsDb.get(ci.ewasteItemId) }));
      }
      if (include && include.collector) {
        for (const cp of collectorProfilesDb.values()) {
          if (cp.id === c.collectorId) res.collector = cp;
        }
      }
      if (include && include.recycler) {
        res.recycler = recyclerProfilesDb.get(c.recyclerId);
      }
      return res;
    };
  }

  if (prisma.recyclingRecord) {
    prisma.recyclingRecord.create = async ({ data }) => {
      const r = {
        id: randomUUID(),
        ...data,
        processingStartedAt: null,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      recyclingRecordsDb.set(r.id, r);
      return r;
    };
    prisma.recyclingRecord.findUnique = async ({ where, include }) => {
      const r = recyclingRecordsDb.get(where.id);
      if (!r) return null;
      const res = { ...r };
      if (include && include.consignment) {
        const c = consignmentsDb.get(r.consignmentId);
        if (c) {
          const cRes = { ...c };
          const cItems = Array.from(consignmentItemsDb.values())
            .filter((ci) => ci.consignmentId === c.id)
            .map((ci) => ({ ...ci, ewasteItem: itemsDb.get(ci.ewasteItemId) }));
          cRes.consignmentItems = cItems;
          res.consignment = cRes;
        }
      }
      if (include && include.recycler) {
        const rp = recyclerProfilesDb.get(r.recyclerId);
        res.recycler = rp ? { ...rp, user: usersDb.get(rp.userId) } : null;
      }
      return res;
    };
    prisma.recyclingRecord.findMany = async ({ where }) => {
      let list = Array.from(recyclingRecordsDb.values());
      if (where && where.recyclerId) list = list.filter((r) => r.recyclerId === where.recyclerId);
      return list;
    };
    prisma.recyclingRecord.count = async ({ where }) => {
      let list = Array.from(recyclingRecordsDb.values());
      if (where && where.recyclerId) list = list.filter((r) => r.recyclerId === where.recyclerId);
      return list.length;
    };
    prisma.recyclingRecord.update = async ({ where, data, include }) => {
      const r = recyclingRecordsDb.get(where.id);
      if (!r) throw new Error('RecyclingRecord not found');
      Object.assign(r, data, { updatedAt: new Date() });
      recyclingRecordsDb.set(where.id, r);
      const res = { ...r };
      if (include && include.consignment) {
        const c = consignmentsDb.get(r.consignmentId);
        if (c) {
          const cRes = { ...c };
          cRes.consignmentItems = Array.from(consignmentItemsDb.values())
            .filter((ci) => ci.consignmentId === c.id)
            .map((ci) => ({ ...ci, ewasteItem: itemsDb.get(ci.ewasteItemId) }));
          res.consignment = cRes;
        }
      }
      if (include && include.recycler) {
        const rp = recyclerProfilesDb.get(r.recyclerId);
        res.recycler = rp ? { ...rp, user: usersDb.get(rp.userId) } : null;
      }
      return res;
    };
  }

  prisma.notification.create = async ({ data }) => {
    const notif = { id: randomUUID(), ...data, createdAt: new Date() };
    notificationsDb.push(notif);
    return notif;
  };
  prisma.notification.createMany = async ({ data }) => {
    if (Array.isArray(data)) {
      data.forEach((d) => notificationsDb.push({ id: randomUUID(), ...d, createdAt: new Date() }));
      return { count: data.length };
    }
    return { count: 0 };
  };

  if (prisma.auditLog) {
    prisma.auditLog.create = async ({ data }) => {
      const log = { id: randomUUID(), ...data, createdAt: new Date() };
      auditLogsDb.push(log);
      return log;
    };
  }

  prisma.$transaction = async (cb) => {
    if (typeof cb === 'function') {
      return await cb(prisma);
    }
    return Array.isArray(cb) ? Promise.all(cb) : cb;
  };

  // --- HTTP Test Helper ---
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  async function makeRequest(method, path, body = null, token = null) {
    return new Promise((resolve, reject) => {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const dataStr = body ? JSON.stringify(body) : null;
      if (dataStr) headers['Content-Length'] = Buffer.byteLength(dataStr);

      const req = http.request(
        { hostname: '127.0.0.1', port, path, method, headers },
        (res) => {
          let rawData = '';
          res.on('data', (chunk) => { rawData += chunk; });
          res.on('end', () => {
            try {
              const parsed = rawData ? JSON.parse(rawData) : null;
              resolve({ status: res.statusCode, headers: res.headers, body: parsed });
            } catch (err) {
              resolve({ status: res.statusCode, headers: res.headers, rawText: rawData });
            }
          });
        }
      );
      req.on('error', reject);
      if (dataStr) req.write(dataStr);
      req.end();
    });
  }

  const citizen1Token = createToken(citizen1);
  const citizen2Token = createToken(citizen2);
  const collector1Token = createToken(collector1);
  const collector2Token = createToken(collector2);
  const recycler1Token = createToken(recycler1);
  const admin1Token = createToken(admin1);

  // Variables for tracking created items and requests across tests
  let createdItemId = null;
  let createdRequestId = null;
  let createdConsignmentId = null;
  let createdRecyclingRecordId = null;

  try {
    // -------------------------------------------------------------
    // RULE 1: CITIZEN → SUBMISSION & COLLECTION REQUEST CREATION
    // -------------------------------------------------------------
    await testAsync('Rule 1.1: Citizen can submit e-waste item (POST /ewaste-items)', async () => {
      const payload = {
        category: 'LAPTOP',
        description: 'Old Dell Inspiron laptop for local informal collection',
        quantity: 1,
        condition: 'NOT_WORKING',
        estimatedWeightKg: 2.5,
      };
      const res = await makeRequest('POST', '/api/v1/ewaste-items', payload, citizen1Token);
      assert.strictEqual(res.status, 201, `Expected 201, got ${res.status}: ${JSON.stringify(res.body)}`);
      assert(res.body.data?.item?.id, 'Response must contain created item id');
      assert.strictEqual(res.body.data.item.status, ITEM_STATUS.SUBMITTED);
      createdItemId = res.body.data.item.id;
    });

    await testAsync('Rule 1.2: Citizen CANNOT pass protected fields (status: COLLECTED) on submission', async () => {
      const maliciousPayload = {
        category: 'MOBILE_PHONE',
        description: 'Attempting to bypass collector by setting status',
        status: ITEM_STATUS.COLLECTED,
      };
      const res = await makeRequest('POST', '/api/v1/ewaste-items', maliciousPayload, citizen1Token);
      assert.strictEqual(res.status, 400, 'Protected status field must be rejected');
    });

    await testAsync('Rule 1.3: Citizen can create collection request with submitted item', async () => {
      const payload = {
        itemIds: [createdItemId],
        pickupAddress: 'Flat 302, Green Park Main, New Delhi 110016',
        pickupLat: 28.6139,
        pickupLng: 77.2090,
        preferredDate: '2026-10-01',
        preferredTimeStart: '10:00',
        preferredTimeEnd: '12:00',
        notes: 'Please pick up from ground floor',
      };
      const res = await makeRequest('POST', '/api/v1/collection-requests', payload, citizen1Token);
      assert.strictEqual(res.status, 201, `Expected 201, got ${res.status}: ${JSON.stringify(res.body)}`);
      assert(res.body.data?.request?.id, 'Must contain request id');
      assert.strictEqual(res.body.data.request.status, REQUEST_STATUS.SUBMITTED);
      createdRequestId = res.body.data.request.id;
    });

    await testAsync('Rule 1.4: Citizen CANNOT select or inject a recycler in collection request', async () => {
      const payload = {
        itemIds: [createdItemId],
        pickupAddress: 'Flat 302, Green Park Main, New Delhi 110016',
        pickupLat: 28.6139,
        pickupLng: 77.2090,
        recyclerId: recycler1Profile.id, // Unauthorized attempt to select recycler
        status: 'ACCEPTED',
      };
      const res = await makeRequest('POST', '/api/v1/collection-requests', payload, citizen1Token);
      assert.strictEqual(res.status, 400, 'Protected field (status) must be rejected by validator');
    });

    await testAsync('Rule 1.5: Citizen can view own collection requests', async () => {
      const res = await makeRequest('GET', '/api/v1/collection-requests', null, citizen1Token);
      assert.strictEqual(res.status, 200);
      assert(Array.isArray(res.body.data?.requests), 'Requests array must be returned');
      const found = res.body.data.requests.find((r) => r.id === createdRequestId);
      assert(found, 'Created request must be in citizen list');
    });

    await testAsync('Rule 1.6: Cross-tenant isolation: Other citizen CANNOT view request details', async () => {
      const res = await makeRequest('GET', `/api/v1/collection-requests/${createdRequestId}`, null, citizen2Token);
      assert.strictEqual(res.status, 403, 'Unrelated citizen must receive 403 Forbidden');
    });

    // -------------------------------------------------------------
    // RULE 2: ENFORCE NO DIRECT CITIZEN → RECYCLER / CONSIGNMENT PATH
    // -------------------------------------------------------------
    await testAsync('Rule 2.1: Citizen CANNOT list formal recyclers (GET /recyclers -> 403)', async () => {
      const res = await makeRequest('GET', '/api/v1/recyclers', null, citizen1Token);
      assert.strictEqual(res.status, 403, 'Citizen must be forbidden from listing recyclers');
    });

    await testAsync('Rule 2.2: Citizen CANNOT create a consignment (POST /consignments -> 403)', async () => {
      const payload = {
        recyclerId: recycler1Profile.id,
        itemIds: [createdItemId],
        notes: 'Direct citizen consignment attempt',
      };
      const res = await makeRequest('POST', '/api/v1/consignments', payload, citizen1Token);
      assert.strictEqual(res.status, 403, 'Citizen must be forbidden from creating consignments');
    });

    await testAsync('Rule 2.3: Citizen CANNOT list consignments (GET /consignments -> 403)', async () => {
      const res = await makeRequest('GET', '/api/v1/consignments', null, citizen1Token);
      assert.strictEqual(res.status, 403, 'Citizen must be forbidden from querying consignments');
    });

    await testAsync('Rule 2.4: Citizen CANNOT deliver a consignment (PATCH /consignments/:id/deliver -> 403)', async () => {
      const res = await makeRequest('PATCH', `/api/v1/consignments/${randomUUID()}/deliver`, {}, citizen1Token);
      assert.strictEqual(res.status, 403, 'Citizen must be forbidden from delivering consignments');
    });

    await testAsync('Rule 2.5: Citizen CANNOT accept a consignment (PATCH /consignments/:id/accept -> 403)', async () => {
      const res = await makeRequest('PATCH', `/api/v1/consignments/${randomUUID()}/accept`, {}, citizen1Token);
      assert.strictEqual(res.status, 403, 'Citizen must be forbidden from accepting consignments');
    });

    await testAsync('Rule 2.6: Citizen CANNOT reject a consignment (PATCH /consignments/:id/reject -> 403)', async () => {
      const res = await makeRequest('PATCH', `/api/v1/consignments/${randomUUID()}/reject`, { reason: 'No' }, citizen1Token);
      assert.strictEqual(res.status, 403, 'Citizen must be forbidden from rejecting consignments');
    });

    await testAsync('Rule 2.7: Citizen CANNOT start recycling processing (PATCH /recycling-records/:id/start-processing -> 403)', async () => {
      const res = await makeRequest('PATCH', `/api/v1/recycling-records/${randomUUID()}/start-processing`, {}, citizen1Token);
      assert.strictEqual(res.status, 403, 'Citizen must be forbidden from recycling processing');
    });

    await testAsync('Rule 2.8: Citizen CANNOT complete recycling (PATCH /recycling-records/:id/complete -> 403)', async () => {
      const res = await makeRequest('PATCH', `/api/v1/recycling-records/${randomUUID()}/complete`, { outputWeightKg: 10 }, citizen1Token);
      assert.strictEqual(res.status, 403, 'Citizen must be forbidden from completing recycling');
    });

    await testAsync('Rule 2.9: Citizen CANNOT accept collection request (POST /collection-requests/:id/accept -> 403)', async () => {
      const res = await makeRequest('POST', `/api/v1/collection-requests/${createdRequestId}/accept`, {}, citizen1Token);
      assert.strictEqual(res.status, 403, 'Citizen cannot accept collection requests');
    });

    // -------------------------------------------------------------
    // RULE 3: LOCAL INFORMAL COLLECTOR OPERATIONS
    // -------------------------------------------------------------
    await testAsync('Rule 3.1: Informal Collector CANNOT create collection requests (POST /collection-requests -> 403)', async () => {
      const payload = {
        itemIds: [createdItemId],
        pickupAddress: '123 Collector Lane',
        pickupLat: 28.6139,
        pickupLng: 77.2090,
      };
      const res = await makeRequest('POST', '/api/v1/collection-requests', payload, collector1Token);
      assert.strictEqual(res.status, 403, 'Collector cannot create collection requests (Citizen only)');
    });

    await testAsync('Rule 3.2: Local Collector Model: Collector discovers nearby requests with address masking', async () => {
      const res = await makeRequest('GET', '/api/v1/collection-requests/available?lat=28.6139&lng=77.2090&radiusKm=5', null, collector1Token);
      assert.strictEqual(res.status, 200);
      assert(Array.isArray(res.body.data?.requests), 'Available requests array must be returned');
      const req = res.body.data.requests.find((r) => r.id === createdRequestId);
      assert(req, 'Created request must be discovered by nearby collector');
      assert(req.pickupAddress.includes('Approximate Location'), 'Address must be privacy masked until accepted');
    });

    await testAsync('Rule 3.3: Informal Collector accepts citizen collection request', async () => {
      const res = await makeRequest('POST', `/api/v1/collection-requests/${createdRequestId}/accept`, {}, collector1Token);
      assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
      assert.strictEqual(res.body.data?.request?.status, REQUEST_STATUS.ACCEPTED);
      assert.strictEqual(res.body.data?.request?.collectorId, collector1Profile.id);
    });

    await testAsync('Rule 3.4: Collector CANNOT consign item while still in SUBMITTED status', async () => {
      const payload = {
        recyclerId: recycler1Profile.id,
        itemIds: [createdItemId],
        notes: 'Premature consignment attempt',
      };
      const res = await makeRequest('POST', '/api/v1/consignments', payload, collector1Token);
      assert.strictEqual(res.status, 400, 'Consignment must reject items not in COLLECTED status');
      const msg = res.body.error?.message || res.body.message || '';
      assert(msg.includes('Items must be in COLLECTED status'), `Expected error message about COLLECTED status, got: ${msg}`);
    });

    // Simulate successful pickup completion by collector
    // Updating item status to COLLECTED (as would occur via pickup completion)
    const currentItem = itemsDb.get(createdItemId);
    currentItem.status = ITEM_STATUS.COLLECTED;
    currentItem.actualWeightKg = 2.4;
    itemsDb.set(createdItemId, currentItem);

    for (const p of pickupsDb.values()) {
      if (p.collectionRequestId === createdRequestId) {
        p.status = PICKUP_STATUS.COMPLETED;
        p.completedAt = new Date();
      }
    }

    await testAsync('Rule 3.5: Collector CANNOT consign items collected by ANOTHER collector', async () => {
      const payload = {
        recyclerId: recycler1Profile.id,
        itemIds: [createdItemId],
        notes: 'Theft / cross-collector consignment attempt',
      };
      // Collector 2 attempting to consign Collector 1's collected item
      const res = await makeRequest('POST', '/api/v1/consignments', payload, collector2Token);
      assert.strictEqual(res.status, 403, 'Collector cannot consign items collected by another collector');
      const msg = res.body.error?.message || res.body.message || '';
      assert(msg.includes('You can only consign items that you collected'), `Expected error message, got: ${msg}`);
    });

    await testAsync('Rule 3.6: Informal Collector can list verified formal recyclers (GET /recyclers)', async () => {
      const res = await makeRequest('GET', '/api/v1/recyclers', null, collector1Token);
      assert.strictEqual(res.status, 200);
      assert(Array.isArray(res.body.data?.recyclers), 'Recyclers array must be returned');
      const found = res.body.data.recyclers.find((r) => r.id === recycler1Profile.id);
      assert(found, 'Active verified recycler must be visible to collector');
    });

    await testAsync('Rule 3.7: Informal Collector creates consignment to verified formal recycler', async () => {
      const payload = {
        recyclerId: recycler1Profile.id,
        itemIds: [createdItemId],
        notes: 'Delivering batch of collected large appliances',
      };
      const res = await makeRequest('POST', '/api/v1/consignments', payload, collector1Token);
      assert.strictEqual(res.status, 201, `Expected 201, got ${res.status}: ${JSON.stringify(res.body)}`);
      assert(res.body.data?.consignment?.id, 'Consignment must be created');
      assert.strictEqual(res.body.data.consignment.status, CONSIGNMENT_STATUS.CREATED);
      assert.strictEqual(res.body.data.consignment.collectorId, collector1Profile.id);
      assert.strictEqual(res.body.data.consignment.recyclerId, recycler1Profile.id);
      createdConsignmentId = res.body.data.consignment.id;
    });

    await testAsync('Rule 3.8: Informal Collector delivers consignment to formal recycler facility', async () => {
      const res = await makeRequest('PATCH', `/api/v1/consignments/${createdConsignmentId}/deliver`, {}, collector1Token);
      assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
      assert.strictEqual(res.body.data?.consignment?.status, CONSIGNMENT_STATUS.DELIVERED);
    });

    // -------------------------------------------------------------
    // RULE 4: FORMAL RECYCLER OPERATIONS
    // -------------------------------------------------------------
    await testAsync('Rule 4.1: Formal Recycler CANNOT accept collection requests directly from citizens', async () => {
      const res = await makeRequest('POST', `/api/v1/collection-requests/${createdRequestId}/accept`, {}, recycler1Token);
      assert.strictEqual(res.status, 403, 'Recycler cannot accept collection requests (Collector only)');
    });

    await testAsync('Rule 4.2: Formal Recycler accepts delivered collector consignment', async () => {
      const res = await makeRequest('PATCH', `/api/v1/consignments/${createdConsignmentId}/accept`, {}, recycler1Token);
      assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
      assert.strictEqual(res.body.data?.consignment?.status, CONSIGNMENT_STATUS.ACCEPTED);
      const recRecord = res.body.data?.consignment?.recyclingRecord;
      assert(recRecord?.id, 'Accepting consignment creates recycling record');
      createdRecyclingRecordId = recRecord.id;

      // Verify item transitioned to CONSIGNED
      const itemInDb = itemsDb.get(createdItemId);
      assert.strictEqual(itemInDb.status, ITEM_STATUS.CONSIGNED, 'Items must transition to CONSIGNED');
    });

    await testAsync('Rule 4.3: Formal Recycler starts material processing', async () => {
      const res = await makeRequest('PATCH', `/api/v1/recycling-records/${createdRecyclingRecordId}/start-processing`, {}, recycler1Token);
      assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
      assert.strictEqual(res.body.data?.recyclingRecord?.status, RECYCLING_STATUS.PROCESSING);
    });

    await testAsync('Rule 4.4: Formal Recycler completes material processing', async () => {
      const payload = {
        outputWeightKg: 38.2,
        processingNotes: 'Dismantled, metals and plastics segregated and processed.',
      };
      const res = await makeRequest('PATCH', `/api/v1/recycling-records/${createdRecyclingRecordId}/complete`, payload, recycler1Token);
      assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
      assert.strictEqual(res.body.data?.recyclingRecord?.status, RECYCLING_STATUS.COMPLETED);

      // Verify item transitioned to RECYCLED
      const itemInDb = itemsDb.get(createdItemId);
      assert.strictEqual(itemInDb.status, ITEM_STATUS.RECYCLED, 'Items must transition to RECYCLED');
    });

    // -------------------------------------------------------------
    // RULE 5: TRACEABILITY & AUDIT TRAIL VERIFICATION
    // -------------------------------------------------------------
    await testAsync('Rule 5.1: Citizen retrieves complete lifecycle traceability (GET /ewaste-items/:id/traceability)', async () => {
      const res = await makeRequest('GET', `/api/v1/ewaste-items/${createdItemId}/traceability`, null, citizen1Token);
      assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
      const data = res.body.data;
      assert(data, 'Data object must exist');
      assert.strictEqual(data.item?.status, ITEM_STATUS.RECYCLED);
      assert(Array.isArray(data.events), 'Events array must be present');
      assert.strictEqual(data.isComplete, true);
      const eventNames = data.events.map((e) => e.event);
      assert(eventNames.includes('ITEM_SUBMITTED'), 'Must contain ITEM_SUBMITTED');
      assert(eventNames.includes('REQUEST_SUBMITTED'), 'Must contain REQUEST_SUBMITTED');
      assert(eventNames.includes('REQUEST_ACCEPTED'), 'Must contain REQUEST_ACCEPTED');
      assert(eventNames.includes('PICKUP_COMPLETED'), 'Must contain PICKUP_COMPLETED');
      assert(eventNames.includes('CONSIGNMENT_CREATED'), 'Must contain CONSIGNMENT_CREATED');
      assert(eventNames.includes('CONSIGNMENT_ACCEPTED'), 'Must contain CONSIGNMENT_ACCEPTED');
      assert(eventNames.includes('RECYCLING_STARTED'), 'Must contain RECYCLING_STARTED');
      assert(eventNames.includes('RECYCLING_COMPLETED'), 'Must contain RECYCLING_COMPLETED');
    });

    await testAsync('Rule 5.2: Collector CANNOT view citizen item traceability endpoint (403)', async () => {
      const res = await makeRequest('GET', `/api/v1/ewaste-items/${createdItemId}/traceability`, null, collector1Token);
      assert.strictEqual(res.status, 403, 'Collector cannot query citizen traceability endpoint');
    });

    await testAsync('Rule 5.3: Recycler CANNOT view citizen item traceability endpoint (403)', async () => {
      const res = await makeRequest('GET', `/api/v1/ewaste-items/${createdItemId}/traceability`, null, recycler1Token);
      assert.strictEqual(res.status, 403, 'Recycler cannot query citizen traceability endpoint');
    });

    await testAsync('Rule 5.4: Admin has supervisory read access to traceability (200)', async () => {
      const res = await makeRequest('GET', `/api/v1/ewaste-items/${createdItemId}/traceability`, null, admin1Token);
      assert.strictEqual(res.status, 200, 'Admin can view any item traceability');
    });
  } finally {
    // Restore original methods
    prisma.user.findUnique = orig.userFindUnique;
    prisma.user.findMany = orig.userFindMany;
    prisma.collectorProfile.findUnique = orig.collectorProfileFindUnique;
    prisma.collectorProfile.findMany = orig.collectorProfileFindMany;
    prisma.collectorProfile.update = orig.collectorProfileUpdate;
    prisma.recyclerProfile.findUnique = orig.recyclerProfileFindUnique;
    prisma.recyclerProfile.findMany = orig.recyclerProfileFindMany;
    prisma.recyclerProfile.update = orig.recyclerProfileUpdate;
    prisma.ewasteItem.create = orig.ewasteItemCreate;
    prisma.ewasteItem.findUnique = orig.ewasteItemFindUnique;
    prisma.ewasteItem.findMany = orig.ewasteItemFindMany;
    prisma.ewasteItem.update = orig.ewasteItemUpdate;
    prisma.ewasteItem.updateMany = orig.ewasteItemUpdateMany;
    prisma.collectionRequest.create = orig.collectionRequestCreate;
    prisma.collectionRequest.findUnique = orig.collectionRequestFindUnique;
    prisma.collectionRequest.findMany = orig.collectionRequestFindMany;
    prisma.collectionRequest.count = orig.collectionRequestCount;
    prisma.collectionRequest.update = orig.collectionRequestUpdate;
    if (prisma.pickup) {
      prisma.pickup.create = orig.pickupCreate;
      prisma.pickup.findUnique = orig.pickupFindUnique;
      prisma.pickup.findMany = orig.pickupFindMany;
      prisma.pickup.update = orig.pickupUpdate;
    }
    if (prisma.consignment) {
      prisma.consignment.create = orig.consignmentCreate;
      prisma.consignment.findUnique = orig.consignmentFindUnique;
      prisma.consignment.findMany = orig.consignmentFindMany;
      prisma.consignment.count = orig.consignmentCount;
      prisma.consignment.update = orig.consignmentUpdate;
    }
    if (prisma.recyclingRecord) {
      prisma.recyclingRecord.create = orig.recyclingRecordCreate;
      prisma.recyclingRecord.findUnique = orig.recyclingRecordFindUnique;
      prisma.recyclingRecord.findMany = orig.recyclingRecordFindMany;
      prisma.recyclingRecord.count = orig.recyclingRecordCount;
      prisma.recyclingRecord.update = orig.recyclingRecordUpdate;
    }
    prisma.notification.create = orig.notificationCreate;
    prisma.notification.createMany = orig.notificationCreateMany;
    if (prisma.auditLog) {
      prisma.auditLog.create = orig.auditLogCreate;
    }
    prisma.$transaction = orig.transaction;

    await new Promise((resolve) => server.close(resolve));
  }

  console.log('\n====================================================');
  console.log(`INFORMAL COLLECTOR FIRST SUMMARY: ${passed}/${total} PASSED (${Math.round((passed / total) * 100)}% SUCCESS)`);
  console.log('====================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runInformalCollectorFirstTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
