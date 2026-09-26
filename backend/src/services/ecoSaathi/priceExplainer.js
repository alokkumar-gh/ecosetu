const PRICING_CATALOG = {
  LAPTOP: { categoryName: 'Laptop / Notebook', baseRatePerKg: 350, minRate: 250, maxRate: 500, unit: 'kg' },
  MOBILE_PHONE: { categoryName: 'Smartphone / Feature Phone', baseRatePerKg: 400, minRate: 300, maxRate: 650, unit: 'piece/kg' },
  CIRCUIT_BOARD: { categoryName: 'High-Grade PCB', baseRatePerKg: 450, minRate: 350, maxRate: 800, unit: 'kg' },
  BATTERY: { categoryName: 'Lithium-ion Battery', baseRatePerKg: 180, minRate: 120, maxRate: 260, unit: 'kg' },
  DESKTOP: { categoryName: 'Desktop Tower / CPU', baseRatePerKg: 180, minRate: 120, maxRate: 280, unit: 'kg' },
  TABLET: { categoryName: 'Tablet / iPad', baseRatePerKg: 300, minRate: 200, maxRate: 450, unit: 'kg' },
  MONITOR: { categoryName: 'LCD / LED Monitor', baseRatePerKg: 120, minRate: 80, maxRate: 190, unit: 'kg' },
  PRINTER: { categoryName: 'Printer / Scanner', baseRatePerKg: 60, minRate: 40, maxRate: 90, unit: 'kg' },
  CABLE_CHARGER: { categoryName: 'Copper Cables / Wire', baseRatePerKg: 150, minRate: 100, maxRate: 220, unit: 'kg' },
  KEYBOARD_MOUSE: { categoryName: 'Peripherals (Keyboard/Mouse)', baseRatePerKg: 40, minRate: 25, maxRate: 60, unit: 'kg' },
  OTHER: { categoryName: 'Mixed Electronic Waste', baseRatePerKg: 80, minRate: 50, maxRate: 120, unit: 'kg' },
};

class PriceExplainer {
  /**
   * Grounded explanation of price or offer amount
   * @param {object} params
   * @param {string} params.category - E-waste category
   * @param {string} [params.condition] - WORKING, DAMAGED, NOT_WORKING, etc.
   * @param {number} [params.weightKg] - Item weight
   * @param {number} [params.offeredPrice] - Price offered by collector
   * @param {string} [params.language='en']
   * @returns {object}
   */
  explain({ category, condition, weightKg, offeredPrice, language = 'en' }) {
    const normCat = String(category || '').toUpperCase().replace(/[\s\-]/g, '_');
    const benchmark = PRICING_CATALOG[normCat] || PRICING_CATALOG.LAPTOP;

    if (!benchmark) {
      return {
        hasData: false,
        message: language === 'hi'
          ? 'इस विशिष्ट श्रेणी के लिए विस्तृत मूल्य डेटा उपलब्ध नहीं है। मूल्य वस्तु की स्थिति और बाजार मांग पर निर्भर करता है।'
          : language === 'or'
          ? 'ଏହି ବର୍ଗ ପାଇଁ ବିସ୍ତୃତ ମୂଲ୍ୟ ତଥ୍ୟ ଉପଲବ୍ଧ ନାହିଁ।'
          : "I don't have enough data to determine why this collector priced it that way. Pricing depends on item condition, weight, and local market demand.",
      };
    }

    const baselineText = `₹${benchmark.baseRatePerKg}/kg (typical range: ₹${benchmark.minRate} - ₹${benchmark.maxRate}/kg)`;
    
    // Condition factors
    let conditionImpact = '';
    if (condition) {
      const condUpper = String(condition).toUpperCase();
      if (condUpper.includes('DAMAGED') || condUpper.includes('BROKEN')) {
        conditionImpact = language === 'hi'
          ? 'सामग्री की स्थिति क्षतिग्रस्त (Damaged) होने के कारण केवल कच्चे घटकों (metals/plastics) का रीसाइक्लिंग मूल्य मिलता है।'
          : 'Since the item condition is marked as DAMAGED, the price reflects scrap material recovery rather than working reuse value.';
      } else if (condUpper.includes('WORKING') || condUpper.includes('TESTED')) {
        conditionImpact = language === 'hi'
          ? 'सामग्री कार्यशील (Working) स्थिति में है, जिससे इसका पुन: उपयोग (Reuse) मूल्य अधिक होता है।'
          : 'The item is in working condition, qualifying it for high-value reuse and refurbishment pricing.';
      } else if (condUpper.includes('NOT_WORKING')) {
        conditionImpact = language === 'hi'
          ? 'सामग्री कार्यशील नहीं है, इसलिए इसका मूल्यांकन केवल धातु और इलेक्ट्रॉनिक रिकवरी पर आधारित है।'
          : 'The item is non-functional, meaning price is evaluated strictly on extractable commodity components.';
      }
    }

    let comparisonText = '';
    if (offeredPrice && benchmark) {
      if (offeredPrice < benchmark.minRate) {
        comparisonText = language === 'hi'
          ? `कलेक्टर का ऑफर (₹${offeredPrice}) बेसलाइन न्यूनतम दर से कम है। आप चाहें तो उच्च दर के लिए काउंटर ऑफर दे सकते हैं।`
          : `The collector's offer (₹${offeredPrice}) is below the typical benchmark. You can send a counter-offer or wait for other collectors.`;
      } else if (offeredPrice >= benchmark.baseRatePerKg) {
        comparisonText = language === 'hi'
          ? `कलेक्टर का ऑफर (₹${offeredPrice}) सामान्य बाजार दर के अनुकूल और उचित है।`
          : `The collector's offer (₹${offeredPrice}) aligns well with fair market baseline rates for ${benchmark.categoryName}.`;
      }
    }

    let message = '';
    if (language === 'hi') {
      message = `${benchmark.categoryName} का मानक बेसलाइन मूल्य लगभग ${baselineText} है। ${conditionImpact} ${comparisonText}`.trim();
    } else if (language === 'or') {
      message = `${benchmark.categoryName} ର ସାଧାରଣ ବେସଲାଇନ୍ ମୂଲ୍ୟ ପ୍ରାୟ ${baselineText} ଅଟେ।`.trim();
    } else {
      message = `The baseline benchmark for ${benchmark.categoryName} is ${baselineText}. ${conditionImpact} ${comparisonText}`.trim();
    }

    return {
      hasData: true,
      category: benchmark.categoryName,
      unit: benchmark.unit,
      minRate: benchmark.minRate,
      maxRate: benchmark.maxRate,
      baseRatePerKg: benchmark.baseRatePerKg,
      message,
      quickActions: ['Counter-offer', 'Compare offers', 'View Price Board'],
    };
  }
}

const priceExplainerInstance = new PriceExplainer();
priceExplainerInstance.PRICING_CATALOG = PRICING_CATALOG;
priceExplainerInstance.PriceExplainer = PriceExplainer;

module.exports = priceExplainerInstance;
