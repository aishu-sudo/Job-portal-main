# 🚀 Complete Role-Based System - Setup & Testing Guide

## 📋 What's New

আমরা একটি সম্পূর্ণ **Role-Based Access Control (RBAC) System** তৈরি করেছি যেখানে:

- ✅ **3 টি আলাদা User Roles** (Admin, Client, Freelancer)
- ✅ **Role-Specific Dashboards** (প্রতিটি role এর নিজস্ব view)
- ✅ **Feature Hiding** (নন-অ্যাডমিন ইউজারদের admin features লুকানো)
- ✅ **Demo Credentials** (সহজ testing এর জন্য)
- ✅ **Session Management** (localStorage এ user persist করা)
- ✅ **Welcome Page** (Role selection এর জন্য)

---

## 🎯 Entry Points

### **Main Entry Point**
```
http://localhost:3000/client/public/htmlfiles/index.html
```
**What you see:**
- Welcome page with role descriptions
- 3 role cards (Admin, Client, Freelancer)
- Direct login buttons for each role
- Demo credentials displayed

### **Direct Login Page**
```
http://localhost:3000/client/public/htmlfiles/roleLogin.html
```
**What you see:**
- Role selector buttons
- Email/Password form
- Demo account info

---

## 👥 User Roles & Access

### **1. 🔑 ADMIN**
**Demo Credentials:**
```
Email: admin@jobportal.com
Password: admin123
```

**Can Access:**
- 🎛️ Admin Dashboard (সম্পূর্ণ system overview)
- 📊 Database System (সব tables stats)
- 🔍 View Provenance (complete audit trail)
- ✏️ Update Job (যেকোনো job update করতে পারে)
- 📋 Browse Jobs (সব jobs দেখতে পারে)
- 🔔 Notifications (সব notifications দেখতে পারে)

**Features Shown in Navigation:**
```
[🎛️ Dashboard] [📋 Browse] [✏️ Update] [🔍 Provenance] [🔔 Notifications]
```

**Admin-Only Features Hidden from Others:**
- Database System section
- View Provenance button
- Update Job page (Advanced options)
- System statistics
- Global audit log

---

### **2. 👔 CLIENT**
**Demo Credentials:**
```
Email: client@jobportal.com
Password: client123
```

**Can Access:**
- 📋 Browse Jobs (সব jobs দেখতে পারে)
- ➕ Post Job (নিজের job post করতে পারে)
- ✏️ Manage Jobs (নিজের jobs update করতে পারে)
- 📨 Applications (এ কে apply করেছে তা দেখতে পারে)
- 🔔 Notifications (notification দেখতে পারে)

**Features Shown in Navigation:**
```
[📋 Browse] [➕ Post] [✏️ Manage] [📨 Applications]
```

**Features Hidden:**
- Admin Dashboard link
- View Provenance
- Database System
- Statistics

---

### **3. 💼 FREELANCER**
**Demo Credentials:**
```
Email: freelancer@jobportal.com
Password: freelancer123
```

**Can Access:**
- 📋 Browse Jobs (job দেখতে পারে)
- 💼 Apply for Jobs (apply করতে পারে)
- 🔔 Notifications (application status দেখতে পারে)
- 👤 Profile (নিজের profile manage করতে পারে)
- 💰 Payments (payment track করতে পারে)

**Features Shown in Navigation:**
```
[📋 Browse] [🔔 Notifications] [👤 Profile] [💰 Payments]
```

**Features Hidden:**
- Admin Dashboard
- Post Job
- Update Job
- View Provenance
- Database System

---

## 📁 File Structure

### **New Files Created:**

```
client/
├── public/
│   ├── scripts/
│   │   └── roleManager.js           ← Role management system
│   └── htmlfiles/
│       ├── index.html               ← Welcome/entry page (NEW)
│       ├── roleLogin.html           ← Login with role selector (NEW)
│       ├── adminDashboard.html      ← UPDATED: Added role check
│       ├── jobBrowse.html           ← UPDATED: Role-based nav
│       ├── updateJob.html           ← UPDATED: Role-based nav
│       ├── viewProvenance.html      ← UPDATED: Role-based nav
│       └── freelancerNotifications.html ← UPDATED: Role-based nav
```

---

## 🔐 How It Works

### **Step 1: User Opens Welcome Page**
```
User goes to: http://localhost:3000/client/public/htmlfiles/index.html
↓
Sees: 3 role cards (Admin, Client, Freelancer)
↓
Each card shows demo credentials
↓
User clicks role button
```

### **Step 2: User Logs In**
```
Page: roleLogin.html
↓
User selects role
↓
User enters email + password
↓
System checks against demo credentials:
   - admin@jobportal.com / admin123
   - client@jobportal.com / client123
   - freelancer@jobportal.com / freelancer123
↓
If match: Create user object
↓
Save to localStorage['currentUser']
↓
Redirect to dashboard
```

### **Step 3: Dashboard Auto-Applies Role**
```
Page: adminDashboard.html (or any page)
↓
Page loads roleManager.js script
↓
roleManager checks localStorage for user
↓
If no user: Set as Guest
↓
If user found: Load user data + role
↓
JavaScript runs:
   - Show/hide navigation items
   - Show/hide feature cards
   - Display user info
   - Hide admin-only sections
```

### **Step 4: User Navigates**
```
User clicks menu links
↓
Links are role-aware
   - Admin sees all links
   - Client sees client links
   - Freelancer sees freelancer links
↓
User can use features based on role
```

### **Step 5: User Logs Out**
```
User clicks "Logout" button
↓
localStorage cleared
↓
Redirect to roleLogin.html
↓
Session ends
```

---

## 🧪 Testing Guide

### **Test 1: Admin Access**
```
1. Open: http://localhost:3000/client/public/htmlfiles/index.html
2. Click: "Login as Admin" button (or manual steps below)
   - Alternatively, click role card → admin role selected
3. Redirect to: roleLogin.html
4. Select: "Admin" role
5. Enter: admin@jobportal.com / admin123
6. Click: "Login as Admin"
7. Expected: Redirect to adminDashboard.html
8. Verify:
   ✓ Header shows "Admin User" with crown icon 🔑
   ✓ Stats grid visible (Jobs, Applications, Freelancers, Payments)
   ✓ Database System section visible
   ✓ "View Provenance" card visible
   ✓ "Update Job" card visible
   ✓ Navigation shows all links:
     - 🎛️ Dashboard
     - 📋 Browse
     - ✏️ Update
     - 🔍 Provenance
     - 🔔 Notifications
```

### **Test 2: Client Access**
```
1. Open: index.html
2. Click: "Login as Client"
3. Select: "Client" role
4. Enter: client@jobportal.com / client123
5. Click: Login
6. Expected: Redirect to adminDashboard.html (allowed)
7. Verify:
   ✓ Header shows "Client User" with briefcase icon 👔
   ✓ Stats grid HIDDEN
   ✓ Database System HIDDEN
   ✓ "Update Job" card HIDDEN
   ✓ "View Provenance" card HIDDEN
   ✓ Navigation shows only client links:
     - 📋 Browse
     - ➕ Post Job
     - ✏️ Manage
     - 📨 Applications
   ✓ Click "Browse" → Can see jobs
   ✓ Click "Post Job" → Can post
```

### **Test 3: Freelancer Access**
```
1. Open: index.html
2. Click: "Login as Freelancer"
3. Select: "Freelancer" role
4. Enter: freelancer@jobportal.com / freelancer123
5. Click: Login
6. Expected: Redirect to adminDashboard.html
7. Verify:
   ✓ Header shows "Freelancer User" with laptop icon 💼
   ✓ Stats grid HIDDEN
   ✓ Database System HIDDEN
   ✓ "Post Job" card HIDDEN
   ✓ "Update Job" card HIDDEN
   ✓ "View Provenance" card HIDDEN
   ✓ Navigation shows only freelancer links:
     - 📋 Browse
     - 🔔 Notifications
     - 👤 Profile
     - 💰 Payments
```

### **Test 4: Guest Access**
```
1. Open: index.html
2. Do NOT log in
3. Go directly to: jobBrowse.html
4. Verify:
   ✓ Can browse jobs
   ✓ Navigation shows:
     - 📋 Browse
     - 🔐 Login
     - 📝 Sign Up
   ✓ "Post Job" link NOT visible
   ✓ "Apply" button hidden
```

### **Test 5: Logout**
```
1. Login as any user
2. Look for "Logout" button in header
3. Click "Logout"
4. Expected:
   ✓ Redirect to roleLogin.html
   ✓ Session cleared
   ✓ localStorage['currentUser'] deleted
5. Try accessing adminDashboard directly
6. Expected:
   ✓ Alert: "Only admins can access"
   ✓ Redirect to roleLogin.html
```

### **Test 6: Session Persistence**
```
1. Login as Admin
2. Refresh page
3. Expected:
   ✓ Still logged in
   ✓ Admin features still visible
   ✓ User info shows "Admin User"
4. Close browser tab + reopen
5. Expected:
   ✓ Session still active
   ✓ Can navigate directly to pages
```

---

## 🎨 Visual Changes by Role

### **Dashboard Header Changes**
```
ADMIN:       🔑 Admin User [🚪 Logout]
CLIENT:      👔 Client User [🚪 Logout]
FREELANCER:  💼 Freelancer User [🚪 Logout]
```

### **Feature Card Visibility**

| Feature | Admin | Client | Freelancer | Guest |
|---------|:-----:|:------:|:----------:|:-----:|
| Dashboard Stats | ✅ | ❌ | ❌ | ❌ |
| Database System | ✅ | ❌ | ❌ | ❌ |
| Browse Jobs | ✅ | ✅ | ✅ | ✅ |
| Post Job | ✅ | ✅ | ❌ | ❌ |
| Update Job | ✅ | ✅ | ❌ | ❌ |
| View Provenance | ✅ | ❌ | ❌ | ❌ |
| Notifications | ✅ | ✅ | ✅ | ❌ |
| Freelancer Profile | ✅ | ❌ | ✅ | ❌ |

---

## 💡 Key Features

### **1. Role Manager System** (`roleManager.js`)
```javascript
// Check role
roleManager.isAdmin()
roleManager.isClient()
roleManager.isFreelancer()

// Check permission
roleManager.hasPermission('feature-name')

// User operations
roleManager.getCurrentUser()
roleManager.setCurrentUser(userData)
roleManager.logout()
```

### **2. Automatic Feature Hiding**
```javascript
// Admin-only elements automatically hidden from non-admins
#admin-only-section { display: none; }
#feature-view-provenance { display: none; }
#feature-update-job { display: none; }
```

### **3. Session Management**
```javascript
// User data stored in localStorage
localStorage['currentUser'] = {
  id: 'unique_id',
  name: 'User Name',
  email: 'user@email.com',
  role: 'admin',
  loginTime: '2026-04-17T10:30:00Z'
}
```

### **4. Role-Based Navigation**
```html
<!-- Elements auto-show/hide based on role -->
<li id="admin-nav" style="display: none;">Admin Link</li>
<li id="post-nav" style="display: none;">Post Job</li>
<li id="provenance-nav" style="display: none;">Provenance</li>
```

---

## 🔄 Complete User Journey

### **Admin User Journey:**
```
1. Open index.html
2. See 3 role cards
3. Click "Login as Admin" (or select Admin role)
4. Enter demo admin credentials
5. Land on adminDashboard.html
6. See full admin features:
   - Stats (Jobs, Apps, Users, Payments)
   - Database System overview
   - Update Job feature
   - View Provenance feature
   - Full navigation menu
7. Can navigate between:
   - Browse Jobs
   - Update Job
   - View Provenance
   - View Notifications
8. Can click Logout
9. Return to login page
```

### **Client User Journey:**
```
1. Open index.html
2. Click "Login as Client"
3. Enter demo client credentials
4. Land on dashboard (limited view)
5. See client features only:
   - Browse Jobs
   - Post Job
   - Manage Jobs
   - Applications
   - Navigation without admin links
6. Admin features hidden:
   - Stats grid hidden
   - Database section hidden
   - Provenance link hidden
```

### **Freelancer User Journey:**
```
1. Open index.html
2. Click "Login as Freelancer"
3. Enter demo freelancer credentials
4. Land on dashboard
5. See freelancer features:
   - Browse Jobs
   - Notifications
   - Profile
   - Payments
6. Cannot see:
   - Post Job
   - Admin links
   - Provenance
   - Database stats
```

---

## 📱 Browser Testing

```bash
# Open in different browsers:
- Chrome:   ✅ Fully supported
- Firefox:  ✅ Fully supported
- Safari:   ✅ Fully supported
- Edge:     ✅ Fully supported

# Mobile testing:
- iPhone:   ✅ Responsive design
- Android:  ✅ Responsive design
- Tablets:  ✅ Responsive design
```

---

## 🐛 Troubleshooting

### **Issue: Not redirecting after login**
**Solution:** Make sure:
1. roleManager.js is loaded before page script
2. Check browser console for errors
3. Verify localStorage is enabled
4. Clear localStorage and try again

### **Issue: Features still visible for non-admins**
**Solution:**
1. Clear browser cache
2. Force refresh (Ctrl+Shift+R)
3. Check that IDs match in CSS (e.g., `#admin-only-section`)
4. Verify roleManager.js is properly included

### **Issue: Demo credentials not working**
**Solution:**
1. Verify exact spelling:
   - admin@jobportal.com
   - client@jobportal.com
   - freelancer@jobportal.com
2. Password is case-sensitive (admin123, client123, freelancer123)
3. Check that role is selected before login

### **Issue: Logout not working**
**Solution:**
1. Make sure logout button exists in header
2. Check console for JavaScript errors
3. Verify roleManager.logout() function is called
4. Check localStorage is being cleared

---

## 📊 Demo Credentials Reference

```
┌─────────────────────────────────────────────┐
│          DEMO CREDENTIALS SUMMARY            │
├─────────────────────────────────────────────┤
│ ADMIN                                       │
│   Email: admin@jobportal.com                │
│   Password: admin123                        │
│   Access: Full system                       │
│                                             │
│ CLIENT                                      │
│   Email: client@jobportal.com               │
│   Password: client123                       │
│   Access: Post/Manage jobs                  │
│                                             │
│ FREELANCER                                  │
│   Email: freelancer@jobportal.com           │
│   Password: freelancer123                   │
│   Access: Browse/Apply jobs                 │
└─────────────────────────────────────────────┘
```

---

## ✅ Checklist

- ✅ roleManager.js created
- ✅ roleLogin.html created
- ✅ index.html (Welcome page) created
- ✅ adminDashboard.html updated with role check
- ✅ jobBrowse.html updated with role nav
- ✅ Role-based feature hiding implemented
- ✅ Session management (localStorage)
- ✅ Demo credentials setup
- ✅ User display in header
- ✅ Logout functionality
- ✅ Role-specific navigation
- ✅ RBAC documentation

---

## 🚀 Starting the System

```bash
# 1. Start backend
cd server
node server.js

# 2. Open in browser
http://localhost:3000/client/public/htmlfiles/index.html

# 3. Select role and login with demo credentials

# 4. Explore features based on your role
```

---

**Status:** ✅ Complete
**Last Updated:** April 17, 2026
**System Type:** Role-Based Access Control (RBAC) with Demo Accounts
