import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { readFileSync } from 'fs';

const firebaseConfig = JSON.parse(readFileSync('./firebase.json', 'utf-8'));

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function verifyAnalytics() {
  console.log('🔍 Verifying Analytics Data...\n');

  const snapshot = await getDocs(collection(db, 'subscriptions'));
  
  let totalUsers = 0;
  let activeUsers = 0;
  let totalCredits = 0;
  let totalVeoVideos = 0;
  let mrr = 0;
  let paidUsers = 0;
  
  const tierCounts = { free: 0, basic: 0, pro: 0, enterprise: 0 };
  const statusCounts = { active: 0, canceled: 0, past_due: 0 };
  
  const apiCalls = { scripts: 0, images: 0, videos: 0 };
  
  const TIER_PRICES = { basic: 149.5, pro: 499.5, enterprise: 8000 };
  
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  snapshot.docs.forEach(doc => {
    const data = doc.data();
    totalUsers++;
    
    const tier = data.subscription?.tier || 'free';
    tierCounts[tier]++;
    
    const status = data.subscription?.status || 'active';
    if (status in statusCounts) statusCounts[status]++;
    
    // Active users (last 30 days)
    const lastUpdated = data.lastUpdated?.toDate() || new Date(data.lastUpdated || 0);
    if (lastUpdated >= thirtyDaysAgo) activeUsers++;
    
    // Credits
    totalCredits += data.monthlyUsage?.creditsUsed || 0;
    
    // Veo Videos
    totalVeoVideos += data.monthlyUsage?.veoVideosGenerated || 0;
    
    // MRR
    if (status === 'active' && tier !== 'free') {
      paidUsers++;
      mrr += TIER_PRICES[tier] || 0;
    }
    
    // API Calls
    if (data.usage) {
      apiCalls.scripts += data.usage.scriptsGenerated || 0;
      apiCalls.images += data.usage.imagesGenerated || 0;
      apiCalls.videos += data.usage.videosGenerated || 0;
    }
  });

  console.log('📊 VERIFICATION RESULTS:\n');
  console.log('👥 Total Users:', totalUsers);
  console.log('   Active (30d):', activeUsers);
  console.log('   By Tier:', tierCounts);
  console.log('   By Status:', statusCounts);
  console.log('');
  console.log('💰 MRR:', mrr.toFixed(2));
  console.log('   ARR:', (mrr * 12).toFixed(2));
  console.log('   ARPU:', paidUsers > 0 ? (mrr / paidUsers).toFixed(2) : '0.00');
  console.log('   Paid Users:', paidUsers);
  console.log('');
  console.log('💳 Credits Used:', totalCredits);
  console.log('   Avg per user:', (totalCredits / totalUsers).toFixed(0));
  console.log('');
  console.log('🎬 Veo Videos:', totalVeoVideos);
  console.log('');
  console.log('📞 API Calls:');
  console.log('   Scripts:', apiCalls.scripts);
  console.log('   Images:', apiCalls.images);
  console.log('   Videos:', apiCalls.videos);
  console.log('   Total:', apiCalls.scripts + apiCalls.images + apiCalls.videos);
}

verifyAnalytics().catch(console.error);
