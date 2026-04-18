# 🔐 Role-Based Access Control System

## System Overview

**এখন আপনার কাছে ৩টি আলাদা ইউজার Role আছে:**

### **1. 🔑 ADMIN**
- সম্পূর্ণ System access
- সব Database দেখতে পারেন
- সব Jobs update করতে পারেন
- Provenance/Audit trail দেখতে পারেন
- System-wide statistics

### **2. 👔 CLIENT**
- Jobs browse করতে পারেন
- নিজের Jobs post করতে পারেন
- নিজের Jobs update করতে পারেন
- কে apply করেছে তা দেখতে পারেন

### **3. 💼 FREELANCER**
- Jobs browse করতে পারেন
- Jobs এ apply করতে পারেন
- Notifications পেতে পারেন
- Payments track করতে পারেন

---

## 🔓 Demo Login Credentials

### **Admin Account**
```
Email: admin@jobportal.com
Password: admin123
Role: Admin
```
**Access:** সব কিছু - Dashboard, Provenance, Database, Updates

### **Client Account**
```
Email: client@jobportal.com
Password: client123
Role: Client
```
**Access:** Post Jobs, Manage Jobs, View Applications

### **Freelancer Account**
```
Email: freelancer@jobportal.com
Password: freelancer123
Role: Freelancer
```
**Access:** Browse Jobs, Apply, Notifications, Payments

---

## 📱 Login Page

**URL:** `http://localhost:3000/client/public/htmlfiles/roleLogin.html`

### **Features:**
- 🎭 Role selector (Admin/Client/Freelancer)
- 📧 Email/Password input
- 💾 localStorage এ user data save হয়
- 🔄 Role change করলে পেজ reload হয়
- 🚪 Logout button

---

## 📊 Role-Based Feature Access

### **Navigation Bar Changes by Role**

#### **Admin sees:**
```
🎛️ Dashboard | 📋 Browse | ✏️ Update | 🔍 Provenance | 🔔 Notifications
```
- এক্সেস: সব কিছু
- Database system দেখতে পারেন
- Audit trail দেখতে পারেন
- সব stats দেখতে পারেন

#### **Client sees:**
```
📋 Browse | ➕ Post Job | ✏️ Manage Jobs | 📨 Applications
```
- এক্সেস: নিজের jobs + browse
- Database system নেই
- Provenance এ যেতে পারবেন না
- Statistics দেখতে পারবেন না

#### **Freelancer sees:**
```
📋 Browse | 🔔 Notifications | 👤 Profile | 💰 Payments
```
- এক্সেস: browse + apply + track
- Admin features দেখা যাবে না
- Database system নেই
- Provenance access নেই

#### **Guest sees:**
```
📋 Browse | 🔐 Login | 📝 Sign Up
```
- এক্সেস: শুধু browse
- কোন admin features নেই
- Apply করতে পারবেন না

---

## 🛡️ Feature Permission Matrix

| Feature | Admin | Client | Freelancer | Guest |
|---------|:-----:|:------:|:----------:|:-----:|
| Browse Jobs | ✅ | ✅ | ✅ | ✅ |
| Post Job | ✅ | ✅ | ❌ | ❌ |
| Update Job | ✅ | ✅ | ❌ | ❌ |
| Apply for Job | ✅ | ❌ | ✅ | ❌ |
| View Provenance | ✅ | ❌ | ❌ | ❌ |
| View Database | ✅ | ❌ | ❌ | ❌ |
| View Notifications | ✅ | ✅ | ✅ | ❌ |
| View Statistics | ✅ | ❌ | ❌ | ❌ |

---

## 💻 Technical Implementation

### **roleManager.js** (`client/public/scripts/roleManager.js`)

**Key Methods:**

```javascript
roleManager.isAdmin()           // Check if admin
roleManager.isClient()          // Check if client
roleManager.isFreelancer()      // Check if freelancer
roleManager.isGuest()           // Check if guest
roleManager.isAuthenticated()   // Check if logged in
roleManager.hasPermission()     // Check feature access
roleManager.logout()            // Logout user
roleManager.getCurrentUser()    // Get current user data
roleManager.getUserDisplay()    // Get display info
```

### **How It Works:**

```
User Logs In (roleLogin.html)
  ↓
Select Role (Admin/Client/Freelancer)
  ↓
Enter Credentials
  ↓
User Data stored in localStorage
  ↓
Redirect to Dashboard
  ↓
Role-based features loaded
  ↓
Admin-only features hidden from non-admins
```

---

## 🎯 Page-by-Page Role Control

### **1. Admin Dashboard** (`adminDashboard.html`)
- **Access:** Admin only
- **Redirect:** যদি admin না হন তাহলে roleLogin.html এ redirect
- **Shows:**
  - Statistics (বড় numbers - Total Jobs, Apps, Freelancers, Payments)
  - Database System section
  - Update Job feature
  - View Provenance feature

### **2. Browse Jobs** (`jobBrowse.html`)
- **Access:** সবাই (Guest, Freelancer, Client, Admin)
- **Navigation:** Role অনুযায়ী বদলে যায়
- **Admin sees:** Update, Provenance links
- **Client sees:** Post Job link
- **Freelancer sees:** Apply করার option
- **Guest sees:** Browse + Login link

### **3. Update Job** (`updateJob.html`)
- **Access:** Admin + Client (job owner)
- **Features:**
  - Status update (open → in-progress → completed)
  - Budget update
  - Automatic audit trail
  - Change reason tracking

### **4. View Provenance** (`viewProvenance.html`)
- **Access:** Admin only
- **Shows:**
  - Complete audit trail
  - WHO changed WHAT
  - WHEN it changed
  - WHY it changed (with reasons)
  - Global system log

### **5. Notifications** (`freelancerNotifications.html`)
- **Access:** Freelancer (+ Client + Admin)
- **Shows:**
  - Application updates
  - Payment status
  - Job status changes
  - Unread count

---

## 🔄 Authentication Flow

### **Initial Load:**
```
Page loads
  ↓
Check localStorage for 'currentUser'
  ↓
If found: Load user data + role
  ↓
If not found: User = Guest
  ↓
Apply role-based CSS/JS
  ↓
Show/hide features accordingly
```

### **Login Process:**
```
User opens roleLogin.html
  ↓
Select role (Admin/Client/Freelancer)
  ↓
Enter email + password
  ↓
Compare with demo credentials
  ↓
If match: Create user object
  ↓
Save to localStorage
  ↓
Redirect to adminDashboard.html
  ↓
Page auto-applies role features
```

### **Logout Process:**
```
User clicks Logout
  ↓
Clear localStorage
  ↓
roleManager.logout()
  ↓
Redirect to roleLogin.html
  ↓
Session cleared
```

---

## 🎨 CSS Classes for Role Control

```css
.role-admin   { /* Show for admin */ }
.role-client  { /* Show for client */ }
.role-freelancer { /* Show for freelancer */ }
.role-guest   { /* Show for guests */ }

/* Hide admin features from non-admins */
#admin-only-section { display: none; }
#feature-update-job { display: none; }
#feature-view-provenance { display: none; }
#database-section { display: none; }
```

---

## 📋 Demo Scenarios

### **Scenario 1: Admin User**
```
1. Open roleLogin.html
2. Select "Admin" role
3. Enter: admin@jobportal.com / admin123
4. See: Full dashboard, stats, provenance, database
5. Can: Update any job, view audit trail, download reports
```

### **Scenario 2: Client User**
```
1. Open roleLogin.html
2. Select "Client" role
3. Enter: client@jobportal.com / client123
4. See: Browse jobs, post jobs, manage applications
5. Can: Post new job, update own jobs, see who applied
```

### **Scenario 3: Freelancer User**
```
1. Open roleLogin.html
2. Select "Freelancer" role
3. Enter: freelancer@jobportal.com / freelancer123
4. See: Browse jobs, apply, notifications, payments
5. Can: Apply for jobs, track applications, see payments
```

---

## 🚀 How to Test

### **Test Admin Access:**
```
1. Go to http://localhost:3000/client/public/htmlfiles/roleLogin.html
2. Select "Admin"
3. Enter demo admin credentials
4. You should see:
   - Dashboard with all stats
   - Database System section
   - Update Job feature
   - Provenance button
```

### **Test Client Access:**
```
1. Go to roleLogin.html
2. Select "Client"
3. Enter demo client credentials
4. You should see:
   - Post Job option
   - Browse Jobs
   - Manage Jobs
   - NOT see: Provenance, Database
```

### **Test Freelancer Access:**
```
1. Go to roleLogin.html
2. Select "Freelancer"
3. Enter demo freelancer credentials
4. You should see:
   - Browse Jobs
   - Apply option
   - Notifications
   - NOT see: Admin features
```

---

## 📝 User Data Structure

```javascript
{
  id: "unique_id_string",
  name: "Admin User",
  email: "admin@jobportal.com",
  role: "admin",
  loginTime: "2026-04-17T10:30:00Z"
}
```

Data stored in: `localStorage['currentUser']`

---

## 🔒 Security Notes

### **Current Implementation (Demo):**
- ⚠️ Simple credential check (demo accounts only)
- ⚠️ Client-side validation (not production-ready)
- ⚠️ No real database authentication

### **Future Production:**
- ✅ Backend API authentication
- ✅ JWT tokens
- ✅ Secure password hashing
- ✅ Session management
- ✅ Role validation on backend

---

## 📞 File Locations

| File | Purpose |
|------|---------|
| `client/public/scripts/roleManager.js` | Role management system |
| `client/public/htmlfiles/roleLogin.html` | Login page with role selector |
| `client/public/htmlfiles/adminDashboard.html` | Admin-only dashboard |
| `client/public/htmlfiles/jobBrowse.html` | Role-aware job browser |
| `client/public/htmlfiles/updateJob.html` | Admin/Client job editor |

---

## ✅ Checklist

- ✅ Role Manager system created
- ✅ Login page with role selector
- ✅ Demo credentials (Admin, Client, Freelancer)
- ✅ Admin Dashboard role-protected
- ✅ Role-based navigation
- ✅ Feature hiding based on role
- ✅ Logout functionality
- ✅ User info display
- ✅ localStorage persistence
- ✅ Automatic redirect on unauthorized access

---

**Status:** ✅ Fully Implemented and Operational
**Last Updated:** April 17, 2026
**System Type:** Role-Based Access Control (RBAC)
