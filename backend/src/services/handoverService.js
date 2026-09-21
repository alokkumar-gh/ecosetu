// EcoSetu Handover Service
// Canonical Reference: docs/25_SIH_26229_REQUIREMENTS.md Module 11 (SIH-HAND-001..007)

const crypto = require('crypto');
const prisma = require('../config/database');
const logger = require('../config/logger');
const AppError = require('../utils/AppError');
const auditService = require('./auditService');
const notificationService = require('./notificationService');
const { ROLES, USER_STATUS, HANDOVER_STATUS, QUOTE_STATUS, MATERIAL_LOT_STATUS } = require('../utils/constants');

class HandoverService {
  /**
   * Generate unique, human-readable handover reference number (HDO-YYYYMM-XXXXX)
   * @returns {string}
   */
  generateReferenceNumber() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase().substring(0, 5);
    return `HDO-${year}${month}-${randomHex}`;
  }

  /**
   * Helper: Get Collector Profile by User ID
   * @param {string} userId
   * @returns {Promise<object>}
   */
  async getCollectorProfileOrThrow(userId) {
    const profile = await prisma.collectorProfile.findUnique({
      where: { userId },
      include: { user: true },
    });
    if (!profile) {
      throw AppError.forbidden('Collector profile not found for this account');
    }
    return profile;
  }

  /**
   * Helper: Get Recycler Profile by User ID
   * @param {string} userId
   * @returns {Promise<object>}
   */
  async getRecyclerProfileOrThrow(userId) {
    const profile = await prisma.recyclerProfile.findUnique({
      where: { userId },
      include: { user: true },
    });
    if (!profile) {
      throw AppError.forbidden('Recycler profile not found for this account');
    }
    return profile;
  }

  /**
   * Helper: Resolve Actor to full user record
   */
  async resolveActor(actor) {
    if (!actor) {
      throw AppError.unauthorized('Authentication required');
    }
    if (typeof actor === 'string') {
      const user = await prisma.user.findUnique({ where: { id: actor } });
      if (!user) {
        throw AppError.unauthorized('User not found');
      }
      return user;
    }
    if (!actor.role && actor.id) {
      const user = await prisma.user.findUnique({ where: { id: actor.id } });
      if (!user) {
        throw AppError.unauthorized('User not found');
      }
      return user;
    }
    return actor;
  }

  /**
   * Initiate a new Digital Handover record
   * @param {object|string} actor - Authenticated user or user UUID
   * @param {object} data - Handover payload
   * @param {string} [ipAddress]
   * @returns {Promise<object>}
   */
  async createHandover(actor, data, ipAddress = null) {
    actor = await this.resolveActor(actor);
    // 1. Fetch Material Lot
    const lot = await prisma.materialLot.findUnique({
      where: { id: data.materialLotId },
      include: {
        collector: { include: { user: true } },
      },
    });

    if (!lot) {
      throw AppError.notFound('Material lot not found');
    }

    // 2. Fetch Quote
    const quote = await prisma.quote.findUnique({
      where: { id: data.quoteId },
      include: {
        recycler: { include: { user: true } },
      },
    });

    if (!quote) {
      throw AppError.notFound('Target quote not found');
    }

    // 3. Strict Accepted Quote Requirement
    if (quote.status !== QUOTE_STATUS.ACCEPTED) {
      throw AppError.badRequest(
        `Handover requires an ACCEPTED quote. Current quote status is: ${quote.status}`
      );
    }

    // 3b. Strict Recycler Authorization Check
    // Verify quoting recycler facility has not been suspended, expired, rejected, deactivated, or made inactive
    if (
      quote.recycler.user?.status !== USER_STATUS.ACTIVE ||
      quote.recycler.isActive === false ||
      !['AUTHORIZED', 'PROVISIONAL'].includes(quote.recycler.authorizationStatus)
    ) {
      throw AppError.badRequest('Handover cannot be created because the quoting recycler facility is no longer active and authorized');
    }

    // 4. Validate Quote matches Material Lot
    if (quote.materialLotId !== lot.id) {
      throw AppError.badRequest('Quote does not belong to the specified material lot');
    }

    // 5. Authorization Check: Actor must be the Lot Collector, the Quoting Recycler, or Admin
    const isCollectorOwner = lot.collector.userId === actor.id;
    const isRecyclerParty = quote.recycler.userId === actor.id;
    const isAdmin = actor.role === ROLES.ADMIN;

    if (!isCollectorOwner && !isRecyclerParty && !isAdmin) {
      throw AppError.forbidden('You do not have permission to initiate a handover for this lot');
    }

    // Collector-specific check: collector can only create handover for their own lots
    if (actor.role === ROLES.INFORMAL_COLLECTOR && !isCollectorOwner) {
      throw AppError.forbidden('You can only initiate handovers for your own material lots');
    }

    // Recycler-specific check: recycler can only initiate handover for their own accepted quote
    if (actor.role === ROLES.RECYCLER && !isRecyclerParty) {
      throw AppError.forbidden('Recycler cannot initiate handover for another facility quote');
    }

    // 6. Weight Validation
    let confirmedWeight = null;
    if (data.handoverWeightKg !== undefined && data.handoverWeightKg !== null) {
      const parsedWeight = parseFloat(data.handoverWeightKg);
      if (isNaN(parsedWeight) || parsedWeight <= 0) {
        throw AppError.badRequest('Handover weight must be a positive number');
      }
      confirmedWeight = parsedWeight;
    }

    const declaredWeight = lot.approximateTotalWeightKg ? Number(lot.approximateTotalWeightKg) : null;

    // 7. Location / GPS Handling (Strict Zero-Fabrication Policy)
    let latitude = null;
    let longitude = null;
    let locationAccuracy = null;
    let locationAvailable = false;

    if (data.latitude != null && data.longitude != null) {
      const lat = parseFloat(data.latitude);
      const lng = parseFloat(data.longitude);
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        latitude = lat;
        longitude = lng;
        locationAvailable = true;
        if (data.locationAccuracyMeters != null) {
          const acc = parseFloat(data.locationAccuracyMeters);
          if (!isNaN(acc) && acc > 0) {
            locationAccuracy = acc;
          }
        }
      }
    }

    // 8. Generate Unique Reference Number
    let referenceNumber = this.generateReferenceNumber();
    for (let attempt = 0; attempt < 5; attempt++) {
      const collision = await prisma.handoverRecord.findUnique({ where: { referenceNumber } });
      if (!collision) break;
      referenceNumber = this.generateReferenceNumber();
    }

    // 9. Prepare Photo Evidence Records
    const photosToCreate = [];
    if (Array.isArray(data.photos)) {
      for (const p of data.photos) {
        const photoUrl = typeof p === 'string' ? p : p.photoUrl || p.url || p.imageUrl;
        if (photoUrl) {
          photosToCreate.push({
            photoUrl,
            storagePath: p.storagePath || null,
            fileSize: p.fileSize ? parseInt(p.fileSize, 10) : null,
            mimeType: p.mimeType || 'image/jpeg',
            caption: p.caption || 'HANDOVER_EVIDENCE',
            uploadedById: actor.id,
            capturedAt: p.capturedAt ? new Date(p.capturedAt) : new Date(),
          });
        }
      }
    }

    // 10. Execute Transaction
    const handover = await prisma.$transaction(async (tx) => {
      // Create HandoverRecord
      const newHandover = await tx.handoverRecord.create({
        data: {
          referenceNumber,
          materialLotId: lot.id,
          quoteId: quote.id,
          collectorId: lot.collectorId,
          recyclerId: quote.recyclerId,
          status: HANDOVER_STATUS.PENDING_COLLECTOR,
          declaredWeightKg: declaredWeight,
          handoverWeightKg: confirmedWeight,
          handoverTimestamp: new Date(), // Server authoritative timestamp
          latitude,
          longitude,
          locationAccuracyMeters: locationAccuracy,
          locationAvailable,
          notes: data.notes || null,
          createdById: actor.id,
          photos: {
            create: photosToCreate,
          },
        },
        include: {
          materialLot: true,
          quote: true,
          collector: { include: { user: { select: { id: true, name: true, status: true } } } },
          recycler: { include: { user: { select: { id: true, name: true, status: true } } } },
          photos: true,
        },
      });

      // Transition MaterialLot status to HANDOVER_PENDING
      await tx.materialLot.update({
        where: { id: lot.id },
        data: { status: MATERIAL_LOT_STATUS.HANDOVER_PENDING },
      });

      return newHandover;
    });

    // 11. Audit Logging
    await auditService.logAction({
      actorId: actor.id,
      action: 'HANDOVER_CREATED',
      entityType: 'handover_records',
      entityId: handover.id,
      details: {
        referenceNumber: handover.referenceNumber,
        materialLotId: lot.id,
        quoteId: quote.id,
        status: handover.status,
        declaredWeightKg: declaredWeight,
        handoverWeightKg: confirmedWeight,
        locationAvailable,
      },
      ipAddress,
    });

    // 12. Notify Counterparty
    const notifyTargetUserId = isCollectorOwner ? quote.recycler.userId : lot.collector.userId;
    try {
      await notificationService.createNotification({
        userId: notifyTargetUserId,
        type: 'HANDOVER_CREATED',
        title: 'Digital Handover Initiated',
        message: `Handover ${handover.referenceNumber} has been initiated for lot ${lot.referenceNumber}`,
        referenceType: 'handover_records',
        referenceId: handover.id,
      });
    } catch (notifErr) {
      logger.warn(`Failed to dispatch handover creation notification: ${notifErr.message}`);
    }

    logger.info(`[HandoverService] Handover ${handover.referenceNumber} created for lot ${lot.referenceNumber}`);
    return handover;
  }

  /**
   * Collector confirms material handover
   * @param {object} actor - Authenticated collector
   * @param {string} handoverId - Handover UUID
   * @param {object} data - Confirmation data (weight, photos, location)
   * @param {string} [ipAddress]
   * @returns {Promise<object>}
   */
  async collectorConfirm(actor, handoverId, data = {}, ipAddress = null) {
    actor = await this.resolveActor(actor);
    const handover = await prisma.handoverRecord.findUnique({
      where: { id: handoverId },
      include: {
        collector: true,
        recycler: true,
        materialLot: true,
        quote: true,
        photos: true,
      },
    });

    if (!handover) {
      throw AppError.notFound('Handover record not found');
    }

    // Tenancy Check
    if (handover.collector.userId !== actor.id && actor.role !== ROLES.ADMIN) {
      throw AppError.forbidden('You can only confirm handovers for your own material lots');
    }

    // Status check
    if (handover.status === HANDOVER_STATUS.CONFIRMED) {
      throw AppError.badRequest('This handover has already been confirmed by both parties');
    }
    if (handover.status === HANDOVER_STATUS.CANCELLED) {
      throw AppError.badRequest('Cannot confirm a cancelled handover');
    }
    if (handover.collectorConfirmedAt != null) {
      throw AppError.badRequest('Collector has already confirmed this handover');
    }

    // Weight capture
    let updatedWeight = handover.handoverWeightKg ? Number(handover.handoverWeightKg) : null;
    if (data.handoverWeightKg !== undefined && data.handoverWeightKg !== null) {
      const parsed = parseFloat(data.handoverWeightKg);
      if (isNaN(parsed) || parsed <= 0) {
        throw AppError.badRequest('Handover weight must be a positive number');
      }
      updatedWeight = parsed;
    }

    // GPS update if provided
    let latitude = handover.latitude;
    let longitude = handover.longitude;
    let locationAccuracy = handover.locationAccuracyMeters;
    let locationAvailable = handover.locationAvailable;

    if (data.latitude != null && data.longitude != null) {
      const lat = parseFloat(data.latitude);
      const lng = parseFloat(data.longitude);
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        latitude = lat;
        longitude = lng;
        locationAvailable = true;
        if (data.locationAccuracyMeters != null) {
          locationAccuracy = parseFloat(data.locationAccuracyMeters) || null;
        }
      }
    }

    const now = new Date();
    const isBothConfirmed = handover.recyclerConfirmedAt != null;
    const newStatus = isBothConfirmed ? HANDOVER_STATUS.CONFIRMED : HANDOVER_STATUS.COLLECTOR_CONFIRMED;

    const updated = await prisma.$transaction(async (tx) => {
      // If photos were submitted, create them
      if (Array.isArray(data.photos) && data.photos.length > 0) {
        for (const p of data.photos) {
          const photoUrl = typeof p === 'string' ? p : p.photoUrl || p.url || p.imageUrl;
          if (photoUrl) {
            await tx.handoverPhoto.create({
              data: {
                handoverId: handover.id,
                photoUrl,
                storagePath: p.storagePath || null,
                fileSize: p.fileSize ? parseInt(p.fileSize, 10) : null,
                mimeType: p.mimeType || 'image/jpeg',
                caption: p.caption || 'COLLECTOR_CONFIRMATION',
                uploadedById: actor.id,
                capturedAt: p.capturedAt ? new Date(p.capturedAt) : now,
              },
            });
          }
        }
      }

      return await tx.handoverRecord.update({
        where: { id: handover.id },
        data: {
          collectorConfirmedAt: now,
          status: newStatus,
          finalConfirmedAt: isBothConfirmed ? now : null,
          handoverWeightKg: updatedWeight,
          latitude,
          longitude,
          locationAccuracyMeters: locationAccuracy,
          locationAvailable,
          notes: data.notes ? (handover.notes ? `${handover.notes}\nCollector: ${data.notes}` : data.notes) : handover.notes,
        },
        include: {
          materialLot: true,
          quote: true,
          collector: { include: { user: { select: { id: true, name: true } } } },
          recycler: { include: { user: { select: { id: true, name: true } } } },
          photos: true,
        },
      });
    });

    // Audit Log
    await auditService.logAction({
      actorId: actor.id,
      action: 'HANDOVER_COLLECTOR_CONFIRMED',
      entityType: 'handover_records',
      entityId: handover.id,
      details: {
        referenceNumber: handover.referenceNumber,
        newStatus,
        handoverWeightKg: updatedWeight,
        isBothConfirmed,
      },
      ipAddress,
    });

    if (isBothConfirmed) {
      await auditService.logAction({
        actorId: actor.id,
        action: 'HANDOVER_CONFIRMED',
        entityType: 'handover_records',
        entityId: handover.id,
        details: { referenceNumber: handover.referenceNumber, finalConfirmedAt: now },
        ipAddress,
      });
    }

    // Notification to Recycler
    try {
      await notificationService.createNotification({
        userId: handover.recycler.userId,
        type: isBothConfirmed ? 'HANDOVER_CONFIRMED' : 'HANDOVER_COLLECTOR_CONFIRMED',
        title: isBothConfirmed ? 'Handover Fully Confirmed' : 'Collector Confirmed Handover',
        message: isBothConfirmed
          ? `Handover ${handover.referenceNumber} has been confirmed by both parties.`
          : `Collector confirmed handover ${handover.referenceNumber}. Please verify receipt.`,
        referenceType: 'handover_records',
        referenceId: handover.id,
      });
    } catch (notifErr) {
      logger.warn(`Failed to notify recycler: ${notifErr.message}`);
    }

    logger.info(`[HandoverService] Collector confirmed handover ${handover.referenceNumber}. Status: ${newStatus}`);
    return updated;
  }

  /**
   * Recycler confirms receipt of material handover
   * @param {object} actor - Authenticated recycler
   * @param {string} handoverId - Handover UUID
   * @param {object} data - Confirmation data
   * @param {string} [ipAddress]
   * @returns {Promise<object>}
   */
  async recyclerConfirm(actor, handoverId, data = {}, ipAddress = null) {
    actor = await this.resolveActor(actor);
    const handover = await prisma.handoverRecord.findUnique({
      where: { id: handoverId },
      include: {
        collector: true,
        recycler: true,
        materialLot: true,
        quote: true,
        photos: true,
      },
    });

    if (!handover) {
      throw AppError.notFound('Handover record not found');
    }

    // Tenancy Check
    if (handover.recycler.userId !== actor.id && actor.role !== ROLES.ADMIN) {
      throw AppError.forbidden('You can only confirm handovers assigned to your recycling facility');
    }

    // Status check
    if (handover.status === HANDOVER_STATUS.CONFIRMED) {
      throw AppError.badRequest('This handover has already been confirmed by both parties');
    }
    if (handover.status === HANDOVER_STATUS.CANCELLED) {
      throw AppError.badRequest('Cannot confirm a cancelled handover');
    }
    if (handover.recyclerConfirmedAt != null) {
      throw AppError.badRequest('Recycler has already confirmed this handover');
    }

    // Actual / measured weight update by recycler if provided
    let updatedWeight = handover.handoverWeightKg ? Number(handover.handoverWeightKg) : null;
    if (data.handoverWeightKg !== undefined && data.handoverWeightKg !== null) {
      const parsed = parseFloat(data.handoverWeightKg);
      if (isNaN(parsed) || parsed <= 0) {
        throw AppError.badRequest('Handover weight must be a positive number');
      }
      updatedWeight = parsed;
    }

    const now = new Date();
    const isBothConfirmed = handover.collectorConfirmedAt != null;
    const newStatus = isBothConfirmed ? HANDOVER_STATUS.CONFIRMED : HANDOVER_STATUS.RECYCLER_CONFIRMED;

    const updated = await prisma.$transaction(async (tx) => {
      return await tx.handoverRecord.update({
        where: { id: handover.id },
        data: {
          recyclerConfirmedAt: now,
          status: newStatus,
          finalConfirmedAt: isBothConfirmed ? now : null,
          handoverWeightKg: updatedWeight,
          notes: data.notes ? (handover.notes ? `${handover.notes}\nRecycler: ${data.notes}` : data.notes) : handover.notes,
        },
        include: {
          materialLot: true,
          quote: true,
          collector: { include: { user: { select: { id: true, name: true } } } },
          recycler: { include: { user: { select: { id: true, name: true } } } },
          photos: true,
        },
      });
    });

    // Audit Log
    await auditService.logAction({
      actorId: actor.id,
      action: 'HANDOVER_RECYCLER_CONFIRMED',
      entityType: 'handover_records',
      entityId: handover.id,
      details: {
        referenceNumber: handover.referenceNumber,
        newStatus,
        handoverWeightKg: updatedWeight,
        isBothConfirmed,
      },
      ipAddress,
    });

    if (isBothConfirmed) {
      await auditService.logAction({
        actorId: actor.id,
        action: 'HANDOVER_CONFIRMED',
        entityType: 'handover_records',
        entityId: handover.id,
        details: { referenceNumber: handover.referenceNumber, finalConfirmedAt: now },
        ipAddress,
      });
    }

    // Notification to Collector
    try {
      await notificationService.createNotification({
        userId: handover.collector.userId,
        type: isBothConfirmed ? 'HANDOVER_CONFIRMED' : 'HANDOVER_RECYCLER_CONFIRMED',
        title: isBothConfirmed ? 'Handover Fully Confirmed' : 'Recycler Confirmed Receipt',
        message: isBothConfirmed
          ? `Handover ${handover.referenceNumber} has been confirmed by both parties.`
          : `Recycler confirmed receipt for handover ${handover.referenceNumber}.`,
        referenceType: 'handover_records',
        referenceId: handover.id,
      });
    } catch (notifErr) {
      logger.warn(`Failed to notify collector: ${notifErr.message}`);
    }

    logger.info(`[HandoverService] Recycler confirmed handover ${handover.referenceNumber}. Status: ${newStatus}`);
    return updated;
  }

  /**
   * Add photo to an active handover record
   * @param {object} actor - Authenticated participant
   * @param {string} handoverId - Handover UUID
   * @param {object} photoData - Photo metadata
   * @param {string} [ipAddress]
   * @returns {Promise<object>}
   */
  async addHandoverPhoto(actor, handoverId, photoData, ipAddress = null) {
    actor = await this.resolveActor(actor);
    const handover = await prisma.handoverRecord.findUnique({
      where: { id: handoverId },
      include: { collector: true, recycler: true },
    });

    if (!handover) {
      throw AppError.notFound('Handover record not found');
    }

    const isCollector = handover.collector.userId === actor.id;
    const isRecycler = handover.recycler.userId === actor.id;
    const isAdmin = actor.role === ROLES.ADMIN;

    if (!isCollector && !isRecycler && !isAdmin) {
      throw AppError.forbidden('You do not have permission to attach photos to this handover');
    }

    if (handover.status === HANDOVER_STATUS.CONFIRMED) {
      throw AppError.badRequest('Handover is immutable after final confirmation. No additional photos allowed.');
    }

    const photo = await prisma.handoverPhoto.create({
      data: {
        handoverId: handover.id,
        photoUrl: photoData.photoUrl,
        storagePath: photoData.storagePath || null,
        fileSize: photoData.fileSize ? parseInt(photoData.fileSize, 10) : null,
        mimeType: photoData.mimeType || 'image/jpeg',
        caption: photoData.caption || 'HANDOVER_EVIDENCE',
        uploadedById: actor.id,
        capturedAt: new Date(),
      },
    });

    await auditService.logAction({
      actorId: actor.id,
      action: 'HANDOVER_PHOTO_ADDED',
      entityType: 'handover_records',
      entityId: handover.id,
      details: {
        photoId: photo.id,
        photoUrl: photo.photoUrl,
        caption: photo.caption,
      },
      ipAddress,
    });

    return photo;
  }

  /**
   * Get single handover details by ID
   * @param {object} actor - Authenticated user
   * @param {string} handoverId - Handover UUID
   * @returns {Promise<object>}
   */
  async getHandoverById(arg1, arg2) {
    let actor, handoverId;
    if (typeof arg1 === 'string' && typeof arg2 === 'string') {
      const h = await prisma.handoverRecord.findUnique({ where: { id: arg1 } });
      if (h) {
        handoverId = arg1;
        actor = await this.resolveActor(arg2);
      } else {
        handoverId = arg2;
        actor = await this.resolveActor(arg1);
      }
    } else if (typeof arg1 === 'string' && typeof arg2 === 'object' && arg2 !== null) {
      handoverId = arg1;
      actor = await this.resolveActor(arg2);
    } else {
      actor = await this.resolveActor(arg1);
      handoverId = arg2;
    }

    const handover = await prisma.handoverRecord.findUnique({
      where: { id: handoverId },
      include: {
        materialLot: true,
        quote: true,
        collector: {
          select: {
            id: true,
            userId: true,
            city: true,
            state: true,
            user: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
        recycler: {
          select: {
            id: true,
            userId: true,
            facilityName: true,
            authorizationStatus: true,
            city: true,
            state: true,
            user: { select: { id: true, name: true } },
          },
        },
        photos: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!handover) {
      throw AppError.notFound('Handover record not found');
    }

    const isCollector = handover.collector.userId === actor.id;
    const isRecycler = handover.recycler.userId === actor.id;
    const isAdmin = actor.role === ROLES.ADMIN;

    if (!isCollector && !isRecycler && !isAdmin) {
      throw AppError.forbidden('You do not have permission to view this handover record');
    }

    return handover;
  }

  /**
   * Get verifiable digital handover receipt
   * @param {object} actor - Authenticated user
   * @param {string} handoverId - Handover UUID
   * @returns {Promise<object>} Structured receipt
   */
  async getHandoverReceipt(actor, handoverId) {
    const handover = await this.getHandoverById(actor, handoverId);

    const declaredWeight = handover.declaredWeightKg ? Number(handover.declaredWeightKg) : null;
    const confirmedWeight = handover.handoverWeightKg ? Number(handover.handoverWeightKg) : null;
    const unitPrice = Number(handover.quote.quotedUnitPrice);
    const quotedTotal = handover.quote.quotedTotal ? Number(handover.quote.quotedTotal) : null;

    // Compute weight variance if both are available
    let weightVarianceKg = null;
    let weightVariancePercent = null;
    if (declaredWeight != null && confirmedWeight != null) {
      weightVarianceKg = Number((confirmedWeight - declaredWeight).toFixed(2));
      if (declaredWeight > 0) {
        weightVariancePercent = Number(((weightVarianceKg / declaredWeight) * 100).toFixed(1));
      }
    }

    return {
      title: 'ECOSETU DIGITAL HANDOVER RECORD',
      referenceNumber: handover.referenceNumber,
      lotReference: handover.materialLot.referenceNumber,
      category: handover.materialLot.category,
      subcategory: handover.materialLot.subcategory,
      declaredWeightKg: declaredWeight,
      confirmedWeightKg: confirmedWeight,
      weightVarianceKg,
      weightVariancePercent,
      quotedUnitPrice: unitPrice,
      unit: handover.quote.unit,
      quotedTotal,
      currency: handover.quote.currency || 'INR',
      collector: {
        id: handover.collector.id,
        name: handover.collector.user?.name || 'Authorized Collector',
        city: handover.collector.city,
        state: handover.collector.state,
      },
      recycler: {
        id: handover.recycler.id,
        facilityName: handover.recycler.facilityName,
        authorizationStatus: handover.recycler.authorizationStatus,
        city: handover.recycler.city,
        state: handover.recycler.state,
      },
      handoverTimestamp: handover.handoverTimestamp,
      location: {
        status: handover.locationAvailable ? 'GPS_CAPTURED' : 'GPS_UNAVAILABLE',
        latitude: handover.latitude ? Number(handover.latitude) : null,
        longitude: handover.longitude ? Number(handover.longitude) : null,
        accuracyMeters: handover.locationAccuracyMeters ? Number(handover.locationAccuracyMeters) : null,
      },
      confirmations: {
        collector: {
          confirmed: handover.collectorConfirmedAt != null,
          timestamp: handover.collectorConfirmedAt,
        },
        recycler: {
          confirmed: handover.recyclerConfirmedAt != null,
          timestamp: handover.recyclerConfirmedAt,
        },
        finalConfirmedAt: handover.finalConfirmedAt,
      },
      status: handover.status,
      photos: handover.photos.map((p) => ({
        id: p.id,
        photoUrl: p.photoUrl,
        caption: p.caption,
        capturedAt: p.capturedAt,
      })),
      notes: handover.notes,
      complianceDisclaimer: 'This record confirms the digital material handover between collector and authorized recycler. It does NOT confirm financial settlement, payment disbursement, or recycling completion.',
      traceabilityBasis: 'Immutable economic transfer milestone recorded in EcoSetu traceability registry.',
    };
  }

  /**
   * Get all handovers for a given material lot
   * @param {object} actor - Authenticated collector or admin
   * @param {string} lotId - Material Lot UUID
   * @returns {Promise<Array<object>>}
   */
  async getHandoversForLot(actor, lotId) {
    actor = await this.resolveActor(actor);
    const lot = await prisma.materialLot.findUnique({
      where: { id: lotId },
      include: { collector: true },
    });

    if (!lot) {
      throw AppError.notFound('Material lot not found');
    }

    if (lot.collector.userId !== actor.id && actor.role !== ROLES.ADMIN) {
      throw AppError.forbidden('You can only view handovers for your own material lots');
    }

    return await prisma.handoverRecord.findMany({
      where: { materialLotId: lotId },
      orderBy: { createdAt: 'desc' },
      include: {
        quote: true,
        recycler: {
          select: {
            id: true,
            facilityName: true,
            authorizationStatus: true,
            city: true,
            state: true,
          },
        },
        photos: true,
      },
    });
  }

  /**
   * Collector queries their own handover history
   * @param {object} actor - Authenticated collector
   * @param {object} [query] - Filters and pagination
   * @returns {Promise<object>}
   */
  async getCollectorHandovers(actor, query = {}) {
    actor = await this.resolveActor(actor);
    const profile = await this.getCollectorProfileOrThrow(actor.id);
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where = { collectorId: profile.id };
    if (query.status) {
      where.status = query.status;
    }
    if (query.materialLotId) {
      where.materialLotId = query.materialLotId;
    }

    const [handovers, total] = await Promise.all([
      prisma.handoverRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          materialLot: { select: { id: true, referenceNumber: true, category: true, subcategory: true } },
          quote: { select: { id: true, referenceNumber: true, quotedUnitPrice: true, unit: true, quotedTotal: true } },
          recycler: { select: { id: true, facilityName: true, city: true, state: true } },
          photos: { select: { id: true, photoUrl: true, caption: true } },
        },
      }),
      prisma.handoverRecord.count({ where }),
    ]);

    return {
      handovers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Recycler queries their assigned handover history
   * @param {object} actor - Authenticated recycler
   * @param {object} [query] - Filters and pagination
   * @returns {Promise<object>}
   */
  async getRecyclerHandovers(actor, query = {}) {
    actor = await this.resolveActor(actor);
    const profile = await this.getRecyclerProfileOrThrow(actor.id);
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where = { recyclerId: profile.id };
    if (query.status) {
      where.status = query.status;
    }
    if (query.materialLotId) {
      where.materialLotId = query.materialLotId;
    }

    const [handovers, total] = await Promise.all([
      prisma.handoverRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          materialLot: { select: { id: true, referenceNumber: true, category: true, subcategory: true } },
          quote: { select: { id: true, referenceNumber: true, quotedUnitPrice: true, unit: true, quotedTotal: true } },
          collector: { select: { id: true, city: true, state: true, user: { select: { name: true } } } },
          photos: { select: { id: true, photoUrl: true, caption: true } },
        },
      }),
      prisma.handoverRecord.count({ where }),
    ]);

    return {
      handovers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Cancel an open handover record
   * @param {object} actor - Authenticated participant
   * @param {string} handoverId - Handover UUID
   * @param {string} [reason]
   * @param {string} [ipAddress]
   * @returns {Promise<object>}
   */
  async cancelHandover(actor, handoverId, reason = null, ipAddress = null) {
    actor = await this.resolveActor(actor);
    const handover = await prisma.handoverRecord.findUnique({
      where: { id: handoverId },
      include: { collector: true, recycler: true },
    });

    if (!handover) {
      throw AppError.notFound('Handover record not found');
    }

    const isCollector = handover.collector.userId === actor.id;
    const isRecycler = handover.recycler.userId === actor.id;
    const isAdmin = actor.role === ROLES.ADMIN;

    if (!isCollector && !isRecycler && !isAdmin) {
      throw AppError.forbidden('You do not have permission to cancel this handover');
    }

    if (handover.status === HANDOVER_STATUS.CONFIRMED) {
      throw AppError.badRequest('Cannot cancel a handover that has already been confirmed by both parties');
    }

    const reasonStr = typeof reason === 'object' && reason !== null ? (reason.reason || null) : reason;
    const now = new Date();
    const cancelled = await prisma.handoverRecord.update({
      where: { id: handover.id },
      data: {
        status: HANDOVER_STATUS.CANCELLED,
        cancelledAt: now,
        cancellationReason: reasonStr,
      },
    });

    await auditService.logAction({
      actorId: actor.id,
      action: 'HANDOVER_CANCELLED',
      entityType: 'handover_records',
      entityId: handover.id,
      details: { referenceNumber: handover.referenceNumber, reason },
      ipAddress,
    });

    // Notify other party
    const notifyTargetUserId = isCollector ? handover.recycler.userId : handover.collector.userId;
    try {
      await notificationService.createNotification({
        userId: notifyTargetUserId,
        type: 'HANDOVER_CANCELLED',
        title: 'Handover Cancelled',
        message: `Handover ${handover.referenceNumber} was cancelled. Reason: ${reason}`,
        referenceType: 'handover_records',
        referenceId: handover.id,
      });
    } catch (e) {
      logger.warn(`Failed to notify counterparty of handover cancellation: ${e.message}`);
    }

    return cancelled;
  }
}

module.exports = new HandoverService();
