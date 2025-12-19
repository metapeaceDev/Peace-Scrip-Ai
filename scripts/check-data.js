const admin = require('firebase-admin');
const serviceAccount = require('../service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkData() {
  console.log('🔍 Checking Analytics Data...\n');

  const snapshot = await db.collection('subscriptions').get();
  
  let totalUsers = 0;
  let activeCount = 0;
  let totalCredits = 0;
  let totalVeo = 0;
  let mrr = 0;
  let paidUsers = 0;
  
  const tierCount = { free: 0, basic: 0, pro: 0, enterprise: 0 };
  const apiCalls = { scripts: 0, images: 0, videos: 0 };
  
  const PRICES = { basic: 149.5, pro: 499.5, enterprise: 8000 };
  
  const now = Date.now();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;

  snapshot.forEach(doc => {
    const d = doc.data();
    totalUsers++;
    
    const tier = d.subscription?.tier || 'free';
    tierCount[tier]++;
    
    const status = d.subscription?.status || 'active';
    
    // Active (30 days)
    const lastUpdate = d.lastUpdated?._seconds ? d.lastUpdated._seconds * 1000 : 0;
    if ((now - lastUpdate) < thirtyDays) activeCount++;
    
    // Credits
    totalCredits += d.monthlyUsage?.creditsUsed || 0;
    
    // Veo
    totalVeo += d.monthlyUsage?.veoVideosGenerated || 0;
    
    // MRR
    if (status === 'active' && tier !== 'free') {
      paidUsers++;
      mrr += PRICES[tier] || 0;
    }
    
    // API
    if (d.usage) {
      apiCalls.scripts += d.usage.scriptsGenerated || 0;
      apiCalls.images += d.usage.imagesGenerated || 0;
      apiCalls.videos += d.usage.videosGenerated || 0;
    }
  });

  console.log('📊 RESULTS:\n');
  console.log('👥 Total Users:', totalUsers);
  console.log('   Active:', activeCount);
  console.log('   Tiers:', tierCount);
  console.log('');
  console.log('💰 MRR: ฿' + mrr.toFixed(1));
  console.log('   ARR: ฿' + (mrr * 12).toFixed(0));
  console.log('   ARPU: ฿' + (paidUsers ? (mrr / paidUsers).toFixed(2) : '0'));
  console.log('   Paid:', paidUsers);
  console.log('');
  console.log('💳 Credits:', totalCredits, '(avg:', Math.round(totalCredits / totalUsers) + ')');
  console.log('🎬 Veo Videos:', totalVeo);
  console.log('📞 API: S:' + apiCalls.scripts, 'I:' + apiCalls.images, 'V:' + apiCalls.videos, '= ' + (apiCalls.scripts + apiCalls.images + apiCalls.videos));
}

checkData().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
