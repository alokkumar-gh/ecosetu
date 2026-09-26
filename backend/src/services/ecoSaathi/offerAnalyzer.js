/**
 * EcoSetu — Smart Offer Analysis & Comparison Engine
 * Factual, zero-hallucination analysis of received collector offers.
 * Canonical Reference: docs/07_BUSINESS_WORKFLOWS.md
 */

const { calculateDistanceKm } = require('../../utils/locationHelper');

class OfferAnalyzer {
  /**
   * Analyze and compare a set of offers for a collection request
   * @param {Array<object>} offers - Array of offer records from DB
   * @param {object} [request] - Parent collection request (with pickup coordinates)
   * @param {string} [language='en'] - Output language
   * @returns {object} Structured factual analysis
   */
  analyze(offers, request = null, language = 'en') {
    if (!Array.isArray(offers) || offers.length === 0) {
      return {
        hasOffers: false,
        count: 0,
        message: language === 'hi' 
          ? 'इस पिकअप अनुरोध के लिए अभी कोई ऑफर उपलब्ध नहीं है।'
          : language === 'or'
          ? 'ଏହି ପିକଅପ୍ ଅନୁରୋଧ ପାଇଁ କୌଣସି ଅଫର ନାହିଁ।'
          : 'There are currently no offers received for this pickup request.',
        offers: [],
        highestOffer: null,
        closestOffer: null,
        summary: null,
      };
    }

    const processedOffers = offers.map((offer, idx) => {
      const price = parseFloat(offer.price !== undefined ? offer.price : offer.offeredPrice) || 0;
      const collectorName = offer.collectorName || offer.collector?.user?.name || offer.collector?.businessName || `Collector #${idx + 1}`;
      
      let distanceKm = null;
      if (
        request &&
        request.pickupLat &&
        request.pickupLng &&
        offer.collector?.currentLat &&
        offer.collector?.currentLng
      ) {
        distanceKm = parseFloat(
          calculateDistanceKm(
            request.pickupLat,
            request.pickupLng,
            offer.collector.currentLat,
            offer.collector.currentLng
          ).toFixed(1)
        );
      }

      return {
        index: idx + 1,
        id: offer.id,
        collectorName,
        collectorId: offer.collectorId,
        price,
        formattedPrice: `₹${price.toLocaleString('en-IN')}`,
        status: offer.status,
        proposedDate: offer.proposedDate ? new Date(offer.proposedDate).toISOString().split('T')[0] : null,
        notes: offer.notes || null,
        distanceKm,
        createdAt: offer.createdAt,
      };
    });

    // 1. Sort by price descending
    const byPrice = [...processedOffers].sort((a, b) => b.price - a.price);
    const highestOffer = byPrice[0];
    const lowestOffer = byPrice[byPrice.length - 1];

    // 2. Sort by distance ascending (if distance is available)
    const withDistance = processedOffers.filter((o) => o.distanceKm !== null);
    const closestOffer = withDistance.length > 0
      ? [...withDistance].sort((a, b) => a.distanceKm - b.distanceKm)[0]
      : null;

    // 3. Generate factual summary message
    let summaryText = '';
    if (processedOffers.length === 1) {
      const o = processedOffers[0];
      summaryText = language === 'hi'
        ? `${o.collectorName} ने ${o.formattedPrice} का ऑफर दिया है।`
        : language === 'or'
        ? `${o.collectorName} ${o.formattedPrice} ର ଅଫର ଦେଇଛନ୍ତି।`
        : `${o.collectorName} offered ${o.formattedPrice}${o.distanceKm ? ` (${o.distanceKm} km away)` : ''}.`;
    } else {
      const highestInfo = `${highestOffer.collectorName} at ${highestOffer.formattedPrice}`;
      const closestInfo = closestOffer && closestOffer.id !== highestOffer.id
        ? `, while ${closestOffer.collectorName} is closest at ${closestOffer.distanceKm} km (${closestOffer.formattedPrice})`
        : '';
      
      if (language === 'hi') {
        summaryText = `आपको कुल ${processedOffers.length} ऑफर मिले हैं। सबसे अधिक ऑफर ${highestOffer.collectorName} का ${highestOffer.formattedPrice} है${closestOffer ? ` और सबसे नजदीकी कलेक्टर ${closestOffer.collectorName} (${closestOffer.distanceKm || ''} km) है।` : '।'}`;
      } else if (language === 'or') {
        summaryText = `ଆପଣଙ୍କୁ ${processedOffers.length}ଟି ଅଫର ମିଳିଛି। ସର୍ବାଧିକ ଅଫର ହେଉଛି ${highestOffer.collectorName} ଙ୍କର ${highestOffer.formattedPrice}।`;
      } else {
        summaryText = `You have ${processedOffers.length} offers. The highest is from ${highestInfo}${closestInfo}.`;
      }
    }

    return {
      hasOffers: true,
      count: processedOffers.length,
      offers: processedOffers,
      highestOffer,
      lowestOffer,
      closestOffer,
      priceSpread: highestOffer.price - lowestOffer.price,
      message: summaryText,
      quickActions: [
        `Accept ${highestOffer.formattedPrice}`,
        'Negotiate best offer',
        'Compare all',
      ],
    };
  }

  /**
   * Resolve an ordinal/relative follow-up query like "what about the second one?" or "compare #2"
   * @param {Array<object>} offers
   * @param {string} query
   * @returns {object|null}
   */
  resolveFollowUp(offers, query) {
    if (!Array.isArray(offers) || offers.length === 0) return null;
    const lower = query.toLowerCase();

    let targetIndex = null;
    if (lower.includes('first') || lower.includes('1st') || lower.includes('pehla') || lower.includes('pahila')) {
      targetIndex = 0;
    } else if (lower.includes('second') || lower.includes('2nd') || lower.includes('dusra') || lower.includes('doosra')) {
      targetIndex = 1;
    } else if (lower.includes('third') || lower.includes('3rd') || lower.includes('teesra') || lower.includes('tisra')) {
      targetIndex = 2;
    }

    if (targetIndex !== null && targetIndex < offers.length) {
      return offers[targetIndex];
    }

    return null;
  }
}

module.exports = new OfferAnalyzer();
