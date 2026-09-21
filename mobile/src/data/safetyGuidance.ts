/**
 * safetyGuidance.ts
 * Offline-Bundled Safety Catalog for Informal E-Waste Collectors
 * Canonical Reference: SIH Problem Statement 26229 - Prompt 9: Safety Center + Pictorial / Audio Safety Guidance
 */

export interface SafetyTopic {
  id: string;
  category: string;
  icon: string;
  titleKey: string;
  subtitleKey: string;
  warningKey: string;
  whyDangerousKey: string;
  dontKeys: string[];
  doKeys: string[];
  defaultSpeechText: {
    en: string;
    hi: string;
    mr: string;
    or: string;
  };
}

export const SAFETY_TOPICS: SafetyTopic[] = [
  {
    id: 'SAFE-BATTERIES',
    category: 'BATTERY',
    icon: '🔋',
    titleKey: 'safety.topics.batteries.title',
    subtitleKey: 'safety.topics.batteries.subtitle',
    warningKey: 'safety.topics.batteries.warning',
    whyDangerousKey: 'safety.topics.batteries.whyDangerous',
    dontKeys: [
      'safety.topics.batteries.dont1',
      'safety.topics.batteries.dont2',
      'safety.topics.batteries.dont3',
    ],
    doKeys: [
      'safety.topics.batteries.do1',
      'safety.topics.batteries.do2',
      'safety.topics.batteries.do3',
    ],
    defaultSpeechText: {
      en: 'Battery safety. Do not puncture, cut, crush, or burn batteries. Keep damaged batteries away from heat and sparks. Place them in a dry container and hand them to an authorized recycler.',
      hi: 'बैटरी सुरक्षा। बैटरियों को न तोड़ें, न काटें, न कुचलें और न ही जलाएं। क्षतिग्रस्त बैटरियों को आग और गर्मी से दूर रखें। उन्हें सुरक्षित कंटेनर में रखकर अधिकृत पुनर्चक्रणकर्ता को सौंपें।',
      mr: 'बॅटरी सुरक्षितता. बॅटरी कापू नका, तोडू नका किंवा जाळू नका. खराब झालेल्या बॅटरी उष्णता आणि आगीपासून दूर ठेवा. सुरक्षित डब्यात ठेवून अधिकृत पुनर्वापरकर्त्याला द्या.',
      or: 'ବ୍ୟାଟେରୀ ସୁରକ୍ଷା। ବ୍ୟାଟେରୀକୁ କାଟନ୍ତୁ ନାହିଁ, ଭାଙ୍ଗନ୍ତୁ ନାହିଁ କିମ୍ବା ଜଳାନ୍ତୁ ନାହିଁ। ନଷ୍ଟ ହୋଇଥିବା ବ୍ୟାଟେରୀକୁ ନିଆଁଠାରୁ ଦୂରରେ ରଖନ୍ତୁ ଏବଂ ଅନୁମୋଦିତ ରିସାଇକ୍ଲରଙ୍କୁ ଦିଅନ୍ତୁ।',
    },
  },
  {
    id: 'SAFE-CRTS',
    category: 'MONITOR',
    icon: '📺',
    titleKey: 'safety.topics.crts.title',
    subtitleKey: 'safety.topics.crts.subtitle',
    warningKey: 'safety.topics.crts.warning',
    whyDangerousKey: 'safety.topics.crts.whyDangerous',
    dontKeys: [
      'safety.topics.crts.dont1',
      'safety.topics.crts.dont2',
      'safety.topics.crts.dont3',
    ],
    doKeys: [
      'safety.topics.crts.do1',
      'safety.topics.crts.do2',
      'safety.topics.crts.do3',
    ],
    defaultSpeechText: {
      en: 'CRT and monitor safety. Do not smash CRT glass or burn cathode tubes. Vacuum pressure can cause dangerous glass implosion. Keep tubes intact and transport carefully to an authorized recycler.',
      hi: 'सीआरटी और मॉनिटर सुरक्षा। सीआरटी कांच को न फोड़ें और न ही जलाएं। अंदरूनी दबाव से कांच तेजी से टूटकर चोट पहुंचा सकता है। इसे सुरक्षित रखें और अधिकृत पुनर्चक्रणकर्ता को सौंपें।',
      mr: 'सीआरटी आणि मॉनिटर सुरक्षितता. सीआरटी काच फोडू नका किंवा जाळू नका. काच फुटून गंभीर दुखापत होऊ शकते. ते न फोडता सुरक्षितपणे अधिकृत पुनर्वापरकर्त्याकडे पाठवा.',
      or: 'ସିଆରଟି ଏବଂ ମନିଟର ସୁରକ୍ଷା। ସିଆରଟି କାଚକୁ ଭାଙ୍ଗନ୍ତୁ ନାହିଁ କିମ୍ବା ଜଳାନ୍ତୁ ନାହିଁ। କାଚ ଫୁଟି ଆଘାତ ଲାଗିପାରେ। ଏହାକୁ ଅକ୍ଷୁର୍ଣ୍ଣ ରଖି ଅନୁମୋଦିତ ରିସାଇକ୍ଲରଙ୍କୁ ଦିଅନ୍ତୁ।',
    },
  },
  {
    id: 'SAFE-PCBS',
    category: 'PCB',
    icon: '🟩',
    titleKey: 'safety.topics.pcbs.title',
    subtitleKey: 'safety.topics.pcbs.subtitle',
    warningKey: 'safety.topics.pcbs.warning',
    whyDangerousKey: 'safety.topics.pcbs.whyDangerous',
    dontKeys: [
      'safety.topics.pcbs.dont1',
      'safety.topics.pcbs.dont2',
      'safety.topics.pcbs.dont3',
    ],
    doKeys: [
      'safety.topics.pcbs.do1',
      'safety.topics.pcbs.do2',
      'safety.topics.pcbs.do3',
    ],
    defaultSpeechText: {
      en: 'Circuit board safety. Never use acid leaching or burn circuit boards. Fumes from burning boards cause severe lung damage. Keep PCBs dry, sorted, and deliver directly to authorized recyclers.',
      hi: 'सर्किट बोर्ड सुरक्षा। सर्किट बोर्ड पर कभी तेजाब न डालें और न ही उन्हें जलाएं। धुएं से फेफड़ों को भारी नुकसान होता है। बोर्डों को सूखा रखें और अधिकृत पुनर्चक्रणकर्ता को सौंपें।',
      mr: 'सर्किट बोर्ड सुरक्षितता. पीसीबीवर कधीही अॅसिड टाकू नका किंवा जाळू नका. यातील धुरामुळे फुफ्फुसांना इजा होते. पीसीबी कोरड्या ठेवून अधिकृत पुनर्वापरकर्त्याकडे द्या.',
      or: 'ସର୍କିଟ ବୋର୍ଡ ସୁରକ୍ଷା। ସର୍କିଟ ବୋର୍ଡରେ କେବେ ଏସିଡ୍ ବ୍ୟବହାର କରନ୍ତୁ ନାହିଁ କିମ୍ବା ଜଳାନ୍ତୁ ନାହିଁ। ଏହାର ଧୂଆଁ ଶରୀର ପାଇଁ କ୍ଷତିକାରକ। ଏହାକୁ ଅନୁମୋଦିତ ରିସାଇକ୍ଲରଙ୍କୁ ହସ୍ତାନ୍ତର କରନ୍ତୁ।',
    },
  },
  {
    id: 'SAFE-CABLES',
    category: 'CABLE_CHARGER',
    icon: '🔌',
    titleKey: 'safety.topics.cables.title',
    subtitleKey: 'safety.topics.cables.subtitle',
    warningKey: 'safety.topics.cables.warning',
    whyDangerousKey: 'safety.topics.cables.whyDangerous',
    dontKeys: [
      'safety.topics.cables.dont1',
      'safety.topics.cables.dont2',
      'safety.topics.cables.dont3',
    ],
    doKeys: [
      'safety.topics.cables.do1',
      'safety.topics.cables.do2',
      'safety.topics.cables.do3',
    ],
    defaultSpeechText: {
      en: 'Cable safety. Do not burn cables to recover copper. Burning plastic releases toxic dioxin smoke that harms you and your family. Keep cables unburned and sell through authorized channels.',
      hi: 'तार एवं केबल सुरक्षा। तांबा निकालने के लिए तारों को कभी न जलाएं। प्लास्टिक जलने से जहरीला धुआं निकलता है जो सेहत को नुकसान पहुंचाता है। तारों को बिना जलाए अधिकृत चैनल को बेचें।',
      mr: 'केबल व वायर सुरक्षितता. तांबे काढण्यासाठी केबल कधीही जाळू नका. प्लास्टिक जळल्याने विषारी धूर तयार होतो. केबल न जाळता अधिकृत संकलन केंद्रात द्या.',
      or: 'କେବୁଲ ସୁରକ୍ଷା। ତମ୍ବା ବାହାର କରିବା ପାଇଁ ତାର ଜଳାନ୍ତୁ ନାହିଁ। ପ୍ଲାଷ୍ଟିକ୍ ଜଳିବା ଦ୍ୱାରା ବିଷାକ୍ତ ଧୂଆଁ ବାହାରେ। ତାରକୁ ନ ଜଳାଇ ଅନୁମୋଦିତ ସଂସ୍ଥାକୁ ବିକ୍ରି କରନ୍ତୁ।',
    },
  },
  {
    id: 'SAFE-LCDS',
    category: 'LAPTOP',
    icon: '🖥️',
    titleKey: 'safety.topics.lcds.title',
    subtitleKey: 'safety.topics.lcds.subtitle',
    warningKey: 'safety.topics.lcds.warning',
    whyDangerousKey: 'safety.topics.lcds.whyDangerous',
    dontKeys: [
      'safety.topics.lcds.dont1',
      'safety.topics.lcds.dont2',
      'safety.topics.lcds.dont3',
    ],
    doKeys: [
      'safety.topics.lcds.do1',
      'safety.topics.lcds.do2',
      'safety.topics.lcds.do3',
    ],
    defaultSpeechText: {
      en: 'LCD screen safety. Do not break flat screens or smash backlights. Older screens contain fragile lamps with mercury. Handle screens gently and segregate broken glass safely.',
      hi: 'एलसीडी स्क्रीन सुरक्षा। फ्लैट स्क्रीन को न तोड़ें और न ही बैकलाइट लैंप को फोड़ें। पुरानी स्क्रीनों में पारा हो सकता है। स्क्रीन को ध्यान से संभालें और टूटे कांच को अलग रखें।',
      mr: 'एलसीडी स्क्रीन सुरक्षितता. स्क्रीन फोडू नका. जुन्या स्क्रीनमध्ये पारा असलेले दिवे असू शकतात. स्क्रीन काळजीपूर्वक हाताळा आणि काच फुटल्यास सुरक्षित ठेवा.',
      or: 'ଏଲସିଡି ସ୍କ୍ରିନ୍ ସୁରକ୍ଷା। ଫ୍ଲାଟ୍ ସ୍କ୍ରିନକୁ ଭାଙ୍ଗନ୍ତୁ ନାହିଁ। ପୁରୁଣା ସ୍କ୍ରିନରେ ପାରଦ ଥାଇପାରେ। ସ୍କ୍ରିନକୁ ସାବଧାନତାର ସହ ପରିବହନ କରନ୍ତୁ।',
    },
  },
  {
    id: 'SAFE-GENERAL',
    category: 'OTHER',
    icon: '♻️',
    titleKey: 'safety.topics.general.title',
    subtitleKey: 'safety.topics.general.subtitle',
    warningKey: 'safety.topics.general.warning',
    whyDangerousKey: 'safety.topics.general.whyDangerous',
    dontKeys: [
      'safety.topics.general.dont1',
      'safety.topics.general.dont2',
      'safety.topics.general.dont3',
    ],
    doKeys: [
      'safety.topics.general.do1',
      'safety.topics.general.do2',
      'safety.topics.general.do3',
    ],
    defaultSpeechText: {
      en: 'General e-waste handling. Avoid open-air burning, chemical washing, and uncontrolled dumping. Sort e-waste by material category and deliver to certified recyclers for fair market value.',
      hi: 'सामान्य ई-कचरा प्रबंधन। खुले में आग लगाने, केमिकल धोने और कचरा फेंकने से बचें। सामग्री को अलग-अलग श्रेणियों में रखें और सही दाम पाने के लिए अधिकृत पुनर्चक्रणकर्ता को दें।',
      mr: 'सर्वसाधारण ई-कचरा हाताळणी. कचरा जाळणे किंवा रसायनाने धुणे टाळा. साहित्य वेगवेगळ्या प्रकारात वेगळे ठेवा आणि अधिकृत पुनर्वापर केंद्रात पाठवा.',
      or: 'ସାଧାରଣ ଇ-ବର୍ଜ୍ୟବସ୍ତୁ ସୁରକ୍ଷା। ଖୋଲାରେ ନିଆଁ ଲଗାଇବା କିମ୍ବା ରାସାୟନିକ ପଦାର୍ଥରେ ଧୋଇବା ଅନୁଚିତ। ସାମଗ୍ରୀକୁ ଅଲଗା ରଖି ଅନୁମୋଦିତ ରିସାଇକ୍ଲରଙ୍କୁ ଦିଅନ୍ତୁ।',
    },
  },
  {
    id: 'SAFE-STORAGE',
    category: 'STORAGE',
    icon: '📦',
    titleKey: 'safety.topics.storage.title',
    subtitleKey: 'safety.topics.storage.subtitle',
    warningKey: 'safety.topics.storage.warning',
    whyDangerousKey: 'safety.topics.storage.whyDangerous',
    dontKeys: [
      'safety.topics.storage.dont1',
      'safety.topics.storage.dont2',
      'safety.topics.storage.dont3',
    ],
    doKeys: [
      'safety.topics.storage.do1',
      'safety.topics.storage.do2',
      'safety.topics.storage.do3',
    ],
    defaultSpeechText: {
      en: 'Storage and transport safety. Do not stack heavy e-waste precariously or store near cooking fires. Keep materials dry and covered. Tie down loads securely during transport.',
      hi: 'भंडारण और परिवहन सुरक्षा। ई-कचरे को बहुत ऊंचा न लादें और आग या रसोई के पास न रखें। सामग्री को सूखा रखें और ले जाते समय अच्छी तरह बांधें।',
      mr: 'साठवणूक आणि वाहतूक सुरक्षितता. जड कचरा असुरक्षितपणे रचू नका किंवा आगीजवळ ठेवू नका. साहित्य कोरडे ठेवा आणि वाहतुकीदरम्यान घट्ट बांधा.',
      or: 'ସଂରକ୍ଷଣ ଏବଂ ପରିବହନ ସୁରକ୍ଷା। ଭାରୀ ଇ-ବର୍ଜ୍ୟବସ୍ତୁକୁ ଅସୁରକ୍ଷିତ ଭାବେ ରଖନ୍ତୁ ନାହିଁ। ସାମଗ୍ରୀକୁ ଶୁଖିଲା ରଖନ୍ତୁ ଏବଂ ପରିବହନ ସମୟରେ ବାନ୍ଧି ରଖନ୍ତୁ।',
    },
  },
  {
    id: 'SAFE-PPE',
    category: 'PPE',
    icon: '🧤',
    titleKey: 'safety.topics.ppe.title',
    subtitleKey: 'safety.topics.ppe.subtitle',
    warningKey: 'safety.topics.ppe.warning',
    whyDangerousKey: 'safety.topics.ppe.whyDangerous',
    dontKeys: [
      'safety.topics.ppe.dont1',
      'safety.topics.ppe.dont2',
      'safety.topics.ppe.dont3',
    ],
    doKeys: [
      'safety.topics.ppe.do1',
      'safety.topics.ppe.do2',
      'safety.topics.ppe.do3',
    ],
    defaultSpeechText: {
      en: 'Personal protective equipment. Wear sturdy gloves and covered footwear when sorting e-waste. Wash hands thoroughly before eating. Remember: protective gear does not make burning or acid processing safe.',
      hi: 'व्यक्तिगत सुरक्षा उपकरण। ई-कचरा छांटते समय मजबूत दस्ताने और जूते पहनें। खाना खाने से पहले हाथ अच्छी तरह धोएं। याद रखें: दस्ताने पहनने से भी आग जलाना या तेजाब का उपयोग सुरक्षित नहीं होता।',
      mr: 'वैयक्तिक सुरक्षा साधने. ई-कचरा हाताळताना मजबूत हातमोजे आणि पादत्राणे वापरा. जेवणापूर्वी हात स्वच्छ धुवा. लक्षात ठेवा: हातमोजे असले तरी कचरा जाळणे सुरक्षित होत नाही.',
      or: 'ବ୍ୟକ୍ତିଗତ ସୁରକ୍ଷା ଉପକରଣ। ଇ-କଚରା କାମ କରିବା ସମୟରେ ହାତମୋଜା ଏବଂ ଜୋତା ବ୍ୟବହାର କରନ୍ତୁ। ଖାଇବା ପୂର୍ବରୁ ହାତ ଭଲ ଭାବେ ଧୁଅନ୍ତୁ। ମନେରଖନ୍ତୁ: ସୁରକ୍ଷା ଉପକରଣ ମଧ୍ୟ ନିଆଁ କିମ୍ବା ଏସିଡ୍ ବ୍ୟବହାରକୁ ସୁରକ୍ଷିତ କରେ ନାହିଁ।',
    },
  },
];

/**
 * Get safety topic by ID
 */
export function getSafetyTopicById(id: string): SafetyTopic | undefined {
  return SAFETY_TOPICS.find((t) => t.id === id);
}

/**
 * Get safety topic corresponding to a material category
 */
export function getSafetyTopicForCategory(category: string): SafetyTopic | undefined {
  const norm = (category || '').toUpperCase().trim();
  if (norm.includes('BATTERY')) {
    return getSafetyTopicById('SAFE-BATTERIES');
  }
  if (norm.includes('CRT') || norm.includes('MONITOR')) {
    return getSafetyTopicById('SAFE-CRTS');
  }
  if (norm.includes('PCB') || norm.includes('BOARD')) {
    return getSafetyTopicById('SAFE-PCBS');
  }
  if (norm.includes('CABLE') || norm.includes('CHARGER') || norm.includes('WIRE')) {
    return getSafetyTopicById('SAFE-CABLES');
  }
  if (norm.includes('LCD') || norm.includes('LAPTOP') || norm.includes('TABLET') || norm.includes('SCREEN')) {
    return getSafetyTopicById('SAFE-LCDS');
  }
  return getSafetyTopicById('SAFE-GENERAL');
}

/**
 * Convenient non-null category getter with fallback to General E-Waste
 */
export function getSafetyTopicByCategory(category: string): SafetyTopic {
  return getSafetyTopicForCategory(category) || getSafetyTopicById('SAFE-GENERAL')!;
}

/**
 * Visual styling theme for low-literacy pictorial cards
 */
export interface SafetyTopicColorTheme {
  primary: string;
  background: string;
  border: string;
  accent: string;
}

export function getTopicColorTheme(id: string): SafetyTopicColorTheme {
  switch (id) {
    case 'SAFE-BATTERIES':
      return { primary: '#dc2626', background: '#fef2f2', border: '#fca5a5', accent: '#b91c1c' };
    case 'SAFE-CRTS':
      return { primary: '#475569', background: '#f8fafc', border: '#cbd5e1', accent: '#334155' };
    case 'SAFE-PCBS':
      return { primary: '#16a34a', background: '#f0fdf4', border: '#86efac', accent: '#15803d' };
    case 'SAFE-CABLES':
      return { primary: '#ea580c', background: '#fff7ed', border: '#fdba74', accent: '#c2410c' };
    case 'SAFE-LCDS':
      return { primary: '#0284c7', background: '#f0f9ff', border: '#7dd3fc', accent: '#0369a1' };
    case 'SAFE-GENERAL':
      return { primary: '#0d9488', background: '#f0fdfa', border: '#5eead4', accent: '#0f766e' };
    case 'SAFE-STORAGE':
      return { primary: '#ca8a04', background: '#fefce8', border: '#fde047', accent: '#a16207' };
    case 'SAFE-PPE':
      return { primary: '#4f46e5', background: '#eef2ff', border: '#a5b4fc', accent: '#4338ca' };
    default:
      return { primary: '#0d9488', background: '#f0fdfa', border: '#5eead4', accent: '#0f766e' };
  }
}

/**
 * Generate localized speech text for low-literacy TTS playback
 */
export function generateSafetySpeechText(topic: SafetyTopic, language: string = 'en'): string {
  const langKey = language === 'hi' ? 'hi' : language === 'mr' ? 'mr' : language === 'or' ? 'or' : 'en';
  return topic.defaultSpeechText[langKey] || topic.defaultSpeechText.en;
}

/**
 * Generate spoken overview of Safety Center for low-literacy collectors
 */
export function generateSafetyOverviewSpeechText(language: string = 'en'): string {
  const langKey = language === 'hi' ? 'hi' : language === 'mr' ? 'mr' : language === 'or' ? 'or' : 'en';
  const overviews: Record<string, string> = {
    en: 'Welcome to the Collector Safety Center. Never burn cables or circuit boards. Never smash CRT tubes or puncture batteries. Deliver your scrap to authorized recyclers for safe processing.',
    hi: 'कबाड़ीवाला सुरक्षा केंद्र में आपका स्वागत है। तारों और सर्किट बोर्डों को कभी न जलाएं। सीआरटी ट्यूब और बैटरियों को कभी न तोड़ें। सुरक्षित निपटान के लिए कबाड़ केवल अधिकृत रीसाइक्लर को ही दें।',
    mr: 'कचरा वेचक सुरक्षा केंद्रात आपले स्वागत आहे. वायर्स किंवा सर्किट बोर्ड कधीही जाळू नका. सीआरटी आणि बॅटऱ्या फोडू नका. सुरक्षित प्रक्रियेसाठी भंगार फक्त अधिकृत पुनर्वापरदाराकडे सोपवा.',
    or: 'କବାଡ଼ିବାଲା ସୁରକ୍ଷା କେନ୍ଦ୍ରକୁ ସ୍ୱାଗତ। ତାର କିମ୍ବା ସର୍କିଟ ବୋର୍ଡ କେବେ ଜଳାନ୍ତୁ ନାହିଁ। ସିଆରଟି ଓ ବ୍ୟାଟେରୀ ଭାଙ୍ଗନ୍ତୁ ନାହିଁ। ସୁରକ୍ଷିତ ପ୍ରକ୍ରିୟାକରଣ ପାଇଁ ଭଙ୍ଗା ସାମଗ୍ରୀ ଅନୁମୋଦିତ ରିସାଇକ୍ଲରଙ୍କୁ ଦିଅନ୍ତୁ।',
  };
  return overviews[langKey] || overviews.en;
}

