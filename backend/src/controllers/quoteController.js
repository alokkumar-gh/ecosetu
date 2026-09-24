// EcoSetu Quote Controller
// Canonical Reference: docs/25_SIH_26229_REQUIREMENTS.md Section 10

const quoteService = require('../services/quoteService');

class QuoteController {
  async createQuote(req, res, next) {
    try {
      const quote = await quoteService.createQuote(req.user, req.body, req.ip);
      res.status(201).json({
        success: true,
        message: 'Quote created successfully',
        data: quote,
      });
    } catch (err) {
      next(err);
    }
  }

  async getQuotesForLot(req, res, next) {
    try {
      const lotId = req.params.lotId || req.params.id;
      const result = await quoteService.getQuotesForLot(req.user, lotId, req.query);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async getQuoteById(req, res, next) {
    try {
      const quote = await quoteService.getQuoteById(req.user, req.params.id);
      res.status(200).json({
        success: true,
        data: quote,
      });
    } catch (err) {
      next(err);
    }
  }

  async acceptQuote(req, res, next) {
    try {
      const quote = await quoteService.acceptQuote(req.user, req.params.id, req.ip);
      res.status(200).json({
        success: true,
        message: 'Quote accepted successfully. This is now the commercial basis for handover.',
        data: quote,
      });
    } catch (err) {
      next(err);
    }
  }

  async rejectQuote(req, res, next) {
    try {
      const reason = req.body?.reason || null;
      const quote = await quoteService.rejectQuote(req.user, req.params.id, reason, req.ip);
      res.status(200).json({
        success: true,
        message: 'Quote rejected successfully',
        data: quote,
      });
    } catch (err) {
      next(err);
    }
  }

  async cancelQuote(req, res, next) {
    try {
      const reason = req.body?.reason || null;
      const quote = await quoteService.cancelQuote(req.user, req.params.id, reason, req.ip);
      res.status(200).json({
        success: true,
        message: 'Quote cancelled successfully',
        data: quote,
      });
    } catch (err) {
      next(err);
    }
  }

  async counterQuote(req, res, next) {
    try {
      const quote = await quoteService.counterQuote(req.user, req.params.id, req.body, req.ip);
      res.status(200).json({
        success: true,
        message: 'Counter-offer submitted successfully',
        data: quote,
      });
    } catch (err) {
      next(err);
    }
  }

  async getRecyclerQuotes(req, res, next) {
    try {
      const result = await quoteService.getRecyclerQuotes(req.user, req.query);
      res.status(200).json({
        success: true,
        data: result.quotes,
        pagination: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  }

  async getCitizenQuotes(req, res, next) {
    try {
      const result = await quoteService.getCitizenQuotes(req.user, req.query);
      res.status(200).json({
        success: true,
        data: result.quotes,
        pagination: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new QuoteController();
