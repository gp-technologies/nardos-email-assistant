import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

const app = new Hono();

// Middleware
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));
app.use('*', logger(console.log));

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Get all inquiries
app.get('/inquiries', async (c) => {
  try {
    const inquiries = await kv.getByPrefix('inquiry:');
    const formattedInquiries = inquiries.map((item: any) => ({
      id: item.key.replace('inquiry:', ''),
      ...item.value
    })).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    return c.json({ success: true, data: formattedInquiries });
  } catch (error) {
    console.log(`Error fetching inquiries: ${error}`);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Create new inquiry
app.post('/inquiries', async (c) => {
  try {
    const inquiry = await c.req.json();
    const inquiryId = `inquiry_${Date.now()}`;
    
    const inquiryData = {
      ...inquiry,
      id: inquiryId,
      timestamp: new Date().toISOString(),
      status: 'pending'
    };
    
    // Generate AI suggestion (mock for demo)
    const aiSuggestion = await generateAISuggestion(inquiry);
    inquiryData.aiSuggestion = aiSuggestion.response;
    inquiryData.confidence = aiSuggestion.confidence;
    
    await kv.set(`inquiry:${inquiryId}`, inquiryData);
    
    return c.json({ success: true, data: inquiryData });
  } catch (error) {
    console.log(`Error creating inquiry: ${error}`);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Update inquiry status
app.put('/inquiries/:id/status', async (c) => {
  try {
    const inquiryId = c.req.param('id');
    const { status, feedback } = await c.req.json();
    
    const existingData = await kv.get(`inquiry:${inquiryId}`);
    if (!existingData) {
      return c.json({ success: false, error: 'Inquiry not found' }, 404);
    }
    
    const inquiry = existingData;
    inquiry.status = status;
    inquiry.updatedAt = new Date().toISOString();
    
    if (feedback) {
      inquiry.feedback = feedback;
    }
    
    await kv.set(`inquiry:${inquiryId}`, inquiry);
    
    // Update learning statistics
    await updateLearningStats(status, inquiry.confidence);
    
    return c.json({ success: true, data: inquiry });
  } catch (error) {
    console.log(`Error updating inquiry status: ${error}`);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get AI configuration
app.get('/config', async (c) => {
  try {
    const config = await kv.get('ai_config') || ({
      confidenceThreshold: 85,
      autoResponse: false,
      responseTemplate: 'Dziękuję za zapytanie! Na podstawie Państwa wymagań...',
      companyName: 'Nardos House',
      contactEmail: 'kontakt@nardoshouse.pl'
    });
    
    return c.json({ success: true, data: config });
  } catch (error) {
    console.log(`Error fetching config: ${error}`);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Update AI configuration
app.put('/config', async (c) => {
  try {
    const config = await c.req.json();
    await kv.set('ai_config', config);
    
    return c.json({ success: true, data: config });
  } catch (error) {
    console.log(`Error updating config: ${error}`);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get knowledge base
app.get('/knowledge', async (c) => {
  try {
    const knowledgeItems = await kv.getByPrefix('knowledge:');
    const formattedItems = knowledgeItems.map((item: any) => ({
      id: item.key.replace('knowledge:', ''),
      ...item.value
    }));
    
    return c.json({ success: true, data: formattedItems });
  } catch (error) {
    console.log(`Error fetching knowledge base: ${error}`);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Add knowledge item
app.post('/knowledge', async (c) => {
  try {
    const item = await c.req.json();
    const itemId = `knowledge_${Date.now()}`;
    
    const knowledgeItem = {
      ...item,
      id: itemId,
      createdAt: new Date().toISOString()
    };
    
    await kv.set(`knowledge:${itemId}`, knowledgeItem);
    
    return c.json({ success: true, data: knowledgeItem });
  } catch (error) {
    console.log(`Error adding knowledge item: ${error}`);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Delete knowledge item
app.delete('/knowledge/:id', async (c) => {
  try {
    const itemId = c.req.param('id');
    await kv.del(`knowledge:${itemId}`);
    
    return c.json({ success: true });
  } catch (error) {
    console.log(`Error deleting knowledge item: ${error}`);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get learning statistics
app.get('/stats', async (c) => {
  try {
    const stats = await kv.get('learning_stats') || ({
      approved: 0,
      rejected: 0,
      avgAccuracy: 87,
      totalProcessed: 0
    });
    
    return c.json({ success: true, data: stats });
  } catch (error) {
    console.log(`Error fetching stats: ${error}`);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Mock AI suggestion generator
async function generateAISuggestion(inquiry: any) {
  const knowledgeItems = await kv.getByPrefix('knowledge:');
  const knowledge = knowledgeItems.map((item: any) => item.value);
  
  // Mock AI logic - in reality, this would call an AI service
  let response = '';
  let confidence = 75;
  
  const lowerMessage = inquiry.message.toLowerCase();
  
  if (lowerMessage.includes('cena') || lowerMessage.includes('koszt') || lowerMessage.includes('wycena')) {
    response = `Dziękuję za zapytanie o wycenę! Na podstawie Państwa wymagań szacunkowy koszt wynosi 8,000-15,000 zł. Oferujemy bezpłatną konsultację, aby dokładnie omówić szczegóły projektu. Czy moglibyśmy umówić się na rozmowę?`;
    confidence = 92;
  } else if (lowerMessage.includes('czas') || lowerMessage.includes('termin') || lowerMessage.includes('realizacja')) {
    response = `Dziękuję za zapytanie dotyczące czasu realizacji. Przewidywany czas wykonania wynosi 6-8 tygodni, w zależności od zakresu projektu. Możemy zacząć pracę już w styczniu 2025. Czy chcieliby Państwo omówić harmonogram szczegółowo?`;
    confidence = 88;
  } else if (lowerMessage.includes('usługa') || lowerMessage.includes('offer') || lowerMessage.includes('produkt')) {
    response = `Dziękuję za zainteresowanie naszymi usługami! Oferujemy kompleksowe rozwiązania including projektowanie stron internetowych, sklepy online, branding i SEO. Chętnie przedstawimy szczegółową ofertę dostosowaną do Państwa potrzeb.`;
    confidence = 85;
  } else {
    response = `Dziękuję za wiadomość! Cieszę się, że są Państwo zainteresowani współpracą z Nardos House. Chętnie odpowiem na wszystkie pytania i przedstawię szczegółową propozycję. Czy moglibyśmy umówić się na rozmowę telefoniczną?`;
    confidence = 78;
  }
  
  return { response, confidence };
}

// Update learning statistics
async function updateLearningStats(status: string, confidence: number) {
  const statsData = await kv.get('learning_stats');
  const stats = statsData ? JSON.parse(statsData) : {
    approved: 0,
    rejected: 0,
    avgAccuracy: 87,
    totalProcessed: 0
  };
  
  if (status === 'approved') {
    stats.approved++;
  } else if (status === 'rejected') {
    stats.rejected++;
  }
  
  stats.totalProcessed++;
  stats.avgAccuracy = Math.round((stats.approved / stats.totalProcessed) * 100);
  
  await kv.set('learning_stats', JSON.stringify(stats));
}

// Initialize default data
app.get('/init', async (c) => {
  try {
    // Initialize default configuration
    const defaultConfig = {
      confidenceThreshold: 85,
      autoResponse: false,
      responseTemplate: 'Dziękuję za zapytanie! Na podstawie Państwa wymagań...',
      companyName: 'Nardos House',
      contactEmail: 'kontakt@nardoshouse.pl'
    };
    
    const existingConfig = await kv.get('ai_config');
    if (!existingConfig) {
      await kv.set('ai_config', defaultConfig);
    }
    
    // Initialize default knowledge base
    const defaultKnowledge = [
      {
        id: 'knowledge_1',
        title: 'Cennik stron internetowych',
        content: 'Strona wizytówka: 3,000-5,000 zł\nStrona firmowa: 5,000-10,000 zł\nStrona z CMS: 8,000-15,000 zł\nSklep internetowy: 10,000-25,000 zł',
        createdAt: new Date().toISOString()
      },
      {
        id: 'knowledge_2',
        title: 'Czas realizacji projektów',
        content: 'Strona wizytówka: 2-3 tygodnie\nStrona firmowa: 4-6 tygodni\nStrona z CMS: 6-8 tygodni\nSklep internetowy: 8-12 tygodni',
        createdAt: new Date().toISOString()
      },
      {
        id: 'knowledge_3',
        title: 'Usługi dodatkowe',
        content: 'Logo i identyfikacja wizualna: 2,000-5,000 zł\nFotografia produktowa: 500-1,500 zł\nKopywriting: 300-800 zł/strona\nOptymalizacja SEO: 1,500-3,000 zł',
        createdAt: new Date().toISOString()
      }
    ];
    
    for (const item of defaultKnowledge) {
      const existing = await kv.get(`knowledge:${item.id}`);
      if (!existing) {
        await kv.set(`knowledge:${item.id}`, item);
      }
    }

    // Initialize sample inquiries
    const sampleInquiries = [
      {
        id: 'inquiry_sample_1',
        customerName: 'Anna Kowalska',
        email: 'anna.kowalska@example.com',
        subject: 'Wycena strony internetowej dla salonu fryzjerskiego',
        message: 'Witam, prowadzę salon fryzjerski i potrzebuję profesjonalnej strony internetowej. Chciałabym mieć galerię prac, informacje o usługach, cennik oraz możliwość umawiania wizyt online. Jaka byłaby wycena takiego projektu?',
        category: 'pricing',
        status: 'pending',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        aiSuggestion: 'Dziękuję za zainteresowanie naszymi usługami! Dla salonu fryzjerskiego z galerią, cennikiem i systemem rezerwacji szacunkowa wycena wynosi 12,000-18,000 zł. Projekt obejmuje responsywny design, system CMS do zarządzania treścią oraz integrację z kalendarzem rezerwacji. Oferujemy bezpłatną konsultację, podczas której omówimy szczegóły i dostosujemy ofertę do Państwa potrzeb.',
        confidence: 94
      },
      {
        id: 'inquiry_sample_2',
        customerName: 'Marek Nowak',
        email: 'marek.nowak@techfirma.pl',
        subject: 'Czas realizacji sklepu internetowego',
        message: 'Dzień dobry, nasza firma planuje uruchomić sklep internetowy z elektroniką. Potrzebujemy około 200 produktów, system płatności, integrację z hurtowniami i zaawansowane filtry wyszukiwania. Jaki jest przewidywany czas realizacji takiego projektu?',
        category: 'timeline',
        status: 'approved',
        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
        aiSuggestion: 'Dziękuję za zapytanie! Sklep internetowy z 200 produktami, systemem płatności i integracjami wymaga dokładnego planowania. Przewidywany czas realizacji to 10-14 tygodni, obejmujący: projektowanie (2 tygodnie), programowanie (6-8 tygodni), integracje (2 tygodnie), testy i wdrożenie (2 tygodnie). Możemy rozpocząć prace w styczniu 2025. Czy chcieliby Państwo omówić szczegółowy harmonogram?',
        confidence: 91
      },
      {
        id: 'inquiry_sample_3',
        customerName: 'Katarzyna Wiśniewska',
        email: 'k.wisniewska@creativestudio.com',
        subject: 'Kompleksowa identyfikacja wizualna',
        message: 'Witam, uruchamiamy nową agencję kreatywną i potrzebujemy kompleksowej identyfikacji wizualnej. Interesuje nas logo, papeteria firmowa, strona internetowa oraz materiały marketingowe. Czy oferujecie takie kompleksowe usługi?',
        category: 'product',
        status: 'approved',
        timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), // 8 hours ago
        aiSuggestion: 'Tak, oferujemy kompleksowe usługi brandingowe! Nasz pakiet dla agencji kreatywnej obejmuje: projektowanie logo i identyfikacji wizualnej, papeterię firmową (wizytówki, papier firmowy, teczki), responsywną stronę internetową oraz materiały marketingowe. Koszt pakietu: 20,000-28,000 zł, czas realizacji: 8-10 tygodni. Każdy projekt rozpoczynamy od sesji strategicznej, aby idealnie oddać charakter Państwa marki.',
        confidence: 96
      },
      {
        id: 'inquiry_sample_4',
        customerName: 'Piotr Zieliński',
        email: 'piotr@restauracjasmaki.pl',
        subject: 'Strona dla restauracji z systemem zamówień',
        message: 'Dzień dobry, mam restaurację i chciałbym stronę internetową z menu online i możliwością składania zamówień na wynos. Dodatkowo potrzebuję integrację z systemami płatności. Czy to możliwe?',
        category: 'product',
        status: 'pending',
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
        aiSuggestion: 'Oczywiście! Tworzymy profesjonalne strony dla restauracji z pełną funkcjonalnością zamówień online. Oferujemy: prezentację menu z możliwością konfiguracji, koszyk zamówień, integrację z płatnościami online, panel administracyjny do zarządzania zamówieniami. Szacunkowy koszt: 15,000-22,000 zł, czas realizacji: 6-8 tygodni. Dodatkowo możemy zintegrować system z popularnymi platformami dostawczymi.',
        confidence: 93
      },
      {
        id: 'inquiry_sample_5',
        customerName: 'Maria Kowal',
        email: 'maria@zielonaenergia.pl',
        subject: 'Modernizacja starej strony firmowej',
        message: 'Witam, nasza firma zajmuje się odnawialnymi źródłami energii i mamy przestarzałą stronę z 2018 roku. Potrzebujemy jej pełnej modernizacji - nowy design, lepsze SEO, responsywność i szybkość ładowania.',
        category: 'general',
        status: 'pending',
        timestamp: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(), // 18 hours ago
        aiSuggestion: 'Dziękuję za zapytanie! Modernizacja strony to doskonała inwestycja. Oferujemy: całkowity redesign w nowoczesnym stylu, optymalizację SEO, responsywny design, przyspieszenie ładowania, aktualizację contentu. Dla firm z branży OZE mamy doświadczenie w tworzeniu stron technicznych. Koszt modernizacji: 10,000-16,000 zł, czas realizacji: 5-7 tygodni. Możemy przeprowadzić bezpłatny audyt obecnej strony.',
        confidence: 89
      },
      {
        id: 'inquiry_sample_6',
        customerName: 'Tomasz Krawczyk',
        email: 'tomasz@fitnessstudio.com',
        subject: 'Landing page dla nowego studia fitness',
        message: 'Cześć! Otwieram nowe studio fitness i potrzebuję landing page do promocji opening'u. Chciałbym formularz zapisów, galerię zdjęć, cennik karnetów i mapę dojazdu. Kiedy moglibyście to zrealizować?',
        category: 'timeline',
        status: 'rejected',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        aiSuggestion: 'Świetny pomysł na promocję otwarcia! Landing page dla studia fitness z formularzem zapisów, galerią, cennikiem i mapą to standardowy projekt dla nas. Czas realizacji: 3-4 tygodnie, koszt: 6,000-9,000 zł. Możemy rozpocząć już w tym tygodniu, aby zdążyć z promocją otwarcia. Dodatkowo oferujemy integrację z social media i Google Analytics do śledzenia konwersji.',
        confidence: 87
      },
      {
        id: 'inquiry_sample_7',
        customerName: 'Agnieszka Pawlak',
        email: 'agnieszka@prawnik-online.pl',
        subject: 'Strona dla kancelarii prawnej z blogiem',
        message: 'Dzień dobry, jestem prawnikiem i potrzebuję profesjonalnej strony internetowej. Chciałabym mieć sekcję o specjalizacjach, blog z artykułami prawnymi, formularz kontaktowy i możliwość umówienia konsultacji online.',
        category: 'pricing',
        status: 'pending',
        timestamp: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(), // 1.5 days ago
        aiSuggestion: 'Dziękuję za zainteresowanie! Strony dla kancelarii prawnych to nasza specjalizacja. Oferujemy: profesjonalny design budujący zaufanie, sekcję usług z opisami specjalizacji, blog z CMS, bezpieczny formularz kontaktowy, kalendarz konsultacji online, optymalizację SEO dla branży prawniczej. Szacunkowa wycena: 8,000-14,000 zł, czas realizacji: 4-6 tygodni. Zapewniamy zgodność z RODO.',
        confidence: 92
      },
      {
        id: 'inquiry_sample_8',
        customerName: 'Robert Maj',
        email: 'robert@stolarzmistrz.pl',
        subject: 'Portfolio dla stolarza z galerią prac',
        message: 'Witam, jestem stolarzem i chciałbym mieć stronę internetową prezentującą moje prace. Potrzebuję dużą galerię zdjęć, opisy usług, referencje klientów i formularz wyceny online.',
        category: 'product',
        status: 'approved',
        timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), // 2 days ago
        aiSuggestion: 'Doskonały pomysł na prezentację rzemiosła! Dla stolarzy tworzymy strony z elegancką galerią prac, opisami usług, sekcją referencji i formularzem wyceny. Dodatkowo: optymalizacja zdjęć, responsywny design, SEO lokalne. Koszt: 7,000-12,000 zł, czas realizacji: 4-5 tygodni. Możemy też dodać kalkulator kosztów dla standardowych prac stolarskich.',
        confidence: 90
      }
    ];

    // Add sample inquiries if they don't exist
    for (const inquiry of sampleInquiries) {
      const existing = await kv.get(`inquiry:${inquiry.id}`);
      if (!existing) {
        await kv.set(`inquiry:${inquiry.id}`, inquiry);
      }
    }
    
    // Initialize stats
    const existingStats = await kv.get('learning_stats');
    if (!existingStats) {
      await kv.set('learning_stats', {
        approved: 4,
        rejected: 1,
        avgAccuracy: 91,
        totalProcessed: 8
      });
    }
    
    return c.json({ success: true, message: 'Initialized successfully with sample data' });
  } catch (error) {
    console.log(`Error initializing data: ${error}`);
    return c.json({ success: false, error: error.message }, 500);
  }
});

serve(app.fetch);