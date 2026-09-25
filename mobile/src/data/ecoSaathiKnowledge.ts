/**
 * EcoSetu — Eco-Saathi Verified Knowledge Store (Step 6 Enhanced)
 * Source of Truth: docs/ECOSETU_ECO-SAATHI_IMPLEMENTATION_ARCHITECTURE_v1.0.md
 * 
 * 100% verified intents aligned with the active codebase.
 * Expanded with natural conversational phrases and Roman transliterations
 * for English (en), Hindi (hi), Marathi (mr), and Odia (or).
 */

import { SaathiIntent } from '../types/ecoSaathi';

export const ECO_SAATHI_INTENTS: SaathiIntent[] = [
  // ==========================================
  // 1. GENERAL INTENTS
  // ==========================================
  {
    id: 'INTENT_WHO_IS_ECO_SAATHI',
    category: 'GENERAL',
    applicableRoles: ['ALL'],
    triggerPatterns: {
      en: ['who are you', 'what is eco saathi', 'what is your name', 'tell me about yourself', 'who is saathi', 'about saathi', 'introduce yourself'],
      hi: ['तुम कौन हो', 'इको साथी क्या है', 'तुम्हारा नाम क्या है', 'इको साथी के बारे में बताओ', 'tum kaun ho', 'eco saathi kya hai', 'saathi kon hai'],
      mr: ['तू कोण आहेस', 'इको साथी काय आहे', 'तुझे नाव काय आहे', 'इको साथी बद्दल सांगा', 'tu kon aahes', 'eco saathi kay aahe', 'saathi kon aahe'],
      or: ['ତୁମେ କିଏ', 'ଇକୋ ସାଥୀ କଣ', 'ତୁମ ନାମ କଣ', 'ଇକୋ ସାଥୀ ବିଷୟରେ କୁହ', 'tume kie', 'eco saathi kana', 'tuma nama kana', 'saathi kie'],
    },
    keywords: {
      en: ['who', 'saathi', 'assistant', 'help', 'bot', 'name'],
      hi: ['कौन', 'साथी', 'मदद', 'सहायक', 'नाम', 'kaun', 'saathi', 'naam'],
      mr: ['कोण', 'साथी', 'मदत', 'सहाय्यक', 'नाव', 'kon', 'saathi', 'naav'],
      or: ['କିଏ', 'ସାଥୀ', 'ସାହାଯ୍ୟ', 'ସହାୟକ', 'ନାମ', 'kie', 'saathi', 'nama'],
    },
    responseI18nKey: 'saathi.intents.who_is_eco_saathi.answer',
    requiresDynamicData: false,
    quickReplies: ['INTENT_WHAT_IS_ECOSETU', 'INTENT_HOW_TO_CREATE_LOT', 'INTENT_PRICE_BOARD'],
    safetySensitivity: 'STANDARD',
  },
  {
    id: 'INTENT_WHAT_IS_ECOSETU',
    category: 'GENERAL',
    applicableRoles: ['ALL'],
    triggerPatterns: {
      en: ['what is ecosetu', 'about ecosetu', 'how does ecosetu work', 'what does this app do', 'ecosetu overview', 'ecosetu platform'],
      hi: ['इकोसेतु क्या है', 'इकोसेतु के बारे में', 'यह ऐप क्या करता है', 'इकोसेतु कैसे काम करता है', 'ecosetu kya hai', 'ye app kya karta hai', 'ecosetu ke bare me'],
      mr: ['इकोसेतू काय आहे', 'इकोसेतू बद्दल माहिती', 'हे ॲप काय करते', 'इकोसेतू कसे काम करते', 'ecosetu kay aahe', 'he app kay karte'],
      or: ['ଇକୋସେତୁ କଣ', 'ଇକୋସେତୁ ବିଷୟରେ', 'ଏହି ଆପ୍ କଣ କରେ', 'ଇକୋସେତୁ କିପରି କାମ କରେ', 'ecosetu kana', 'ehi app kana kare'],
    },
    keywords: {
      en: ['ecosetu', 'platform', 'app', 'purpose', 'about', 'work'],
      hi: ['इकोसेतु', 'प्लेटफॉर्म', 'ऐप', 'उद्देश्य', 'काम', 'ecosetu', 'platform', 'app'],
      mr: ['इकोसेतू', 'प्लॅटफॉर्म', 'ॲप', 'उद्देश', 'काम', 'ecosetu', 'platform', 'app'],
      or: ['ଇକୋସେତୁ', 'ପ୍ଲାଟଫର୍ମ', 'ଆପ୍', 'ଉଦ୍ଦେଶ୍ୟ', 'କାମ', 'ecosetu', 'platform', 'app'],
    },
    responseI18nKey: 'saathi.intents.what_is_ecosetu.answer',
    requiresDynamicData: false,
    quickReplies: ['INTENT_PRICE_BOARD', 'INTENT_SAFETY_BATTERY', 'INTENT_AI_CLASSES'],
    safetySensitivity: 'STANDARD',
  },
  {
    id: 'INTENT_SUPPORT_HELP',
    category: 'GENERAL',
    applicableRoles: ['ALL'],
    triggerPatterns: {
      en: ['customer care', 'contact support', 'helpline number', 'human support', 'how to get help', 'help me', 'need support', 'agent number', 'contact ecosetu'],
      hi: ['कस्टमर केयर', 'सपोर्ट से संपर्क करें', 'हेल्पलाइन नंबर', 'मदद कैसे पाएं', 'help chahiye', 'customer care number', 'madad karo', 'support team', 'sahayata chahiye'],
      mr: ['ग्राहक सेवा', 'सपोर्टशी संपर्क साधा', 'हेल्पलाइन नंबर', 'मदत कशी मिळवावी', 'madat havi', 'customer care number', 'support team', 'madat kara'],
      or: ['ଗ୍ରାହକ ସେବା', 'ସପୋର୍ଟ ସହିତ ଯୋଗାଯୋଗ', 'ହେଲ୍ପଲାଇନ ନମ୍ବର', 'ସାହାଯ୍ୟ କିପରି ପାଇବେ', 'sahajya darkar', 'customer care number', 'support team', 'sahajya karantu'],
    },
    keywords: {
      en: ['support', 'contact', 'helpline', 'care', 'call', 'phone', 'help', 'agent'],
      hi: ['सपोर्ट', 'संपर्क', 'हेल्पलाइन', 'फोन', 'कॉल', 'मदद', 'support', 'help', 'contact', 'madad'],
      mr: ['सपोर्ट', 'संपर्क', 'हेल्पलाइन', 'फोन', 'कॉल', 'मदत', 'support', 'help', 'contact', 'madat'],
      or: ['ସପୋର୍ଟ', 'ଯୋଗାଯୋଗ', 'ହେଲ୍ପଲାଇନ', 'ଫୋନ', 'କଲ', 'ସାହାଯ୍ୟ', 'support', 'help', 'contact', 'sahajya'],
    },
    responseI18nKey: 'saathi.intents.support_help.answer',
    suggestedAction: {
      actionType: 'NAVIGATE',
      targetRoute: 'CollectorDisputes',
      actionLabelI18nKey: 'saathi.actions.open_disputes',
    },
    requiresDynamicData: false,
    quickReplies: ['INTENT_REPORT_DISPUTE', 'INTENT_OFFLINE_MODE'],
    safetySensitivity: 'STANDARD',
  },

  // ==========================================
  // 2. AI CAMERA INTENTS
  // ==========================================
  {
    id: 'INTENT_AI_CLASSES',
    category: 'AI_CAMERA',
    applicableRoles: ['ALL'],
    triggerPatterns: {
      en: ['what does ai camera detect', 'which items can ai detect', 'ai detection classes', 'what devices can camera identify', 'ai camera', 'camera detection', 'what items can camera scan'],
      hi: ['कैमरा क्या पहचान सकता है', 'एआई कौन से उपकरण पहचानता है', 'एआई कैमरा क्या स्कैन करता है', 'camera kya detect karta hai', 'ai kya pehchanta hai', 'camera scan nahi kar raha', 'ai classes'],
      mr: ['कॅमेरा काय ओळखू शकतो', 'एआय कोणती उपकरणे ओळखतो', 'एआय कॅमेरा काय स्कॅन करतो', 'camera kay detect karto', 'ai kay olakhto', 'camera scan'],
      or: ['କ୍ୟାମେରା କଣ ଚିହ୍ନିପାରିବ', 'ଏଆଇ କେଉଁ ଉପକରଣ ଚିହ୍ନଟ କରେ', 'ଏଆଇ କ୍ୟାମେରା କଣ ସ୍କାନ କରେ', 'camera kan detect kare', 'ai kan chihnat kare', 'camera scan'],
    },
    keywords: {
      en: ['detect', 'classes', 'camera', 'identify', 'scan', 'recognize', 'ai'],
      hi: ['पहचान', 'कैमरा', 'स्कैन', 'एआई', 'उपकरण', 'camera', 'detect', 'scan', 'ai'],
      mr: ['ओळख', 'कॅमेरा', 'स्कॅन', 'एआय', 'उपकरणे', 'camera', 'detect', 'scan', 'ai'],
      or: ['ଚିହ୍ନଟ', 'କ୍ୟାମେରା', 'ସ୍କାନ', 'ଏଆଇ', 'ଯନ୍ତ୍ର', 'camera', 'detect', 'scan', 'ai'],
    },
    responseI18nKey: 'saathi.intents.ai_classes.answer',
    requiresDynamicData: false,
    quickReplies: ['INTENT_AI_MANUAL_SELECTION', 'INTENT_AI_ACCURACY'],
    safetySensitivity: 'STANDARD',
  },
  {
    id: 'INTENT_AI_MANUAL_SELECTION',
    category: 'AI_CAMERA',
    applicableRoles: ['ALL'],
    triggerPatterns: {
      en: ['how to select other categories', 'what if my item is not detected', 'item not recognized by ai', 'manual category selection', 'can i select category manually', 'wrong category detected', 'why other category'],
      hi: ['अगर एआई सामान न पहचाने तो क्या करें', 'अन्य श्रेणी कैसे चुनें', 'मैन्युअल रूप से श्रेणी कैसे चुनें', 'manual select kaise kare', 'category nahi mil rahi', 'galat category aayi', 'other category select karna hai'],
      mr: ['एआयने वस्तू ओळखली नाही तर काय करावे', 'इतर श्रेणी कशी निवडावी', 'मॅन्युअली प्रकार कसा निवडावा', 'manual select kasa karava', 'chuki chi category aali'],
      or: ['ଯଦି ଏଆଇ ଜିନିଷ ନ ଚିହ୍ନିପାରେ କଣ କରିବେ', 'ଅନ୍ୟ ବର୍ଗ କିପରି ବାଛିବେ', 'ମାନୁଆଲ୍ ଭାବରେ କିପରି ବାଛିବେ', 'manual select kemiti karibi', 'bhul category aasila'],
    },
    keywords: {
      en: ['manual', 'select', 'not recognized', 'dropdown', 'other', 'category', 'wrong'],
      hi: ['मैन्युअल', 'अन्य', 'पहचान', 'सूची', 'चुनें', 'गलत', 'manual', 'select', 'category'],
      mr: ['मॅन्युअल', 'इतर', 'ओळख', 'यादी', 'निवडा', 'चूक', 'manual', 'select', 'category'],
      or: ['ମାନୁଆଲ୍', 'ଅନ୍ୟ', 'ଚିହ୍ନଟ', 'ତାଲିକା', 'ବାଛନ୍ତୁ', 'ଭୁଲ', 'manual', 'select', 'category'],
    },
    responseI18nKey: 'saathi.intents.ai_manual_selection.answer',
    requiresDynamicData: false,
    quickReplies: ['INTENT_AI_CLASSES', 'INTENT_HOW_TO_CREATE_LOT'],
    safetySensitivity: 'STANDARD',
  },
  {
    id: 'INTENT_AI_ACCURACY',
    category: 'AI_CAMERA',
    applicableRoles: ['ALL'],
    triggerPatterns: {
      en: ['is ai accurate', 'is ai 100 percent accurate', 'does ai set the price', 'is ai final', 'ai mistakes', 'is ai price binding'],
      hi: ['क्या एआई हमेशा सही होता है', 'क्या एआई दाम तय करता है', 'क्या एआई की पहचान अंतिम है', 'ai accurate hai kya', 'kya ai rate fix karta hai'],
      mr: ['एआय १०० टक्के अचूक आहे का', 'एआय किंमत ठरवतो का', 'एआयची ओळख अंतिम आहे का', 'ai accurate aahe ka', 'ai rate fix karto ka'],
      or: ['ଏଆଇ କଣ ସମ୍ପୂର୍ଣ୍ଣ ସଠିକ୍', 'ଏଆଇ କଣ ଦର ନିର୍ଦ୍ଧାରଣ କରେ', 'ଏଆଇ ନିଷ୍ପତ୍ତି କଣ ଚୂଡ଼ାନ୍ତ', 'ai accurate ki', 'ai rate fix kare ki'],
    },
    keywords: {
      en: ['accuracy', 'accurate', 'mistake', 'final', 'assistive', 'binding'],
      hi: ['सटीक', 'गलती', 'अंतिम', 'दाम', 'accurate', 'price', 'final'],
      mr: ['अचूक', 'चूक', 'अंतिम', 'किंमत', 'accurate', 'price', 'final'],
      or: ['ସଠିକ୍', 'ଭୁଲ', 'ଚୂଡ଼ାନ୍ତ', 'ଦର', 'accurate', 'price', 'final'],
    },
    responseI18nKey: 'saathi.intents.ai_accuracy.answer',
    requiresDynamicData: false,
    quickReplies: ['INTENT_AI_CLASSES', 'INTENT_PRICE_DETERMINATION'],
    safetySensitivity: 'STANDARD',
  },

  // ==========================================
  // 3. PRICING INTENTS
  // ==========================================
  {
    id: 'INTENT_PRICE_BOARD',
    category: 'PRICING',
    applicableRoles: ['ALL'],
    triggerPatterns: {
      en: ['where can i see prices', 'show price board', 'scrap rates', 'scrap price list', 'view market prices', 'open price board', 'price discovery board', 'show scrap rates list'],
      hi: ['भाव कहाँ देखें', 'प्राइस बोर्ड दिखाओ', 'स्क्रैप का रेट', 'कबाड़ का भाव', 'रेट लिस्ट', 'price board dikhao', 'scrap rates list', 'rate list kahan hai', 'bhav board'],
      mr: ['भाव कुठे पाहू', 'प्राईस बोर्ड दाखवा', 'स्क्रॅपचा दर', 'भावाची यादी', 'price board dakhva', 'rate list kuthe aahe', 'bhav list'],
      or: ['ଦର କେଉଁଠି ଦେଖିବି', 'ପ୍ରାଇସ୍ ବୋର୍ଡ ଦେଖାନ୍ତୁ', 'ସ୍କ୍ରାପ୍ ରେଟ୍', 'ଦର ତାଲିକା', 'price board dekhantu', 'rate list kouthi achi', 'dara list'],
    },
    keywords: {
      en: ['price', 'rate', 'board', 'rates', 'scrap', 'cost', 'kg', 'list', 'market'],
      hi: ['भाव', 'दाम', 'रेट', 'बोर्ड', 'स्क्रैप', 'कबाड़', 'लिस्ट', 'price', 'rate', 'board', 'bhav'],
      mr: ['भाव', 'दर', 'बोर्ड', 'स्क्रॅप', 'किंमत', 'यादी', 'price', 'rate', 'board', 'bhav'],
      or: ['ଦର', 'ରେଟ୍', 'ବୋର୍ଡ', 'ସ୍କ୍ରାପ୍', 'ମୂଲ୍ୟ', 'ତାଲିକା', 'price', 'rate', 'board', 'dara'],
    },
    responseI18nKey: 'saathi.intents.price_board.answer',
    suggestedAction: {
      actionType: 'NAVIGATE',
      targetRoute: 'CollectorPriceBoard',
      actionLabelI18nKey: 'saathi.actions.open_price_board',
    },
    requiresDynamicData: false,
    quickReplies: ['INTENT_TODAYS_PRICE', 'INTENT_PRICE_DETERMINATION'],
    safetySensitivity: 'STANDARD',
  },
  {
    id: 'INTENT_TODAYS_PRICE',
    category: 'PRICING',
    applicableRoles: ['ALL'],
    triggerPatterns: {
      en: ['what is todays price', 'current price of mobile', 'how much per kg', 'what is current copper rate', 'today price', 'scrap rate today', 'rate per kg', 'current scrap rates', 'today market rate', 'bhav today'],
      hi: ['आज का भाव क्या है', 'मोबाइल का क्या रेट है', 'प्रति किलो कितना मिलेगा', 'आज का स्क्रैप रेट', 'aaj ka rate', 'aaj ka bhav', 'bhav kitna hai', 'rate kitna hai', 'copper ka rate', 'battery ka bhav', 'current scrap price'],
      mr: ['आजचा भाव काय आहे', 'मोबाईलचा काय दर आहे', 'प्रति किलो किती मिळेल', 'aaj cha bhav', 'aaj cha rate', 'rate kiti aahe', 'bhav kiti aahe', 'bhangar cha bhav', 'copper cha rate'],
      or: ['ଆଜିର ଦର କେତେ', 'ମୋବାଇଲର ରେଟ୍ କଣ', 'କିଲୋ ପ୍ରତି କେତେ ଟଙ୍କା', 'aaji ra rate kete', 'aaji ra dara kete', 'rate kete achi', 'dara kete achi', 'tamba rate kete', 'battery rate kete'],
    },
    keywords: {
      en: ['today', 'current', 'rate', 'price', 'copper', 'pcb', 'battery', 'per kg', 'benchmark'],
      hi: ['आज', 'वर्तमान', 'रेट', 'भाव', 'किलो', 'तांबा', 'बैटरी', 'aaj', 'rate', 'bhav', 'today', 'price'],
      mr: ['आज', 'चालू', 'दर', 'भाव', 'किलो', 'तांबे', 'बॅटरी', 'aaj', 'rate', 'bhav', 'today', 'price'],
      or: ['ଆଜି', 'ବର୍ତ୍ତମାନ', 'ରେଟ୍', 'ଦର', 'କିଲୋ', 'ତମ୍ବା', 'ବ୍ୟାଟେରୀ', 'aaji', 'rate', 'dara', 'today', 'price'],
    },
    responseI18nKey: 'saathi.intents.todays_price.answer',
    suggestedAction: {
      actionType: 'NAVIGATE',
      targetRoute: 'CollectorPriceBoard',
      actionLabelI18nKey: 'saathi.actions.open_price_board',
    },
    requiresDynamicData: true,
    dynamicDataResolverKey: 'RESOLVE_PRICE_BOARD',
    quickReplies: ['INTENT_PRICE_BOARD', 'INTENT_PRICE_DETERMINATION'],
    safetySensitivity: 'STANDARD',
  },
  {
    id: 'INTENT_PRICE_DETERMINATION',
    category: 'PRICING',
    applicableRoles: ['ALL'],
    triggerPatterns: {
      en: ['how are prices decided', 'who sets the price', 'is price fixed or negotiated', 'can i bargain', 'price fixing rules', 'how scrap rate is determined'],
      hi: ['दाम कैसे तय होता है', 'क्या मोलभाव कर सकते हैं', 'क्या रेट फिक्स है', 'कीमत कौन तय करता है', 'rate kaise decide hota hai', 'kya molbhav kar sakte hai', 'price fix hai kya'],
      mr: ['किंमत कशी ठरते', 'घासाघिस करता येते का', 'दर फिक्स आहे का', 'rate kasa decide hoto', 'ghasghis karta yete ka', 'bhav kon tharvato'],
      or: ['ଦର କିପରି ସ୍ଥିର ହୁଏ', 'ଦରଦାମ କରିପାରିବି କି', 'ରେଟ୍ କଣ ଫିକ୍ସ ଅଛି', 'rate kemiti decide hue', 'dardam kari paribi ki', 'dara kie sthira kare'],
    },
    keywords: {
      en: ['decide', 'negotiate', 'bargain', 'fixed', 'market', 'determined', 'rule'],
      hi: ['तय', 'मोलभाव', 'फिक्स', 'बातचीत', 'नियम', 'negotiate', 'decide', 'bargain'],
      mr: ['ठरणे', 'घासाघिस', 'फिक्स', 'चर्चा', 'नियम', 'negotiate', 'decide', 'bargain'],
      or: ['ସ୍ଥିର', 'ଦରଦାମ', 'ଫିକ୍ସ', 'କଥାବାର୍ତ୍ତା', 'ନିୟମ', 'negotiate', 'decide', 'bargain'],
    },
    responseI18nKey: 'saathi.intents.price_determination.answer',
    requiresDynamicData: false,
    quickReplies: ['INTENT_PRICE_BOARD', 'INTENT_NEGOTIATE_OFFER'],
    safetySensitivity: 'STANDARD',
  },

  // ==========================================
  // 4. LOT CREATION & MANAGEMENT INTENTS
  // ==========================================
  {
    id: 'INTENT_HOW_TO_CREATE_LOT',
    category: 'LOTS',
    applicableRoles: ['INFORMAL_COLLECTOR'],
    triggerPatterns: {
      en: ['how to create a lot', 'how to sell scrap', 'create lot', 'list materials for sale', 'how to sell on ecosetu', 'how can i sell my scrap', 'how do i sell e waste', 'where do i sell this', 'i want to sell electronics', 'sell my scrap', 'how to list lot', 'sell ewaste'],
      hi: ['लॉट कैसे बनाएं', 'कबाड़ कैसे बेचें', 'सामान बेचने के लिए कैसे डालें', 'लॉट बनाना सीखें', 'scrap kaise bechu', 'maal kaise bechna hai', 'mujhe purana mobile bechna hai', 'bhai scrap kaise bechu', 'kabaad kaise beche', 'saman bechna hai', 'e waste kaise beche', 'lot kaise banaye'],
      mr: ['लॉट कसा तयार करावा', 'स्क्रॅप कसे विकावे', 'माल विक्रीसाठी कसा टाकावा', 'scrap kasa vikava', 'maal kasa vikaycha', 'bhangar kasa vikaycha', 'mobile kasa vikaycha', 'e waste kasa vikava', 'lot kasa banvava'],
      or: ['ଲଟ୍ କିପରି ତିଆରି କରିବେ', 'ସ୍କ୍ରାପ୍ କିପରି ବିକ୍ରି କରିବେ', 'ମାଲ ବିକ୍ରି ପାଇଁ କିପରି ରଖିବେ', 'scrap kemiti bikibi', 'maal kemiti bikiba', 'bhangara kemiti bikibi', 'e waste kemiti bikibi', 'puruna phone bikibi', 'lot kemiti baneibi'],
    },
    keywords: {
      en: ['create', 'lot', 'sell', 'list', 'scrap', 'selling', 'material', 'ewaste'],
      hi: ['लॉट', 'बनाएं', 'बेचें', 'कबाड़', 'सामान', 'माल', 'sell', 'lot', 'bechna', 'scrap', 'bechu'],
      mr: ['लॉट', 'तयार', 'विका', 'स्क्रॅप', 'माल', 'भांगार', 'sell', 'lot', 'vikaycha', 'scrap', 'vikava'],
      or: ['ଲଟ୍', 'ତିଆରି', 'ବିକ୍ରି', 'ସ୍କ୍ରାପ୍', 'ମାଲ୍', 'ଭଙ୍ଗା', 'sell', 'lot', 'bikibi', 'scrap', 'bikiba'],
    },
    responseI18nKey: 'saathi.intents.how_to_create_lot.answer',
    suggestedAction: {
      actionType: 'NAVIGATE',
      targetRoute: 'CollectorCreateLot',
      actionLabelI18nKey: 'saathi.actions.create_lot',
    },
    requiresDynamicData: false,
    quickReplies: ['INTENT_AI_CLASSES', 'INTENT_VIEW_OFFERS', 'INTENT_PRICE_BOARD'],
    safetySensitivity: 'STANDARD',
  },
  {
    id: 'INTENT_MY_LOTS_STATUS',
    category: 'LOTS',
    applicableRoles: ['INFORMAL_COLLECTOR'],
    triggerPatterns: {
      en: ['where is my lot', 'status of my lots', 'show my created lots', 'my unsold lots', 'my listed lots', 'my lots', 'lot status', 'open lots', 'check my lots'],
      hi: ['मेरे लॉट कहाँ हैं', 'मेरे लॉट का स्टेटस', 'मेरे बनाए गए लॉट दिखाओ', 'सक्रिय लॉट', 'mera lot kahan hai', 'mere lots dikhao', 'lot status', 'meri listings', 'maal ka status'],
      mr: ['माझे लॉट्स कुठे आहेत', 'माझ्या लॉटची स्थिती', 'माझे लॉट्स दाखवा', 'majhe lots dakhva', 'lot status', 'majhe listing', 'maal chi sthiti'],
      or: ['ମୋର ଲଟ୍ ଗୁଡ଼ିକ କେଉଁଠି', 'ମୋ ଲଟ୍ ର ସ୍ଥିତି', 'ମୋ ଲଟ୍ ଦେଖାନ୍ତୁ', 'mo lot kouthi achi', 'lot status', 'mo listing', 'maal ra sthiti'],
    },
    keywords: {
      en: ['my lots', 'lot status', 'unsold', 'listed', 'created', 'open lots', 'inventory'],
      hi: ['मेरे लॉट', 'स्टेटस', 'सक्रिय', 'बनाए', 'लॉट', 'my lot', 'lot status', 'listing'],
      mr: ['माझे लॉट्स', 'स्थिती', 'तयार', 'लॉट', 'my lot', 'lot status', 'listing'],
      or: ['ମୋ ଲଟ୍', 'ସ୍ଥିତି', 'ତାଲିକା', 'ଲଟ୍', 'my lot', 'lot status', 'listing'],
    },
    responseI18nKey: 'saathi.intents.my_lots_status.answer',
    suggestedAction: {
      actionType: 'NAVIGATE',
      targetRoute: 'CollectorLots',
      actionLabelI18nKey: 'saathi.actions.view_my_lots',
    },
    requiresDynamicData: true,
    dynamicDataResolverKey: 'RESOLVE_USER_LOTS',
    quickReplies: ['INTENT_HOW_TO_CREATE_LOT', 'INTENT_VIEW_OFFERS'],
    safetySensitivity: 'STANDARD',
  },
  {
    id: 'INTENT_LOT_CATEGORIES',
    category: 'LOTS',
    applicableRoles: ['ALL'],
    triggerPatterns: {
      en: ['what categories can i sell', 'list of ewaste categories', '16 material categories', 'which materials are accepted', 'supported categories', 'all categories'],
      hi: ['कौन सा ई-कचरा बेच सकते हैं', 'सामग्री की श्रेणियां', 'स्वीकृत सामग्री की सूची', 'kaun kaun si category bech sakte hai', '16 material categories kya hai'],
      mr: ['कोणता ई-कचरा विकू शकतो', 'साहित्याच्या श्रेणी', 'स्वीकृत साहित्याची यादी', 'konte e waste viku shakto', '16 categories konthya'],
      or: ['କେଉଁ ଇ-ବର୍ଜ୍ୟ ବିକ୍ରି କରିପାରିବି', 'ସାମଗ୍ରୀର ବର୍ଗ', 'ଗ୍ରହଣୀୟ ସାମଗ୍ରୀ ତାଲିକା', 'keu e waste bikri kari paribi', '16 category kana'],
    },
    keywords: {
      en: ['categories', 'taxonomy', 'materials', 'items', 'accepted', '16 categories'],
      hi: ['श्रेणी', 'सामग्री', 'स्वीकृत', 'कचरा', 'categories', 'materials', '16'],
      mr: ['श्रेणी', 'साहित्य', 'स्वीकृत', 'कचरा', 'categories', 'materials', '16'],
      or: ['ବର୍ଗ', 'ସାମଗ୍ରୀ', 'ତାଲିକା', 'ବର୍ଜ୍ୟ', 'categories', 'materials', '16'],
    },
    responseI18nKey: 'saathi.intents.lot_categories.answer',
    requiresDynamicData: false,
    quickReplies: ['INTENT_HOW_TO_CREATE_LOT', 'INTENT_PRICE_BOARD'],
    safetySensitivity: 'STANDARD',
  },

  // ==========================================
  // 5. CITIZEN & MARKETPLACE INTENTS
  // ==========================================
  {
    id: 'INTENT_CITIZEN_GIVE_EWASTE',
    category: 'MARKETPLACE',
    applicableRoles: ['CITIZEN', 'ALL'],
    triggerPatterns: {
      en: ['how do i give old phone', 'how to submit ewaste', 'i want to give ewaste', 'schedule ewaste pickup', 'citizen give item', 'dispose old electronics', 'pickup old phone', 'give scrap', 'i have old electronics to give'],
      hi: ['पुराना फोन कैसे दें', 'ई-कचरा कैसे जमा करें', 'पिकअप कैसे बुक करें', 'नागरिक ई-कचरा कैसे दें', 'purana mobile dena hai', 'pickup book karna hai', 'ewaste kaise submit kare', 'ghar se scrap pickup', 'purana laptop dena hai'],
      mr: ['जुना फोन कसा द्यावा', 'ई-कचरा कसा जमा करावा', 'पिकअप कसा बुक करावा', 'juna phone dyaycha aahe', 'pickup book kara', 'gharatun scrap dyaycha aahe', 'ewaste kasa submit karava'],
      or: ['ପୁରୁଣା ଫୋନ କିପରି ଦେବି', 'ଇ-ବର୍ଜ୍ୟ କିପରି ଜମା କରିବି', 'ପିକଅପ୍ କିପରି ବୁକ୍ କରିବି', 'puruna phone debi', 'pickup book karibi', 'gharu ewaste debi', 'ewaste kemiti jama karibi'],
    },
    keywords: {
      en: ['citizen', 'give', 'submit', 'pickup', 'old', 'dispose', 'schedule', 'donate'],
      hi: ['नागरिक', 'जमा', 'दें', 'पुराना', 'पिकअप', 'submit', 'give', 'pickup', 'purana'],
      mr: ['नागरिक', 'जमा', 'द्या', 'जुने', 'पिकअप', 'submit', 'give', 'pickup', 'juna'],
      or: ['ନାଗରିକ', 'ଜମା', 'ଦିଅନ୍ତୁ', 'ପୁରୁଣା', 'ପିକଅପ୍', 'submit', 'give', 'pickup', 'puruna'],
    },
    responseI18nKey: 'saathi.intents.citizen_give_ewaste.answer',
    suggestedAction: {
      actionType: 'NAVIGATE',
      targetRoute: 'CitizenSubmit',
      actionLabelI18nKey: 'saathi.actions.citizen_submit',
    },
    requiresDynamicData: false,
    quickReplies: ['INTENT_CITIZEN_REQUESTS_STATUS', 'INTENT_GREEN_CERTIFICATE'],
    safetySensitivity: 'STANDARD',
  },
  {
    id: 'INTENT_CITIZEN_REQUESTS_STATUS',
    category: 'MARKETPLACE',
    applicableRoles: ['CITIZEN'],
    triggerPatterns: {
      en: ['where is my pickup', 'status of my pickup request', 'did collector accept my request', 'my submitted requests', 'pickup status', 'when will pickup happen', 'when is collector coming', 'check my pickup'],
      hi: ['मेरा पिकअप कहाँ है', 'मेरे अनुरोध का स्टेटस', 'क्या कबाड़ीवाले ने अनुरोध स्वीकार किया', 'pickup kab aayega', 'gadi kab aayegi', 'collector kab aayega', 'pickup ka status', 'request status'],
      mr: ['माझा पिकअप कुठे आहे', 'माझ्या विनंतीची स्थिती', 'कलेक्टरने विनंती स्वीकारली का', 'pickup kadhi yenar', 'collector kadhi yenar', 'pickup status', 'request sthiti'],
      or: ['ମୋ ପିକଅପ୍ କେଉଁଠି ଅଛି', 'ମୋ ଅନୁରୋଧର ସ୍ଥିତି', 'କଲେକ୍ଟର ଅନୁରୋଧ ଗ୍ରହଣ କଲେ କି', 'pickup ketebele aasiba', 'collector ketebele aasiba', 'mo pickup status', 'request sthiti'],
    },
    keywords: {
      en: ['pickup status', 'citizen requests', 'collector accepted', 'tracking', 'when pickup', 'request status'],
      hi: ['पिकअप स्टेटस', 'अनुरोध', 'स्वीकार', 'कहाँ', 'कब आएगा', 'pickup', 'request', 'status'],
      mr: ['पिकअप स्थिती', 'विनंती', 'स्वीकार', 'कधी येणार', 'pickup', 'request', 'status'],
      or: ['ପିକଅପ୍ ସ୍ଥିତି', 'ଅନୁରୋଧ', 'ସ୍ୱୀକାର', 'କେତେବେଳେ', 'pickup', 'request', 'status'],
    },
    responseI18nKey: 'saathi.intents.citizen_requests_status.answer',
    suggestedAction: {
      actionType: 'NAVIGATE',
      targetRoute: 'CitizenRequests',
      actionLabelI18nKey: 'saathi.actions.view_requests',
    },
    requiresDynamicData: true,
    dynamicDataResolverKey: 'RESOLVE_CITIZEN_REQUESTS',
    quickReplies: ['INTENT_CITIZEN_GIVE_EWASTE', 'INTENT_GREEN_CERTIFICATE'],
    safetySensitivity: 'STANDARD',
  },
  {
    id: 'INTENT_MARKETPLACE_BROWSE',
    category: 'MARKETPLACE',
    applicableRoles: ['RECYCLER', 'ALL'],
    triggerPatterns: {
      en: ['how to buy ewaste', 'browse marketplace lots', 'search available scrap', 'where can recycler buy lots', 'explore marketplace', 'buy scrap', 'view market lots'],
      hi: ['ई-कचरा कैसे खरीदें', 'मार्केटप्लेस कैसे देखें', 'उपलब्ध लॉट खोजें', 'scrap kaise khareede', 'marketplace me lot dekho', 'kharidna hai'],
      mr: ['ई-कचरा कसा खरेदी करावा', 'मार्केटप्लेस कसे पहावे', 'उपलब्ध लॉट्स शोधा', 'scrap kasa kharedi karava', 'marketplace paha'],
      or: ['ଇ-ବର୍ଜ୍ୟ କିପରି କିଣିବେ', 'ମାର୍କେଟପ୍ଲେସ୍ କିପରି ଦେଖିବେ', 'ଉପଲବ୍ଧ ଲଟ୍ ଖୋଜନ୍ତୁ', 'scrap kemiti kinibi', 'marketplace dekhantu'],
    },
    keywords: {
      en: ['marketplace', 'buy', 'browse', 'purchase', 'sourcing', 'scrap lots'],
      hi: ['मार्केटप्लेस', 'खरीदें', 'खोजें', 'लॉट', 'buy', 'marketplace', 'purchase'],
      mr: ['मार्केटप्लेस', 'खरेदी', 'शोधा', 'लॉट्स', 'buy', 'marketplace', 'purchase'],
      or: ['ମାର୍କେଟପ୍ଲେସ୍', 'କିଣନ୍ତୁ', 'ଖୋଜନ୍ତୁ', 'ଲଟ୍', 'buy', 'marketplace', 'purchase'],
    },
    responseI18nKey: 'saathi.intents.marketplace_browse.answer',
    suggestedAction: {
      actionType: 'NAVIGATE',
      targetRoute: 'RecyclerMarket',
      actionLabelI18nKey: 'saathi.actions.open_marketplace',
    },
    requiresDynamicData: false,
    quickReplies: ['INTENT_VIEW_OFFERS', 'INTENT_PRICE_BOARD'],
    safetySensitivity: 'STANDARD',
  },

  // ==========================================
  // 6. DEALS & NEGOTIATION INTENTS
  // ==========================================
  {
    id: 'INTENT_VIEW_OFFERS',
    category: 'DEALS',
    applicableRoles: ['INFORMAL_COLLECTOR', 'RECYCLER'],
    triggerPatterns: {
      en: ['show my offers', 'where to see bids', 'did recycler give quote', 'view deals and negotiations', 'buyer offers', 'active bids', 'show quotes', 'recycler bid', 'who offered on my lot'],
      hi: ['ऑफर कहाँ देखें', 'बोली कहाँ देखें', 'क्या रीसायकलर ने कोट दिया', 'सौदा और बातचीत', 'offer aayi kya', 'buyer ne kitna offer diya', 'kisi ne bid kiya kya', 'offers dikhao', 'recycler ne kya offer diya', 'mere offers'],
      mr: ['ऑफर्स कुठे पाहू', 'बोली कुठे पहावी', 'सौदा आणि वाटाघाटी', 'offer aali ka', 'koni bid kele ka', 'recycler chi offer', 'offers dakhva', 'majhya offers'],
      or: ['ଅଫର କେଉଁଠି ଦେଖିବି', 'ବିଡ୍ କେଉଁଠି ଦେଖିବି', 'ଡିଲ୍ ଏବଂ କଥାବାର୍ତ୍ତା', 'offer aasila ki', 'kie bid kala ki', 'recycler offer', 'offers dekha', 'mo offers'],
    },
    keywords: {
      en: ['offers', 'bids', 'deals', 'quotes', 'negotiations', 'buyer offer', 'bid amount'],
      hi: ['ऑफर', 'बोली', 'सौदा', 'डील', 'बातचीत', 'offer', 'bids', 'deals', 'quotes', 'boli'],
      mr: ['ऑफर्स', 'बोली', 'सौदा', 'डील', 'वाटाघाटी', 'offer', 'bids', 'deals', 'quotes', 'boli'],
      or: ['ଅଫର', 'ବିଡ୍', 'ଡିଲ୍', 'ମୂଲଚାଲ', 'କଥାବାର୍ତ୍ତା', 'offer', 'bids', 'deals', 'quotes'],
    },
    responseI18nKey: 'saathi.intents.view_offers.answer',
    suggestedAction: {
      actionType: 'NAVIGATE',
      targetRoute: 'CollectorDeals',
      actionLabelI18nKey: 'saathi.actions.open_deals',
    },
    requiresDynamicData: true,
    dynamicDataResolverKey: 'RESOLVE_USER_DEALS',
    quickReplies: ['INTENT_NEGOTIATE_OFFER', 'INTENT_HANDOVER_PROTOCOL'],
    safetySensitivity: 'STANDARD',
  },
  {
    id: 'INTENT_NEGOTIATE_OFFER',
    category: 'DEALS',
    applicableRoles: ['INFORMAL_COLLECTOR', 'RECYCLER'],
    triggerPatterns: {
      en: ['how to counter offer', 'how to negotiate price', 'can i reject a low offer', 'how to accept quote', 'bargaining on offers', 'accept or reject deal'],
      hi: ['काउंटर ऑफर कैसे दें', 'दाम पर मोलभाव कैसे करें', 'क्या कम ऑफर को खारिज कर सकते हैं', 'ऑफर स्वीकार कैसे करें', 'counter offer kaise kare', 'deal accept kaise kare', 'offer reject kaise kare'],
      mr: ['काउंटर ऑफर कशी द्यावी', 'भावावर वाटाघाटी कशी करावी', 'कमी ऑफर नाकारू शकतो का', 'counter offer kashi dyavi', 'deal accept kashi karavi'],
      or: ['କାଉଣ୍ଟର ଅଫର କିପରି ଦେବେ', 'ଦରରେ ମୂଲଚାଲ କିପରି କରିବେ', 'ଅଫର ପ୍ରତ୍ୟାଖ୍ୟାନ କରିପାରିବି କି', 'counter offer kemiti debi', 'deal accept kemiti karibi'],
    },
    keywords: {
      en: ['counter', 'negotiate', 'accept', 'reject', 'deal', 'bargain', 'revision'],
      hi: ['काउंटर', 'मोलभाव', 'स्वीकार', 'खारिज', 'डील', 'counter', 'negotiate', 'accept', 'reject'],
      mr: ['काउंटर', 'वाटाघाटी', 'स्वीकार', 'नाकारणे', 'डील', 'counter', 'negotiate', 'accept', 'reject'],
      or: ['କାଉଣ୍ଟର', 'ମୂଲଚାଲ', 'ଗ୍ରହଣ', 'ପ୍ରତ୍ୟାଖ୍ୟାନ', 'ଡିଲ୍', 'counter', 'negotiate', 'accept', 'reject'],
    },
    responseI18nKey: 'saathi.intents.negotiate_offer.answer',
    suggestedAction: {
      actionType: 'NAVIGATE',
      targetRoute: 'CollectorDeals',
      actionLabelI18nKey: 'saathi.actions.open_deals',
    },
    requiresDynamicData: false,
    quickReplies: ['INTENT_VIEW_OFFERS', 'INTENT_PRICE_DETERMINATION'],
    safetySensitivity: 'STANDARD',
  },

  // ==========================================
  // 7. HANDOVER PROTOCOL INTENTS
  // ==========================================
  {
    id: 'INTENT_HANDOVER_PROTOCOL',
    category: 'HANDOVER',
    applicableRoles: ['INFORMAL_COLLECTOR', 'RECYCLER'],
    triggerPatterns: {
      en: ['how does handover work', 'handover process', 'delivering scrap to recycler', 'confirm handover with gps', 'physical handover steps', 'handover rules'],
      hi: ['हैंडओवर कैसे होता है', 'सामान देने की प्रक्रिया', 'रीसायकलर को डिलीवरी', 'जीपीएस से पुष्टि', 'handover kaise hota hai', 'delivery process', 'recycler ko saman kaise de'],
      mr: ['हँडओव्हर कसा होतो', 'माल देण्याची प्रक्रिया', 'डिलिव्हरी कशी करावी', 'handover kasa hoto', 'recycler la delivery kashi dyavi'],
      or: ['ହ୍ୟାଣ୍ଡଓଭର କିପରି ହୁଏ', 'ମାଲ ହସ୍ତାନ୍ତର ପ୍ରକ୍ରିୟା', 'ଡେଲିଭରୀ କିପରି କରିବେ', 'handover kemiti hue', 'recycler ku delivery kemiti debi'],
    },
    keywords: {
      en: ['handover', 'delivery', 'transfer', 'confirm', 'gps', 'protocol', 'process'],
      hi: ['हैंडओवर', 'डिलीवरी', 'पुष्टि', 'जीपीएस', 'हस्तांतरण', 'handover', 'delivery', 'transfer'],
      mr: ['हँडओव्हर', 'डिलिव्हरी', 'पुष्टी', 'जीपीएस', 'handover', 'delivery', 'transfer'],
      or: ['ହ୍ୟାଣ୍ଡଓଭର', 'ଡେଲିଭରୀ', 'ନିଶ୍ଚିତ', 'ଜିପିଏସ', 'handover', 'delivery', 'transfer'],
    },
    responseI18nKey: 'saathi.intents.handover_protocol.answer',
    requiresDynamicData: false,
    quickReplies: ['INTENT_HANDOVER_QR_CODE', 'INTENT_PAYMENT_METHODS'],
    safetySensitivity: 'HIGH',
  },
  {
    id: 'INTENT_HANDOVER_QR_CODE',
    category: 'HANDOVER',
    applicableRoles: ['INFORMAL_COLLECTOR', 'RECYCLER'],
    triggerPatterns: {
      en: ['how to use handover code', 'where is handover code', 'handover reference id', 'digital confirmation code', '6 digit handover code', 'otp for handover'],
      hi: ['हैंडओवर कोड का उपयोग कैसे करें', 'हैंडओवर कोड कहाँ है', 'रेफरेंस नंबर कैसे डालें', 'handover code kaise use kare', '6 digit code kahan hai', 'handover otp'],
      mr: ['हँडओव्हर कोड कसा वापरावा', 'हँडओव्हर कोड कुठे आहे', 'संदर्भ क्रमांक', 'handover code kasa vaprava', '6 digit code'],
      or: ['ହ୍ୟାଣ୍ଡଓଭର କୋଡ କିପରି ବ୍ୟବହାର କରିବେ', 'ହ୍ୟାଣ୍ଡଓଭର କୋଡ କେଉଁଠି', 'ରେଫରେନ୍ସ କୋଡ', 'handover code kemiti use karibi', '6 digit code'],
    },
    keywords: {
      en: ['code', 'reference', 'handover code', 'digital code', 'otp', '6 digit'],
      hi: ['कोड', 'रेफरेंस', 'हैंडओवर कोड', 'ओटीपी', 'code', 'handover code', 'otp'],
      mr: ['कोड', 'संदर्भ', 'हँडओव्हर कोड', 'ओटीपी', 'code', 'handover code', 'otp'],
      or: ['କୋଡ', 'ରେଫରେନ୍ସ', 'ହ୍ୟାଣ୍ଡଓଭର କୋଡ', 'ଓଟିପି', 'code', 'handover code', 'otp'],
    },
    responseI18nKey: 'saathi.intents.handover_qr_code.answer',
    requiresDynamicData: false,
    quickReplies: ['INTENT_HANDOVER_PROTOCOL', 'INTENT_PAYMENT_METHODS'],
    safetySensitivity: 'STANDARD',
  },

  // ==========================================
  // 8. PAYMENT & EARNINGS INTENTS
  // ==========================================
  {
    id: 'INTENT_PAYMENT_METHODS',
    category: 'PAYMENT',
    applicableRoles: ['ALL'],
    triggerPatterns: {
      en: ['how do i get paid', 'payment modes', 'can recycler pay in cash', 'is upi supported', 'bank transfer payment', 'payment options', 'how payment happens'],
      hi: ['पैसे कैसे मिलेंगे', 'पेमेंट के तरीके', 'क्या नकद भुगतान हो सकता है', 'क्या यूपीआई चलेगा', 'paise kaise milenge', 'payment modes kya hai', 'cash milega ya upi', 'bank transfer hota hai kya'],
      mr: ['पैसे कसे मिळतील', 'पेमेंटच्या पद्धती', 'कॅश पेमेंट करता येते का', 'यूपीआय चालते का', 'paise kase miltil', 'cash milel ka upi', 'payment methods'],
      or: ['ଟଙ୍କା କିପରି ପାଇବି', 'ପେମେଣ୍ଟ ପଦ୍ଧତି', 'କ୍ୟାଶ୍ ପେମେଣ୍ଟ ହେବ କି', 'ୟୁପିଆଇ ଚାଲିବ କି', 'tanka kemiti miliba', 'cash miliba ki upi', 'payment modes'],
    },
    keywords: {
      en: ['payment', 'cash', 'upi', 'bank', 'transfer', 'paid', 'modes', 'method'],
      hi: ['पेमेंट', 'पैसे', 'नकद', 'यूपीआई', 'बैंक', 'payment', 'cash', 'upi', 'paise', 'bank'],
      mr: ['पेमेंट', 'पैसे', 'कॅश', 'यूपीआय', 'बँक', 'payment', 'cash', 'upi', 'paise', 'bank'],
      or: ['ପେମେଣ୍ଟ', 'ଟଙ୍କା', 'କ୍ୟାଶ୍', 'ୟୁପିଆଇ', 'ବ୍ୟାଙ୍କ', 'payment', 'cash', 'upi', 'tanka', 'bank'],
    },
    responseI18nKey: 'saathi.intents.payment_methods.answer',
    requiresDynamicData: false,
    quickReplies: ['INTENT_PAYMENT_NON_CUSTODIAL', 'INTENT_PAYMENT_STATUS'],
    safetySensitivity: 'HIGH',
  },
  {
    id: 'INTENT_PAYMENT_STATUS',
    category: 'PAYMENT',
    applicableRoles: ['INFORMAL_COLLECTOR', 'RECYCLER'],
    triggerPatterns: {
      en: ['is my payment completed', 'pending payment status', 'where is my money', 'check payment status', 'payment status', 'did buyer pay', 'settlement status', 'money received or not', 'pending settlement'],
      hi: ['क्या मेरा पेमेंट हो गया', 'पेंडिंग पेमेंट का स्टेटस', 'मेरे पैसे कहाँ हैं', 'भुगतान की स्थिति', 'mera paisa kab milega', 'payment kab aayega', 'paisa mila kya', 'payment hua ya nahi', 'pending paisa', 'check payment'],
      mr: ['माझे पेमेंट झाले का', 'प्रलंबित पेमेंट स्थिती', 'माझे पैसे कुठे आहेत', 'paise kadhi milnar', 'payment jhale ka', 'paise aale ka', 'pending payment', 'payment sthiti'],
      or: ['ମୋ ପେମେଣ୍ଟ ହେଲା କି', 'ପେଣ୍ଡିଂ ପେମେଣ୍ଟ ସ୍ଥିତି', 'ମୋ ଟଙ୍କା କେଉଁଠି', 'mo tanka kouthi', 'payment hela ki', 'tanka milila ki', 'pending tanka', 'payment sthiti'],
    },
    keywords: {
      en: ['payment status', 'pending payment', 'money received', 'transaction status', 'settlement', 'paid or not'],
      hi: ['पेमेंट स्टेटस', 'पेंडिंग', 'पैसे मिले', 'ट्रांजैक्शन', 'भुगतान', 'payment', 'status', 'pending', 'paisa'],
      mr: ['पेमेंट स्थिती', 'प्रलंबित', 'पैसे मिळाले', 'व्यवहार', 'payment', 'status', 'pending', 'paise'],
      or: ['ପେମେଣ୍ଟ ସ୍ଥିତି', 'ପେଣ୍ଡିଂ', 'ଟଙ୍କା ମିଳିଲା', 'କାରବାର', 'payment', 'status', 'pending', 'tanka'],
    },
    responseI18nKey: 'saathi.intents.payment_status.answer',
    suggestedAction: {
      actionType: 'NAVIGATE',
      targetRoute: 'CollectorTransactions',
      actionLabelI18nKey: 'saathi.actions.view_transactions',
    },
    requiresDynamicData: true,
    dynamicDataResolverKey: 'RESOLVE_PAYMENT_STATUS',
    quickReplies: ['INTENT_VIEW_EARNINGS', 'INTENT_REPORT_DISPUTE'],
    safetySensitivity: 'HIGH',
  },
  {
    id: 'INTENT_PAYMENT_NON_CUSTODIAL',
    category: 'PAYMENT',
    applicableRoles: ['ALL'],
    triggerPatterns: {
      en: ['does ecosetu take commission', 'does ecosetu hold my money', 'is ecosetu an escrow', 'platform fee', 'how much commission', 'does ecosetu keep cut'],
      hi: ['क्या इकोसेतु कमीशन लेता है', 'क्या इकोसेतु पैसे रोकता है', 'क्या इकोसेतु एस्क्रो है', 'ecosetu kitna commission leta hai', 'kya ecosetu paise kaat ta hai'],
      mr: ['इकोसेतू कमिशन घेतो का', 'इकोसेतू पैसे अडवून ठेवतो का', 'ecosetu commission gheto ka', 'platform fee kiti'],
      or: ['ଇକୋସେତୁ କମିଶନ ନିଏ କି', 'ଇକୋସେତୁ ଟଙ୍କା ରଖେ କି', 'ecosetu commission nie ki', 'platform fee kete'],
    },
    keywords: {
      en: ['commission', 'escrow', 'hold', 'custodial', 'fee', 'cut', 'charge'],
      hi: ['कमीशन', 'एस्क्रो', 'फीस', 'रोकता', 'कटौती', 'commission', 'fee', 'escrow'],
      mr: ['कमिशन', 'फी', 'अडवणे', 'कटौती', 'commission', 'fee', 'escrow'],
      or: ['କମିଶନ', 'ଫିସ୍', 'ରଖିବା', 'କାଟିବା', 'commission', 'fee', 'escrow'],
    },
    responseI18nKey: 'saathi.intents.payment_non_custodial.answer',
    requiresDynamicData: false,
    quickReplies: ['INTENT_PAYMENT_METHODS', 'INTENT_VIEW_EARNINGS'],
    safetySensitivity: 'STANDARD',
  },
  {
    id: 'INTENT_VIEW_EARNINGS',
    category: 'EARNINGS',
    applicableRoles: ['INFORMAL_COLLECTOR'],
    triggerPatterns: {
      en: ['where to see total earnings', 'open my earnings', 'how much have i earned', 'my income on ecosetu', 'show earnings summary', 'how much money i made', 'total earnings', 'my revenue', 'check earnings'],
      hi: ['कुल कमाई कहाँ देखें', 'मेरी कमाई खोलो', 'मैंने कितना कमाया', 'कमाई का विवरण', 'kitna kamaya', 'total kamai', 'meri kamai', 'aamdani kitni hui', 'kamai dikhao', 'total paisa kamaya', 'open earnings'],
      mr: ['एकूण कमाई कुठे पहावी', 'माझी कमाई उघडा', 'मी किती कमावले', 'majhi kamai', 'kiti kamavle', 'total kamai', 'utpanna kiti jhale', 'earnings dakhva'],
      or: ['ମୋଟ ରୋଜଗାର କେଉଁଠି ଦେଖିବି', 'ମୋ ରୋଜଗାର ଖୋଲନ୍ତୁ', 'ମୁଁ କେତେ ରୋଜଗାର କଲି', 'kete rojgar heli', 'mo kamai', 'total rojgar', 'kete tanka aay hela', 'earnings dekhantu'],
    },
    keywords: {
      en: ['earnings', 'income', 'total earned', 'revenue', 'summary', 'money made', 'total sales'],
      hi: ['कमाई', 'आमदनी', 'कुल कमाई', 'विवरण', 'बिक्री', 'earnings', 'kamai', 'aamdani', 'income'],
      mr: ['कमाई', 'उत्पन्न', 'एकूण कमाई', 'विक्री', 'earnings', 'kamai', 'utpanna', 'income'],
      or: ['ରୋଜଗାର', 'ଆୟ', 'ମୋଟ ରୋଜଗାର', 'ବିକ୍ରି', 'earnings', 'rojgar', 'aay', 'income'],
    },
    responseI18nKey: 'saathi.intents.view_earnings.answer',
    suggestedAction: {
      actionType: 'NAVIGATE',
      targetRoute: 'CollectorEarnings',
      actionLabelI18nKey: 'saathi.actions.open_earnings',
    },
    requiresDynamicData: true,
    dynamicDataResolverKey: 'RESOLVE_USER_EARNINGS',
    quickReplies: ['INTENT_PAYMENT_STATUS', 'INTENT_HOW_TO_CREATE_LOT'],
    safetySensitivity: 'STANDARD',
  },

  // ==========================================
  // 9. SAFETY & HAZARD INTENTS
  // ==========================================
  {
    id: 'INTENT_SAFETY_BATTERY',
    category: 'SAFETY',
    applicableRoles: ['ALL'],
    triggerPatterns: {
      en: ['how to handle swollen battery', 'battery safety', 'can lithium battery catch fire', 'damaged battery handling', 'battery blast hazard', 'puffed battery', 'battery explosion danger'],
      hi: ['फूली हुई बैटरी कैसे संभालें', 'बैटरी सुरक्षा', 'क्या लिथियम बैटरी में आग लग सकती है', 'battery fula hua hai', 'battery fat sakti hai kya', 'battery safety', 'battery aag pakad sakti hai kya'],
      mr: ['फुगलेली बॅटरी कशी हाताळावी', 'बॅटरी सुरक्षा', 'बॅटरीला आग लागू शकते का', 'battery fugli aahe', 'battery safety', 'battery spot'],
      or: ['ଫୁଲିଯାଇଥିବା ବ୍ୟାଟେରୀ କିପରି ସମ୍ଭାଳିବେ', 'ବ୍ୟାଟେରୀ ସୁରକ୍ଷା', 'ଲିଥିୟମ ବ୍ୟାଟେରୀରେ ନିଆଁ ଲାଗିପାରେ କି', 'battery phulijai chi', 'battery safety', 'battery nia'],
    },
    keywords: {
      en: ['battery', 'swollen', 'fire', 'lithium', 'explosion', 'hazard', 'puffed', 'blast'],
      hi: ['बैटरी', 'फूली', 'आग', 'लिथियम', 'खतरा', 'धमाका', 'battery', 'fire', 'swollen', 'hazard'],
      mr: ['बॅटरी', 'फुगलेली', 'आग', 'धोका', 'स्फोट', 'battery', 'fire', 'swollen', 'hazard'],
      or: ['ବ୍ୟାଟେରୀ', 'ଫୁଲିବା', 'ନିଆଁ', 'ବିପଦ', 'ବିସ୍ଫୋରଣ', 'battery', 'fire', 'swollen', 'hazard'],
    },
    responseI18nKey: 'saathi.intents.safety_battery.answer',
    suggestedAction: {
      actionType: 'NAVIGATE',
      targetRoute: 'CollectorSafetyCenter',
      actionLabelI18nKey: 'saathi.actions.open_safety_center',
    },
    requiresDynamicData: false,
    quickReplies: ['INTENT_SAFETY_BURNING', 'INTENT_SAFETY_PPE'],
    safetySensitivity: 'HAZARD_CRITICAL',
  },
  {
    id: 'INTENT_SAFETY_BURNING',
    category: 'SAFETY',
    applicableRoles: ['ALL'],
    triggerPatterns: {
      en: ['can i burn cables for copper', 'wire burning safety', 'why burning wires is prohibited', 'open wire burning', 'burning copper wire', 'tar jalana', 'is wire burning allowed'],
      hi: ['क्या तांबे के लिए तार जला सकते हैं', 'तार जलाना क्यों मना है', 'केबल जलाने के खतरे', 'taar jala sakte hai kya', 'wire burning', 'copper nikalne ke liye jalana', 'wire jalana mana hai kya'],
      mr: ['तांब्यासाठी वायर जाळू शकतो का', 'वायर जाळणे का मनाई आहे', 'केबल जाळण्याचे धोके', 'wire jalavu ka', 'copper sathi jalavne', 'wire jalavne mana aahe ka'],
      or: ['ତମ୍ବା ପାଇଁ ତାର ପୋଡ଼ିପାରିବି କି', 'ତାର ପୋଡ଼ିବା କାହିଁକି ନିଷିଦ୍ଧ', 'କେବୁଲ ପୋଡ଼ିବା ବିପଦ', 'tara podi paribi ki', 'cable podiba', 'tara podiba mana ki'],
    },
    keywords: {
      en: ['burn', 'burning', 'wire', 'cable', 'copper', 'fumes', 'toxic', 'prohibited', 'pollution'],
      hi: ['जलाना', 'तार', 'केबल', 'तांबा', 'धुआं', 'जहरीला', 'मना', 'burn', 'wire', 'cable', 'copper'],
      mr: ['जाळणे', 'वायर', 'केबल', 'तांबे', 'धूर', 'विषारी', 'मनाई', 'burn', 'wire', 'cable', 'copper'],
      or: ['ପୋଡ଼ିବା', 'ତାର', 'କେବୁଲ', 'ତମ୍ବା', 'ଧୂଆଁ', 'ବିଷାକ୍ତ', 'ନିଷିଦ୍ଧ', 'burn', 'wire', 'cable', 'copper'],
    },
    responseI18nKey: 'saathi.intents.safety_burning.answer',
    suggestedAction: {
      actionType: 'NAVIGATE',
      targetRoute: 'CollectorSafetyCenter',
      actionLabelI18nKey: 'saathi.actions.open_safety_center',
    },
    requiresDynamicData: false,
    quickReplies: ['INTENT_SAFETY_ACID', 'INTENT_SAFETY_PPE'],
    safetySensitivity: 'HAZARD_CRITICAL',
  },
  {
    id: 'INTENT_SAFETY_ACID',
    category: 'SAFETY',
    applicableRoles: ['ALL'],
    triggerPatterns: {
      en: ['can i use acid for gold on pcb', 'acid leaching safety', 'informal circuit board chemical refining', 'acid for gold recovery', 'tezaab on pcb', 'chemical leaching hazard'],
      hi: ['क्या पीसीबी से सोना निकालने के लिए तेजाब का इस्तेमाल कर सकते हैं', 'तेजाब के खतरे', 'केमिकल रिफाइनिंग', 'tezab se sona nikalna', 'acid use kar sakte hai kya', 'pcb par acid dalna'],
      mr: ['पीसीबीतून सोने काढण्यासाठी ॲसिड वापरू शकतो का', 'ॲसिडचे धोके', 'रासायनिक प्रक्रिया', 'acid vapru shakto ka', 'sona kadhnyasathi acid', 'pcb var acid'],
      or: ['ପିସିବିରୁ ସୁନା ବାହାର କରିବା ପାଇଁ ଏସିଡ୍ ବ୍ୟବହାର କରିପାରିବି କି', 'ଏସିଡ୍ ବିପଦ', 'acid re suna kadhiba', 'acid use kari paribi ki', 'pcb re acid'],
    },
    keywords: {
      en: ['acid', 'leaching', 'chemical', 'pcb', 'gold', 'refining', 'poison', 'toxic', 'cyanide'],
      hi: ['तेजाब', 'एसिड', 'केमिकल', 'सोना', 'पीसीबी', 'जहर', 'acid', 'gold', 'chemical', 'pcb'],
      mr: ['ॲसिड', 'केमिकल', 'सोने', 'पीसीबी', 'विषारी', 'acid', 'gold', 'chemical', 'pcb'],
      or: ['ଏସିଡ୍', 'କେମିକାଲ୍', 'ସୁନା', 'ପିସିବି', 'ବିଷାକ୍ତ', 'acid', 'gold', 'chemical', 'pcb'],
    },
    responseI18nKey: 'saathi.intents.safety_acid.answer',
    suggestedAction: {
      actionType: 'NAVIGATE',
      targetRoute: 'CollectorSafetyCenter',
      actionLabelI18nKey: 'saathi.actions.open_safety_center',
    },
    requiresDynamicData: false,
    quickReplies: ['INTENT_SAFETY_BURNING', 'INTENT_SAFETY_PPE'],
    safetySensitivity: 'HAZARD_CRITICAL',
  },
  {
    id: 'INTENT_SAFETY_PPE',
    category: 'SAFETY',
    applicableRoles: ['ALL'],
    triggerPatterns: {
      en: ['what ppe should i wear', 'safety gloves and mask', 'protective gear for handling ewaste', 'gloves and mask', 'safety kit', 'safety equipment for collectors'],
      hi: ['कौन से सुरक्षा उपकरण पहनने चाहिए', 'दस्ताने और मास्क', 'ई-कचरा संभालते समय सुरक्षा', 'gloves aur mask', 'suraksha gear', 'ppe kit', 'suraksha upkaran'],
      mr: ['कोणती सुरक्षा साधने वापरावीत', 'हातमोजे आणि मास्क', 'सुरक्षात्मक साधने', 'gloves ani mask', 'suraksha sadhane', 'ppe kit'],
      or: ['କେଉଁ ସୁରକ୍ଷା ଉପକରଣ ପିନ୍ଧିବା ଉଚିତ୍', 'ଗ୍ଲୋଭ୍ସ ଏବଂ ମାସ୍କ', 'ସୁରକ୍ଷା ଉପକରଣ', 'gloves aau mask', 'suraksha upakarana', 'ppe kit'],
    },
    keywords: {
      en: ['ppe', 'gloves', 'mask', 'protection', 'gear', 'safety', 'goggles', 'boots'],
      hi: ['दस्ताने', 'मास्क', 'सुरक्षा', 'उपकरण', 'ppe', 'gloves', 'mask', 'gear'],
      mr: ['हातमोजे', 'मास्क', 'सुरक्षा', 'साधने', 'ppe', 'gloves', 'mask', 'gear'],
      or: ['ଗ୍ଲୋଭ୍ସ', 'ମାସ୍କ', 'ସୁରକ୍ଷା', 'ଉପକରଣ', 'ppe', 'gloves', 'mask', 'gear'],
    },
    responseI18nKey: 'saathi.intents.safety_ppe.answer',
    suggestedAction: {
      actionType: 'NAVIGATE',
      targetRoute: 'CollectorSafetyCenter',
      actionLabelI18nKey: 'saathi.actions.open_safety_center',
    },
    requiresDynamicData: false,
    quickReplies: ['INTENT_SAFETY_BATTERY', 'INTENT_SAFETY_CRT'],
    safetySensitivity: 'HIGH',
  },
  {
    id: 'INTENT_SAFETY_CRT',
    category: 'SAFETY',
    applicableRoles: ['ALL'],
    triggerPatterns: {
      en: ['how to handle old tv crt monitor', 'crt screen breakage danger', 'heavy tube monitors hazard', 'old tv glass monitor', 'crt breakage', 'lead glass tv danger'],
      hi: ['पुराना टीवी और सीआरटी मॉनिटर कैसे संभालें', 'सीआरटी टूटने के खतरे', 'भारी टीवी स्क्रीन', 'purana tv monitor', 'crt tube foot gaya', 'crt glass safety'],
      mr: ['जुना टीव्ही सीआरटी मॉनिटर कसा हाताळावा', 'सीआरटी फुटण्याचे धोके', 'juna tv screen', 'crt monitor', 'crt kaach'],
      or: ['ପୁରୁଣା ଟିଭି ସିଆରଟି ମନିଟର କିପରି ସମ୍ଭାଳିବେ', 'ସିଆରଟି ଭାଙ୍ଗିବାର ବିପଦ', 'puruna tv monitor', 'crt phati gale kan heba', 'crt kacha'],
    },
    keywords: {
      en: ['crt', 'tv', 'monitor', 'vacuum', 'phosphor', 'glass', 'lead', 'breakage'],
      hi: ['सीआरटी', 'टीवी', 'मॉनिटर', 'कांच', 'टूटना', 'लेड', 'crt', 'tv', 'monitor'],
      mr: ['सीआरटी', 'टीव्ही', 'मॉनिटर', 'काच', 'फुटणे', 'crt', 'tv', 'monitor'],
      or: ['ସିଆରଟି', 'ଟିଭି', 'ମନିଟର', 'କାଚ', 'ଭାଙ୍ଗିବା', 'crt', 'tv', 'monitor'],
    },
    responseI18nKey: 'saathi.intents.safety_crt.answer',
    suggestedAction: {
      actionType: 'NAVIGATE',
      targetRoute: 'CollectorSafetyCenter',
      actionLabelI18nKey: 'saathi.actions.open_safety_center',
    },
    requiresDynamicData: false,
    quickReplies: ['INTENT_SAFETY_BATTERY', 'INTENT_SAFETY_PPE'],
    safetySensitivity: 'HIGH',
  },

  // ==========================================
  // 10. DISPUTES & ISSUES INTENTS
  // ==========================================
  {
    id: 'INTENT_REPORT_DISPUTE',
    category: 'DISPUTES',
    applicableRoles: ['INFORMAL_COLLECTOR', 'RECYCLER'],
    triggerPatterns: {
      en: ['how to report a dispute', 'buyer paid less money', 'weight mismatch issue', 'open a complaint ticket', 'file complaint', 'complain about recycler', 'wrong weight entered', 'short payment issue'],
      hi: ['विवाद की शिकायत कैसे करें', 'खरीदार ने कम पैसे दिए', 'वजन में गड़बड़ी की शिकायत', 'शिकायत दर्ज करें', 'shikayat kaise kare', 'kam paise diye', 'vajan me gadbad', 'dispute open karna hai'],
      mr: ['तक्रार कशी नोंदवावी', 'खरेदीदाराने कमी पैसे दिले', 'वजनात तफावत', 'तक्रार दाखल करा', 'takrar kashi karavi', 'kami paise dile', 'vajanat chuk', 'dispute open kara'],
      or: ['ଅଭିଯୋଗ କିପରି କରିବେ', 'କ୍ରେତା କମ ଟଙ୍କା ଦେଲେ', 'ଓଜନରେ ତାରତମ୍ୟ', 'ଅଭିଯୋଗ ଟିକେଟ୍', 'abhiyoga kemiti karibi', 'kam tanka dele', 'ojana re bhul', 'dispute open karibi'],
    },
    keywords: {
      en: ['dispute', 'complaint', 'mismatch', 'cheating', 'less money', 'shortage', 'wrong weight'],
      hi: ['विवाद', 'शिकायत', 'गड़बड़ी', 'कम पैसे', 'धोखा', 'dispute', 'complaint', 'shikayat', 'gadbad'],
      mr: ['तक्रार', 'विवाद', 'तफावत', 'कमी पैसे', 'dispute', 'complaint', 'takrar'],
      or: ['ଅଭିଯୋଗ', 'ବିବାଦ', 'ତାରତମ୍ୟ', 'କମ ଟଙ୍କା', 'dispute', 'complaint', 'abhiyoga'],
    },
    responseI18nKey: 'saathi.intents.report_dispute.answer',
    suggestedAction: {
      actionType: 'NAVIGATE',
      targetRoute: 'CollectorDisputes',
      actionLabelI18nKey: 'saathi.actions.open_disputes',
    },
    requiresDynamicData: false,
    quickReplies: ['INTENT_DISPUTE_POLICY', 'INTENT_SUPPORT_HELP'],
    safetySensitivity: 'HIGH',
  },
  {
    id: 'INTENT_DISPUTE_POLICY',
    category: 'DISPUTES',
    applicableRoles: ['ALL'],
    triggerPatterns: {
      en: ['what is dispute policy', 'how are disputes resolved', 'admin dispute investigation', 'weight dispute rules', 'dispute resolution timeline'],
      hi: ['विवाद समाधान नीति क्या है', 'विवाद कैसे सुलझाए जाते हैं', 'एडमिन जांच कैसे करता है', 'dispute policy kya hai', 'vivad kaise solve hota hai'],
      mr: ['विवाद धोरण काय आहे', 'तक्रारींचे निवारण कसे होते', 'ॲडमिन तपास कसा करतो', 'dispute policy kay aahe', 'takrar kashi solve hote'],
      or: ['ବିବାଦ ନୀତି କଣ', 'ଅଭିଯୋଗର ସମାଧାନ କିପରି ହୁଏ', 'ଆଡମିନ୍ ତଦନ୍ତ କିପରି ହୁଏ', 'dispute policy kana', 'bibada kemiti solve hue'],
    },
    keywords: {
      en: ['policy', 'resolution', 'investigation', 'rules', 'admin', 'timeline'],
      hi: ['नीति', 'समाधान', 'जांच', 'नियम', 'एडमिन', 'policy', 'resolution', 'rules'],
      mr: ['धोरण', 'निवारण', 'तपास', 'नियम', 'policy', 'resolution', 'rules'],
      or: ['ନୀତି', 'ସମାଧାନ', 'ତଦନ୍ତ', 'ନିୟମ', 'policy', 'resolution', 'rules'],
    },
    responseI18nKey: 'saathi.intents.dispute_policy.answer',
    requiresDynamicData: false,
    quickReplies: ['INTENT_REPORT_DISPUTE', 'INTENT_SUPPORT_HELP'],
    safetySensitivity: 'STANDARD',
  },

  // ==========================================
  // 11. RECYCLER & CERTIFICATION INTENTS
  // ==========================================
  {
    id: 'INTENT_RECYCLER_VERIFICATION',
    category: 'RECYCLER',
    applicableRoles: ['RECYCLER', 'ALL'],
    triggerPatterns: {
      en: ['how are recyclers verified', 'cpcb spcb license check', 'authorized recycler verification', 'pollution board approval', 'recycler authorization'],
      hi: ['रीसायकलर का सत्यापन कैसे होता है', 'सीपीसीबी एसपीसीबी लाइसेंस जांच', 'अधिकृत रीसायकलर', 'recycler verification kaise hota hai', 'cpcb license check'],
      mr: ['पुनर्चक्रणकर्त्यांची पडताळणी कशी होते', 'सीपीसीबी एसपीसीबी परवाना तपासणी', 'recycler verification kase hote', 'cpcb license'],
      or: ['ରିସାଇକ୍ଲର କିପରି ଯାଞ୍ଚ ହୁଅନ୍ତି', 'ସିପିସିବି ଏସପିସିବି ଲାଇସେନ୍ସ ଯାଞ୍ଚ', 'recycler verification kemiti hue', 'cpcb license'],
    },
    keywords: {
      en: ['cpcb', 'spcb', 'verification', 'authorized', 'pollution board', 'license', 'approval'],
      hi: ['सीपीसीबी', 'एसपीसीबी', 'सत्यापन', 'लाइसेंस', 'प्रदूषण बोर्ड', 'cpcb', 'license', 'verification'],
      mr: ['सीपीसीबी', 'एसपीसीबी', 'पडताळणी', 'परवाना', 'cpcb', 'license', 'verification'],
      or: ['ସିପିସିବି', 'ଏସପିସିବି', 'ଯାଞ୍ଚ', 'ଲାଇସେନ୍ସ', 'cpcb', 'license', 'verification'],
    },
    responseI18nKey: 'saathi.intents.recycler_verification.answer',
    requiresDynamicData: false,
    quickReplies: ['INTENT_GREEN_CERTIFICATE', 'INTENT_MARKETPLACE_BROWSE'],
    safetySensitivity: 'STANDARD',
  },
  {
    id: 'INTENT_GREEN_CERTIFICATE',
    category: 'RECYCLER',
    applicableRoles: ['CITIZEN', 'ALL'],
    triggerPatterns: {
      en: ['what is green certificate', 'how to see co2 saved', 'recycling impact certificate', 'traceability certificate', 'download certificate', 'green points'],
      hi: ['ग्रीन सर्टिफिकेट क्या है', 'बचाया गया सीओ२ कैसे देखें', 'रीसाइक्लिंग प्रमाणपत्र', 'green certificate kya hai', 'co2 saved kaise dekhe'],
      mr: ['ग्रीन सर्टिफिकेट काय आहे', 'सीओ२ बचत कशी पहावी', 'प्रमाणपत्र', 'green certificate kay aahe', 'co2 bachat'],
      or: ['ଗ୍ରୀନ ସାର୍ଟିଫିକେଟ୍ କଣ', 'ସିଓ୨ ବଞ୍ଚତ କିପରି ଦେଖିବି', 'ପ୍ରମାଣପତ୍ର', 'green certificate kana', 'co2 banchata'],
    },
    keywords: {
      en: ['certificate', 'co2', 'green', 'traceability', 'impact', 'saved', 'points'],
      hi: ['सर्टिफिकेट', 'प्रमाणपत्र', 'सीओ२', 'ग्रीन', 'प्रभाव', 'certificate', 'co2', 'green'],
      mr: ['सर्टिफिकेट', 'प्रमाणपत्र', 'सीओ२', 'ग्रीन', 'certificate', 'co2', 'green'],
      or: ['ସାର୍ଟିଫିକେଟ୍', 'ପ୍ରମାଣପତ୍ର', 'ସିଓ୨', 'ଗ୍ରୀନ', 'certificate', 'co2', 'green'],
    },
    responseI18nKey: 'saathi.intents.green_certificate.answer',
    suggestedAction: {
      actionType: 'NAVIGATE',
      targetRoute: 'ItemTraceability',
      actionLabelI18nKey: 'saathi.actions.view_traceability',
    },
    requiresDynamicData: false,
    quickReplies: ['INTENT_CITIZEN_GIVE_EWASTE', 'INTENT_RECYCLER_VERIFICATION'],
    safetySensitivity: 'STANDARD',
  },

  // ==========================================
  // 12. OFFLINE & LANGUAGE INTENTS
  // ==========================================
  {
    id: 'INTENT_OFFLINE_MODE',
    category: 'OFFLINE',
    applicableRoles: ['ALL'],
    triggerPatterns: {
      en: ['does app work offline', 'offline sync', 'can i use without internet', 'what happens when offline', 'no internet connection', 'offline features'],
      hi: ['क्या ऐप बिना इंटरनेट के काम करता है', 'ऑफलाइन मोड', 'इंटरनेट न होने पर क्या होगा', 'offline kaam karta hai kya', 'bina internet ke use hoga kya'],
      mr: ['इंटरनेटशिवाय ॲप चालते का', 'ऑफलाइन मोड', 'ऑफलाइन सिंक', 'offline chalte ka', 'bina internet app'],
      or: ['ଇଣ୍ଟରନେଟ୍ ବିନା ଆପ୍ ଚାଲିବ କି', 'ଅଫଲାଇନ୍ ମୋଡ୍', 'ଅଫଲାଇନ୍ ସିଙ୍କ', 'offline chaliba ki', 'bina internet app'],
    },
    keywords: {
      en: ['offline', 'internet', 'sync', 'queue', 'network', 'without internet'],
      hi: ['ऑफलाइन', 'इंटरनेट', 'सिंक', 'नेटवर्क', 'offline', 'internet', 'sync'],
      mr: ['ऑफलाइन', 'इंटरनेट', 'सिंक', 'नेटवर्क', 'offline', 'internet', 'sync'],
      or: ['ଅଫଲାଇନ୍', 'ଇଣ୍ଟରନେଟ୍', 'ସିଙ୍କ', 'ନେଟୱାର୍କ', 'offline', 'internet', 'sync'],
    },
    responseI18nKey: 'saathi.intents.offline_mode.answer',
    requiresDynamicData: false,
    quickReplies: ['INTENT_WHO_IS_ECO_SAATHI', 'INTENT_CHANGE_LANGUAGE'],
    safetySensitivity: 'STANDARD',
  },
  {
    id: 'INTENT_CHANGE_LANGUAGE',
    category: 'LANGUAGE',
    applicableRoles: ['ALL'],
    triggerPatterns: {
      en: ['how to change language', 'switch language to hindi', 'marathi language', 'odia language', 'change app language', 'language settings', 'switch language', 'set english'],
      hi: ['भाषा कैसे बदलें', 'हिंदी भाषा चुनें', 'मराठी में बदलें', 'उड़िया भाषा', 'bhasha kaise badle', 'hindi me karo', 'language change', 'marathi me karo', 'odia me karo'],
      mr: ['भाषा कशी बदलावी', 'मराठी भाषा निवडा', 'हिंदीमध्ये बदला', 'bhasha kashi badlavi', 'marathi madhe kara', 'language change', 'english kara'],
      or: ['ଭାଷା କିପରି ବଦଳାଇବେ', 'ଓଡ଼ିଆ ଭାଷା ବାଛନ୍ତୁ', 'ହିନ୍ଦୀରେ ବଦଳାନ୍ତୁ', 'bhasa kemiti badalibi', 'odia re karantu', 'language change', 'hindi re karantu'],
    },
    keywords: {
      en: ['language', 'change', 'switch', 'hindi', 'marathi', 'odia', 'english', 'settings'],
      hi: ['भाषा', 'बदलें', 'हिंदी', 'मराठी', 'उड़िया', 'अंग्रेजी', 'language', 'bhasha', 'change', 'hindi', 'marathi', 'odia'],
      mr: ['भाषा', 'बदला', 'मराठी', 'हिंदी', 'इंग्रजी', 'language', 'bhasha', 'change', 'marathi', 'hindi'],
      or: ['ଭାଷା', 'ବଦଳାନ୍ତୁ', 'ଓଡ଼ିଆ', 'ହିନ୍ଦୀ', 'ଇଂରାଜୀ', 'language', 'bhasa', 'change', 'odia', 'hindi'],
    },
    responseI18nKey: 'saathi.intents.change_language.answer',
    suggestedAction: {
      actionType: 'NAVIGATE',
      targetRoute: 'CollectorProfile',
      actionLabelI18nKey: 'saathi.actions.open_language_settings',
    },
    requiresDynamicData: false,
    quickReplies: ['INTENT_WHO_IS_ECO_SAATHI', 'INTENT_WHAT_IS_ECOSETU'],
    safetySensitivity: 'STANDARD',
  },

  // ==========================================
  // 13. ACCOUNT & PROFILE INTENTS
  // ==========================================
  {
    id: 'INTENT_PROFILE_SETTINGS',
    category: 'ACCOUNT',
    applicableRoles: ['ALL'],
    triggerPatterns: {
      en: ['how to edit profile', 'change my phone number', 'update operating area', 'edit profile settings', 'update name', 'profile photo change'],
      hi: ['प्रोफाइल कैसे बदलें', 'फोन नंबर कैसे बदलें', 'कार्य क्षेत्र कैसे अपडेट करें', 'profile kaise edit kare', 'phone number change', 'naam badalna hai'],
      mr: ['प्रोफाइल कशी बदलावी', 'फोन नंबर कसा बदलावा', 'कार्यक्षेत्र अपडेट करा', 'profile kashi edit karavi', 'phone number change'],
      or: ['ପ୍ରୋଫାଇଲ୍ କିପରି ବଦଳାଇବେ', 'ଫୋନ ନମ୍ବର କିପରି ବଦଳାଇବେ', 'କାର୍ଯ୍ୟକ୍ଷେତ୍ର ଅପଡେଟ୍', 'profile kemiti edit karibi', 'phone number change'],
    },
    keywords: {
      en: ['profile', 'edit', 'phone', 'area', 'settings', 'account', 'update'],
      hi: ['प्रोफाइल', 'बदलें', 'फोन', 'क्षेत्र', 'सेटिंग', 'profile', 'settings', 'phone'],
      mr: ['प्रोफाइल', 'बदला', 'फोन', 'क्षेत्र', 'सेटिंग्ज', 'profile', 'settings', 'phone'],
      or: ['ପ୍ରୋଫାଇଲ୍', 'ବଦଳାନ୍ତୁ', 'ଫୋନ', 'କ୍ଷେତ୍ର', 'ସେଟିଂ', 'profile', 'settings', 'phone'],
    },
    responseI18nKey: 'saathi.intents.profile_settings.answer',
    suggestedAction: {
      actionType: 'NAVIGATE',
      targetRoute: 'CollectorProfile',
      actionLabelI18nKey: 'saathi.actions.open_profile',
    },
    requiresDynamicData: false,
    quickReplies: ['INTENT_CHANGE_LANGUAGE', 'INTENT_SUPPORT_HELP'],
    safetySensitivity: 'STANDARD',
  },
  {
    id: 'INTENT_VERIFICATION_STATUS',
    category: 'ACCOUNT',
    applicableRoles: ['INFORMAL_COLLECTOR', 'RECYCLER'],
    triggerPatterns: {
      en: ['is my account verified', 'verification status', 'how long for admin approval', 'why is account pending', 'kyc status', 'admin approval', 'check my verification'],
      hi: ['क्या मेरा खाता सत्यापित है', 'सत्यापन स्थिति', 'एडमिन मंजूरी में कितना समय लगेगा', 'khata verify hua kya', 'account pending kyu hai', 'admin approval status', 'kyc pending'],
      mr: ['माझे खाते पडताळणी झाले आहे का', 'पडताळणी स्थिती', 'ॲडमिन मंजुरी', 'khate verify jhale ka', 'account pending ka aahe', 'kyc status'],
      or: ['ମୋ ଖାତା ଯାଞ୍ଚ ହୋଇଛି କି', 'ଯାଞ୍ଚ ସ୍ଥିତି', 'ଆଡମିନ୍ ମଞ୍ଜୁରୀ', 'khata verify hela ki', 'account pending kauthiki', 'kyc status'],
    },
    keywords: {
      en: ['verified', 'verification', 'pending', 'approval', 'admin', 'kyc'],
      hi: ['सत्यापित', 'सत्यापन', 'पेंडिंग', 'मंजूरी', 'एडमिन', 'verified', 'verification', 'pending', 'kyc'],
      mr: ['पडताळणी', 'मंजुरी', 'प्रलंबित', 'ॲडमिन', 'verified', 'verification', 'pending', 'kyc'],
      or: ['ଯାଞ୍ଚ', 'ମଞ୍ଜୁରୀ', 'ପେଣ୍ଡିଂ', 'ଆଡମିନ୍', 'verified', 'verification', 'pending', 'kyc'],
    },
    responseI18nKey: 'saathi.intents.verification_status.answer',
    suggestedAction: {
      actionType: 'NAVIGATE',
      targetRoute: 'CollectorProfile',
      actionLabelI18nKey: 'saathi.actions.open_profile',
    },
    requiresDynamicData: true,
    dynamicDataResolverKey: 'RESOLVE_VERIFICATION_STATUS',
    quickReplies: ['INTENT_PROFILE_SETTINGS', 'INTENT_SUPPORT_HELP'],
    safetySensitivity: 'STANDARD',
  },
];

/**
 * Fallback intent when no verified intent matches
 */
export const FALLBACK_UNKNOWN_INTENT: SaathiIntent = {
  id: 'INTENT_UNKNOWN',
  category: 'GENERAL',
  applicableRoles: ['ALL'],
  triggerPatterns: { en: [], hi: [], mr: [], or: [] },
  keywords: { en: [], hi: [], mr: [], or: [] },
  responseI18nKey: 'saathi.intents.unknown.answer',
  requiresDynamicData: false,
  quickReplies: ['INTENT_WHAT_IS_ECOSETU', 'INTENT_HOW_TO_CREATE_LOT', 'INTENT_PRICE_BOARD', 'INTENT_SAFETY_BATTERY'],
  safetySensitivity: 'STANDARD',
};
