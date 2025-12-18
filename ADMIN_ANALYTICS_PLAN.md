# 📊 Admin Analytics Dashboard - แผนการพัฒนา

## 🎯 วัตถุประสงค์
สร้าง Dashboard สำหรับ admin เพื่อติดตามและวิเคราะห์การใช้งานระบบ

### ข้อมูลที่ต้องแสดง:
1. **จำนวนผู้ใช้** - รวมและแยกตาม tier
2. **ข้อมูลส่วนตัว** - email, displayName, photoURL (ตาม privacy policy)
3. **แพ็คเก็จที่ใช้** - FREE/BASIC/PRO/ENTERPRISE + สถานะ
4. **การใช้งาน** - ความถี่, credits used, Veo videos
5. **ข้อมูลย้อนหลัง** - usage history, trends
6. **รายได้** - MRR, ARR, revenue per tier

### 🔒 ความปลอดภัย:
- **Admin-only access** - เฉพาะผู้ที่ได้รับอนุญาต
- Firebase Auth custom claims (admin: true)
- Firestore security rules (admin verification)
- Audit logging (ใครเข้าดู analytics เมื่อไหร่)

---

## 📋 Phase 1: System Analysis ✅

### ✅ Firestore Collections ที่มีอยู่:

#### 1. `/subscriptions/{userId}`
```typescript
{
  userId: string;
  subscription: {
    tier: 'free' | 'basic' | 'pro' | 'enterprise';
    credits: number;
    maxCredits: number;
    features: { ... };
  };
  usage: {
    scriptsGenerated: number;
    imagesGenerated: number;
    videosGenerated: number;
    storageUsed: number;
    projectsCreated: number;
    charactersCreated: number;
    scenesCreated: number;
  };
  monthlyUsage: {
    month: string; // "YYYY-MM"
    creditsUsed: number;
    veoVideosGenerated: number;
    resetAt: Date;
  };
  lastUpdated: Date;
}
```

**✅ ข้อมูลที่ได้:**
- Subscription tier
- Credits used
- Veo videos count
- Monthly usage
- Project/character/scene counts

#### 2. `/users/{userId}` (ถ้ามี)
```typescript
{
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: Timestamp;
  lastLogin: Timestamp;
  sharedProjects?: string[];
}
```

**✅ ข้อมูลที่ได้:**
- User profile
- Registration date
- Last login

#### 3. `/projects/{projectId}`
```typescript
{
  id: string;
  userId: string; // owner
  title: string;
  type: 'feature' | 'short' | 'series';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  // ... project data
}
```

**✅ ข้อมูลที่ได้:**
- Total projects per user
- Project activity

### ⚠️ ข้อมูลที่ขาด:

1. **Payment/Revenue Data**
   - ยังไม่มี `/payments` collection
   - ไม่มีข้อมูล billing history
   - ไม่มี MRR/ARR tracking

2. **Admin Authorization**
   - ยังไม่มี admin custom claims
   - Security rules ไม่รองรับ admin role

3. **Historical Analytics**
   - ไม่มี aggregated stats
   - ไม่มี daily/monthly snapshots

---

## 📋 Phase 2: Dashboard Design (IN PROGRESS)

### 🎨 UI Layout

```
┌─────────────────────────────────────────────────────────┐
│  🔒 Admin Analytics Dashboard                           │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  📊 Overview Cards                                       │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐   │
│  │ Total   │  │ Active  │  │ Revenue │  │ Credits │   │
│  │ Users   │  │ This    │  │ (MRR)   │  │ Used    │   │
│  │  1,234  │  │ Month   │  │ ฿45,600 │  │ 12.5K   │   │
│  └─────────┘  │   456   │  └─────────┘  └─────────┘   │
│               └─────────┘                               │
│                                                          │
│  📈 Charts                                               │
│  ┌────────────────────┐  ┌────────────────────┐        │
│  │ Users by Tier      │  │ Revenue Trend      │        │
│  │  FREE: 800         │  │  [Line Chart]      │        │
│  │  BASIC: 300        │  │                    │        │
│  │  PRO: 100          │  │                    │        │
│  │  ENT: 34           │  │                    │        │
│  └────────────────────┘  └────────────────────┘        │
│                                                          │
│  👥 User Table                                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Search: [_____________] Filter: [All Tiers ▾]  │   │
│  ├────┬─────────┬──────┬────────┬────────┬────────┤   │
│  │ ID │ Email   │ Tier │Credits │ Veo    │Actions │   │
│  ├────┼─────────┼──────┼────────┼────────┼────────┤   │
│  │ 1  │ user@.. │ PRO  │ 450/500│  0/0   │ [View] │   │
│  │ 2  │ test@.. │ BASIC│ 120/150│  -     │ [View] │   │
│  │ ...│         │      │        │        │        │   │
│  └────┴─────────┴──────┴────────┴────────┴────────┘   │
│                                                          │
│  [Export CSV] [Export PDF] [Refresh]                   │
└─────────────────────────────────────────────────────────┘
```

### 📊 Metrics to Display

#### Overview Cards:
1. **Total Users** - จำนวนผู้ใช้ทั้งหมด
2. **Active This Month** - ผู้ใช้ที่ active ในเดือนนี้
3. **MRR (Monthly Recurring Revenue)** - รายได้ต่อเดือน
4. **Total Credits Used** - credits ที่ใช้ไปทั้งหมด

#### Users by Tier:
- FREE: count
- BASIC: count (+ Early Bird)
- PRO: count (+ Early Bird)
- ENTERPRISE: count

#### Revenue Metrics:
- MRR (Monthly Recurring Revenue)
- ARR (Annual Recurring Revenue)
- Revenue by Tier
- Average Revenue Per User (ARPU)

#### Usage Statistics:
- Total API calls (scripts, images, videos)
- Credits consumed
- Veo videos generated
- Storage used
- Active projects

#### User Table Columns:
1. **User ID** (shortened)
2. **Email**
3. **Display Name**
4. **Tier** (FREE/BASIC/PRO/ENT)
5. **Status** (active/canceled/past_due)
6. **Credits** (used/max)
7. **Veo Videos** (used/max)
8. **Last Active**
9. **Created At**
10. **Actions** (View Details, View History)

#### Filters:
- By Tier (All, FREE, BASIC, PRO, ENTERPRISE)
- By Status (All, Active, Canceled, Past Due)
- By Activity (All, Active Last 7 Days, Active Last 30 Days, Inactive)
- Date Range (This Month, Last Month, Last 3 Months, Custom)

#### Search:
- By Email
- By User ID
- By Display Name

---

## 📋 Phase 3: Database Schema

### 🆕 New Collections:

#### 1. `/admin-users/{userId}`
```typescript
{
  userId: string;
  email: string;
  role: 'super-admin' | 'admin' | 'viewer';
  permissions: {
    canViewAnalytics: boolean;
    canExportData: boolean;
    canManageUsers: boolean;
    canManageSubscriptions: boolean;
  };
  createdAt: Timestamp;
  createdBy: string; // admin who granted access
  lastAccess?: Timestamp;
}
```

**Purpose:** Track authorized admin users

#### 2. `/analytics-aggregate/{period}`
```typescript
{
  period: string; // "YYYY-MM-DD" or "YYYY-MM"
  type: 'daily' | 'monthly';
  
  users: {
    total: number;
    byTier: {
      free: number;
      basic: number;
      pro: number;
      enterprise: number;
    };
    active: number; // used system in this period
    new: number; // registered in this period
    churned: number; // canceled in this period
  };
  
  revenue: {
    mrr: number; // Monthly Recurring Revenue
    arr: number; // Annual Recurring Revenue
    byTier: {
      basic: number;
      pro: number;
      enterprise: number;
    };
    new: number; // from new subscriptions
    expansion: number; // from upgrades
    contraction: number; // from downgrades
    churned: number; // from cancellations
  };
  
  usage: {
    totalCredits: number;
    veoVideos: number;
    apiCalls: {
      scripts: number;
      images: number;
      videos: number;
    };
    storageGB: number;
    activeProjects: number;
  };
  
  createdAt: Timestamp;
}
```

**Purpose:** Pre-aggregated statistics for faster queries

#### 3. `/admin-audit-log/{logId}`
```typescript
{
  adminId: string;
  action: 'view-analytics' | 'export-data' | 'view-user' | 'modify-subscription';
  targetUserId?: string; // if action affects specific user
  timestamp: Timestamp;
  ipAddress?: string;
  userAgent?: string;
  details?: any; // additional context
}
```

**Purpose:** Security audit trail

### 🔄 Update Existing Collections:

#### `/subscriptions/{userId}` - Add Payment Info
```typescript
{
  // ... existing fields ...
  
  billing?: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    status: 'active' | 'canceled' | 'canceling' | 'past_due';
    billingCycle: 'monthly' | 'yearly';
    amount: number; // ราคาที่จ่ายจริง (รวม Early Bird)
    currency: 'THB';
    startDate: Timestamp;
    nextBillingDate?: Timestamp;
    canceledAt?: Timestamp;
  };
  
  history: {
    tierChanges: Array<{
      from: SubscriptionTier;
      to: SubscriptionTier;
      timestamp: Timestamp;
      reason?: string;
    }>;
  };
}
```

#### `/users/{userId}` - Add Activity Tracking
```typescript
{
  // ... existing fields ...
  
  activity: {
    lastLogin: Timestamp;
    lastActive: Timestamp; // last API call or action
    loginCount: number;
    totalSessions: number;
  };
}
```

---

## 📋 Phase 4: Backend Analytics Service

### 📁 File: `src/services/adminAnalyticsService.ts`

#### Functions to Implement:

##### 1. User Statistics
```typescript
export async function getUserStats(
  filters?: {
    tier?: SubscriptionTier;
    status?: 'active' | 'canceled' | 'past_due';
    dateRange?: { start: Date; end: Date };
  }
): Promise<{
  total: number;
  byTier: Record<SubscriptionTier, number>;
  byStatus: Record<string, number>;
  active: number;
  new: number;
  churned: number;
}>;
```

##### 2. Revenue Metrics
```typescript
export async function getRevenueMetrics(
  period: 'month' | 'year'
): Promise<{
  mrr: number;
  arr: number;
  byTier: Record<SubscriptionTier, number>;
  growth: {
    new: number;
    expansion: number;
    contraction: number;
    churned: number;
  };
  arpu: number; // Average Revenue Per User
}>;
```

##### 3. Usage Analytics
```typescript
export async function getUsageAnalytics(
  dateRange?: { start: Date; end: Date }
): Promise<{
  credits: {
    total: number;
    average: number;
    byTier: Record<SubscriptionTier, number>;
  };
  veoVideos: {
    total: number;
    byUser: Array<{ userId: string; count: number }>;
  };
  apiCalls: {
    scripts: number;
    images: number;
    videos: number;
  };
  storage: {
    totalGB: number;
    average: number;
  };
}>;
```

##### 4. User List (with pagination)
```typescript
export async function getUserList(
  options: {
    page?: number;
    limit?: number;
    search?: string;
    tier?: SubscriptionTier;
    status?: string;
    sortBy?: 'createdAt' | 'lastActive' | 'creditsUsed';
    sortOrder?: 'asc' | 'desc';
  }
): Promise<{
  users: Array<{
    userId: string;
    email: string;
    displayName: string;
    photoURL?: string;
    tier: SubscriptionTier;
    status: string;
    credits: { used: number; max: number };
    veoVideos: { used: number; max: number };
    lastActive: Date;
    createdAt: Date;
  }>;
  total: number;
  page: number;
  totalPages: number;
}>;
```

##### 5. User Details
```typescript
export async function getUserDetails(
  userId: string
): Promise<{
  profile: {
    email: string;
    displayName: string;
    photoURL?: string;
    createdAt: Date;
    lastActive: Date;
  };
  subscription: UsageRecord;
  projects: Array<{
    id: string;
    title: string;
    type: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
  usageHistory: Array<{
    month: string;
    creditsUsed: number;
    veoVideos: number;
    apiCalls: {
      scripts: number;
      images: number;
      videos: number;
    };
  }>;
}>;
```

##### 6. Data Aggregation (Scheduled Function)
```typescript
export async function aggregateDailyStats(
  date: Date
): Promise<void>;

export async function aggregateMonthlyStats(
  month: string // "YYYY-MM"
): Promise<void>;
```

##### 7. Admin Authorization
```typescript
export async function checkAdminAccess(
  userId: string
): Promise<{
  isAdmin: boolean;
  role?: 'super-admin' | 'admin' | 'viewer';
  permissions?: {
    canViewAnalytics: boolean;
    canExportData: boolean;
    canManageUsers: boolean;
    canManageSubscriptions: boolean;
  };
}>;

export async function logAdminAction(
  adminId: string,
  action: string,
  details?: any
): Promise<void>;
```

---

## 📋 Phase 5: Frontend Dashboard Component

### 📁 File: `src/components/AdminDashboard.tsx`

#### Component Structure:

```tsx
export const AdminDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [revenue, setRevenue] = useState<RevenueMetrics | null>(null);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [filters, setFilters] = useState<Filters>({});
  const [search, setSearch] = useState('');
  
  // Real-time listener for stats
  useEffect(() => {
    const unsubscribe = subscribeToAnalytics((data) => {
      setStats(data.stats);
      setRevenue(data.revenue);
    });
    
    return () => unsubscribe();
  }, []);
  
  return (
    <div className="admin-dashboard">
      {/* Overview Cards */}
      <OverviewCards stats={stats} revenue={revenue} />
      
      {/* Charts */}
      <ChartsSection stats={stats} revenue={revenue} />
      
      {/* User Table */}
      <UserTable 
        users={users} 
        onSearch={setSearch}
        onFilter={setFilters}
      />
      
      {/* Export Controls */}
      <ExportControls />
    </div>
  );
};
```

#### Sub-components:

##### 1. OverviewCards
```tsx
interface OverviewCardsProps {
  stats: UserStats;
  revenue: RevenueMetrics;
}

const OverviewCards: React.FC<OverviewCardsProps> = ({ stats, revenue }) => {
  return (
    <div className="overview-cards">
      <Card title="Total Users" value={stats.total} />
      <Card title="Active This Month" value={stats.active} />
      <Card title="MRR" value={`฿${revenue.mrr.toLocaleString()}`} />
      <Card title="Credits Used" value={stats.creditsUsed.toLocaleString()} />
    </div>
  );
};
```

##### 2. ChartsSection
```tsx
const ChartsSection: React.FC = () => {
  return (
    <div className="charts-section">
      <PieChart 
        title="Users by Tier"
        data={[
          { name: 'FREE', value: 800 },
          { name: 'BASIC', value: 300 },
          { name: 'PRO', value: 100 },
          { name: 'ENTERPRISE', value: 34 }
        ]}
      />
      
      <LineChart
        title="Revenue Trend"
        data={revenueHistory}
        xField="month"
        yField="revenue"
      />
      
      <BarChart
        title="API Usage"
        data={apiUsage}
      />
    </div>
  );
};
```

##### 3. UserTable
```tsx
const UserTable: React.FC<UserTableProps> = ({ users, onSearch, onFilter }) => {
  return (
    <div className="user-table">
      <div className="controls">
        <SearchBar value={search} onChange={onSearch} />
        <FilterDropdown 
          options={['All', 'FREE', 'BASIC', 'PRO', 'ENTERPRISE']}
          onChange={onFilter}
        />
      </div>
      
      <table>
        <thead>
          <tr>
            <th>Email</th>
            <th>Tier</th>
            <th>Credits</th>
            <th>Veo Videos</th>
            <th>Last Active</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <UserRow key={user.id} user={user} />
          ))}
        </tbody>
      </table>
      
      <Pagination />
    </div>
  );
};
```

##### 4. ExportControls
```tsx
const ExportControls: React.FC = () => {
  const handleExportCSV = async () => {
    const data = await exportAnalyticsData('csv');
    downloadFile(data, 'analytics.csv');
  };
  
  const handleExportPDF = async () => {
    const data = await exportAnalyticsData('pdf');
    downloadFile(data, 'analytics.pdf');
  };
  
  return (
    <div className="export-controls">
      <button onClick={handleExportCSV}>Export CSV</button>
      <button onClick={handleExportPDF}>Export PDF</button>
    </div>
  );
};
```

---

## 📋 Phase 6: Security & Access Control

### 🔒 1. Firebase Auth Custom Claims

#### Set Admin Role (Server-side):
```javascript
// Firebase Admin SDK (Cloud Functions or Backend)
const admin = require('firebase-admin');

async function grantAdminAccess(userId, role = 'admin') {
  await admin.auth().setCustomUserClaims(userId, {
    admin: true,
    adminRole: role // 'super-admin', 'admin', or 'viewer'
  });
  
  // Log to admin-users collection
  await admin.firestore().collection('admin-users').doc(userId).set({
    userId,
    role,
    grantedAt: admin.firestore.FieldValue.serverTimestamp(),
    grantedBy: 'system' // or adminId who granted
  });
}

async function revokeAdminAccess(userId) {
  await admin.auth().setCustomUserClaims(userId, {
    admin: false
  });
  
  await admin.firestore().collection('admin-users').doc(userId).delete();
}
```

#### Check Admin Status (Client-side):
```typescript
// src/services/adminAuthService.ts
export async function checkIsAdmin(): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return false;
  
  const tokenResult = await user.getIdTokenResult();
  return tokenResult.claims.admin === true;
}

export async function getAdminRole(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  
  const tokenResult = await user.getIdTokenResult();
  return tokenResult.claims.adminRole || null;
}
```

### 🔒 2. Firestore Security Rules

#### Update `firestore.rules`:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper: Check if user is admin
    function isAdmin() {
      return request.auth != null && 
             request.auth.token.admin == true;
    }
    
    // Helper: Check admin role
    function hasAdminRole(role) {
      return isAdmin() && 
             request.auth.token.adminRole == role;
    }
    
    // Admin Users Collection - Super Admin Only
    match /admin-users/{userId} {
      allow read: if isAdmin();
      allow write: if hasAdminRole('super-admin');
    }
    
    // Analytics Aggregate - Admin Read Only
    match /analytics-aggregate/{period} {
      allow read: if isAdmin();
      allow write: if false; // Only Cloud Functions can write
    }
    
    // Admin Audit Log - Admin Read, System Write
    match /admin-audit-log/{logId} {
      allow read: if isAdmin();
      allow create: if isAdmin();
      allow update, delete: if false;
    }
    
    // Subscriptions - Admin can read all
    match /subscriptions/{userId} {
      allow read: if isOwner(userId) || isAdmin();
      allow write: if isOwner(userId);
    }
    
    // Users - Admin can read all
    match /users/{userId} {
      allow read: if isOwner(userId) || isAdmin();
      allow write: if isOwner(userId);
    }
    
    // Projects - Admin can read all
    match /projects/{projectId} {
      allow read: if isAuthenticated() || isAdmin();
      // ... rest of rules
    }
    
    // ... existing rules ...
  }
}
```

### 🔒 3. Admin Authorization Middleware

#### Frontend Route Protection:
```tsx
// src/components/AdminRoute.tsx
export const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    checkIsAdmin().then(admin => {
      setIsAdmin(admin);
      setLoading(false);
    });
  }, []);
  
  if (loading) return <LoadingSpinner />;
  
  if (!isAdmin) {
    return (
      <div className="access-denied">
        <h1>🔒 Access Denied</h1>
        <p>You don't have permission to access this page.</p>
      </div>
    );
  }
  
  return <>{children}</>;
};

// Usage in App.tsx
<Route path="/admin" element={
  <AdminRoute>
    <AdminDashboard />
  </AdminRoute>
} />
```

### 🔒 4. Audit Logging

```typescript
// src/services/auditService.ts
export async function logAdminAction(
  action: string,
  details?: any
): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  
  const logRef = doc(collection(db, 'admin-audit-log'));
  await setDoc(logRef, {
    adminId: user.uid,
    adminEmail: user.email,
    action,
    details,
    timestamp: serverTimestamp(),
    userAgent: navigator.userAgent,
  });
}

// Usage
await logAdminAction('view-analytics', { page: 'dashboard' });
await logAdminAction('export-data', { format: 'csv', filters });
await logAdminAction('view-user', { userId: 'user123' });
```

### 🔒 5. Privacy Compliance (GDPR/PDPA)

#### Data Minimization:
```typescript
// Only show necessary user data
interface PublicUserData {
  userId: string; // Masked: "user_abc***"
  email: string; // Masked: "u***@example.com"
  tier: SubscriptionTier;
  status: string;
  stats: {
    creditsUsed: number;
    veoVideos: number;
  };
  dates: {
    createdAt: Date;
    lastActive: Date;
  };
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  const masked = local.charAt(0) + '***';
  return `${masked}@${domain}`;
}

function maskUserId(userId: string): string {
  return `user_${userId.substring(0, 3)}***`;
}
```

#### User Consent:
- Add to Terms of Service: "Analytics data may be viewed by authorized administrators"
- Privacy Policy: "We collect usage statistics for service improvement"

---

## 📋 Phase 7: Testing & Deployment

### ✅ Testing Checklist:

#### 1. Admin Authorization
- [ ] Non-admin users cannot access `/admin` route
- [ ] Admin users can access dashboard
- [ ] Custom claims are properly set
- [ ] Security rules block unauthorized access

#### 2. Data Display
- [ ] User stats display correctly
- [ ] Revenue metrics calculate properly
- [ ] Charts render with real data
- [ ] User table shows all users
- [ ] Pagination works

#### 3. Filters & Search
- [ ] Search by email works
- [ ] Filter by tier works
- [ ] Filter by status works
- [ ] Date range filter works

#### 4. Real-time Updates
- [ ] Dashboard updates when new user registers
- [ ] Stats update when subscription changes
- [ ] Usage updates in real-time

#### 5. Export
- [ ] CSV export works
- [ ] PDF export works
- [ ] Exported data is accurate

#### 6. Security
- [ ] Audit logs are created
- [ ] Firestore rules enforce admin-only access
- [ ] PII is properly masked
- [ ] No data leaks to non-admin users

#### 7. Performance
- [ ] Dashboard loads in < 2 seconds
- [ ] Aggregated queries are fast
- [ ] Real-time listeners don't overload
- [ ] Pagination handles large datasets

### 🚀 Deployment Steps:

1. **Deploy Security Rules:**
```bash
firebase deploy --only firestore:rules
```

2. **Set Admin Custom Claims:**
```bash
# Via Firebase Admin SDK or Cloud Functions
node scripts/set-admin-claims.js
```

3. **Deploy Frontend:**
```bash
npm run build
firebase deploy --only hosting
```

4. **Set up Scheduled Functions (Optional):**
```bash
# For daily/monthly aggregation
firebase deploy --only functions:aggregateDailyStats
firebase deploy --only functions:aggregateMonthlyStats
```

5. **Monitor:**
```bash
firebase functions:log
```

---

## 🎯 Summary

### What We'll Build:

✅ **Admin Dashboard** with:
- User statistics (total, by tier, active)
- Revenue metrics (MRR, ARR, ARPU)
- Usage analytics (credits, Veo, API calls)
- User table (search, filter, pagination)
- Real-time updates
- Export (CSV, PDF)

✅ **Security:**
- Admin-only access via Firebase Auth custom claims
- Firestore security rules
- Audit logging
- Privacy-compliant data display

✅ **Backend Services:**
- User statistics queries
- Revenue calculations
- Usage analytics
- Data aggregation (daily/monthly)
- Real-time listeners

### Timeline Estimate:

- Phase 2: Dashboard Design - **2-3 hours**
- Phase 3: Database Schema - **1-2 hours**
- Phase 4: Backend Service - **4-6 hours**
- Phase 5: Frontend Dashboard - **6-8 hours**
- Phase 6: Security & Access - **3-4 hours**
- Phase 7: Testing & Deploy - **2-3 hours**

**Total: ~20-25 hours** (2-3 days of focused work)

---

## 📝 Next Steps

**Ready to proceed with Phase 2: Dashboard Design?**

Let me know if you want to:
1. Start implementing the AdminDashboard component
2. Create the database schema first
3. Set up admin custom claims
4. Modify the plan

พร้อมเริ่มสร้าง Dashboard เลยไหม? 🚀
