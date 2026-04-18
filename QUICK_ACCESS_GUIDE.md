# 🎯 Quick Access Guide - Job Portal

## 📱 Navigation Overview

এখন সব কিছু **একটি Central Hub** এর মধ্যে accessible:

### **Main Entry Point: Admin Dashboard**
```
URL: http://localhost:3000/client/public/htmlfiles/adminDashboard.html
```

---

## 🎛️ Admin Dashboard Features

### **What's on the Dashboard:**

#### **1. Quick Stats**
- 📋 Total Jobs
- 📝 Applications
- 👥 Freelancers
- 💰 Payments

#### **2. Main Features Grid** (কোথায় কী আছে)
- 📋 **Browse Jobs** → jobBrowse.html
- ➕ **Post New Job** → post-project.html
- ✏️ **Update Job** → updateJob.html (Status & Budget)
- 🔍 **View Provenance** → viewProvenance.html (Audit Trail)
- 🔔 **Notifications** → freelancerNotifications.html
- 👤 **Freelancer Profile** → freelancerProfile.html

#### **3. Database System Overview**
সরাসরি Database stats দেখতে পারবেন:
- 📋 Jobs count
- 📝 Applications count
- 👥 Users count
- 💰 Payments count
- 📜 Audit Logs
- 🔒 Provenance tracking

#### **4. Quick Actions Buttons**
সরাসরি access করুন:
- 🔍 Browse All Jobs
- ➕ Create Job
- ✏️ Update Job Status
- 📜 View Audit Trail
- 🔔 Notifications
- 📥 Download System Report

---

## 🌐 Navigation Bar

সব পৃষ্ঠায় **Top Navigation** আছে যেখান থেকে যেকোনো জায়গায় jump করতে পারবেন:

```
[🎛️ Dashboard] [📋 Browse] [✏️ Update] [🔍 Provenance] [🔔 Notifications]
```

### **Navigation Links:**

| Link | Page | What Can You Do |
|------|------|-----------------|
| 🎛️ Dashboard | adminDashboard.html | See overview, quick stats, system report |
| 📋 Browse | jobBrowse.html | Browse all jobs, search, filter, apply |
| ✏️ Update | updateJob.html | Update job status/budget, see audit trail |
| 🔍 Provenance | viewProvenance.html | View complete audit trail, WHO/WHAT/WHEN/WHY |
| 🔔 Notifications | freelancerNotifications.html | See application updates, payments, job changes |

---

## 📊 Complete Data Management Flow

```
Dashboard
    ↓
┌─────────────────────────────────────────────┐
│                                             │
├→ Browse Jobs → Apply → Check Status        │
├→ Post New Job → Update Status → View Trail │
├→ View Provenance → See All Changes         │
├→ Check Notifications → Applications/Payments│
└─────────────────────────────────────────────┘
```

---

## 🗂️ Database System Visibility

### **যা আপনি দেখতে পারবেন:**

#### **1. Jobs Table**
- Access via: Browse Jobs → jobBrowse.html
- Status: Open, In-Progress, Completed
- Budget information
- Category, description
- Posted date

#### **2. Applications Table**
- Access via: Notifications → freelancerNotifications.html (Applications tab)
- Status: Pending, Accepted, Rejected
- Bid amount
- Freelancer proposal

#### **3. Payments Table**
- Access via: Notifications → freelancerNotifications.html (Payments tab)
- Type: Freelancer payout, Client payment
- Status: Completed, Failed, Pending
- Transaction ID
- Amount

#### **4. Users Table**
- Access via: Admin Dashboard (stats overview)
- Freelancers count
- Clients count

#### **5. Audit/Provenance Tables**
- Access via: View Provenance → viewProvenance.html
- All changes tracked (INSERT/UPDATE)
- WHO changed WHAT
- WHEN it changed
- WHY it changed (with reason)
- Complete timeline

---

## 🔍 Provenance Queries (আপনার কাছে যা information থাকবে)

### **Tab 1: Complete Audit Trail**
```
Shows: All changes (INSERT, UPDATE) with timestamps
Example: Job created → Status changed → Budget updated
```

### **Tab 2: Status Changes (HOW-Provenance)**
```
Shows: open → in-progress → completed
Tells: How the job status evolved
```

### **Tab 3: Budget Changes (WHY-Provenance)**
```
Shows: $5000 → $6000 → $5500
Tells: Why budget is what it is
```

### **Tab 4: Actions Summary (WHERE-Provenance)**
```
Shows: User1 - 5 actions, User2 - 3 actions
Tells: Who did what (accountability)
```

### **Tab 5: Global Audit Log**
```
Shows: All jobs' all changes
Tells: System-wide provenance
```

---

## 📲 Quick Start - যেভাবে শুরু করবেন

### **Step 1: Open Dashboard**
```
http://localhost:3000/client/public/htmlfiles/adminDashboard.html
```

### **Step 2: এখান থেকে যেখানে চান যান**

**If you want to:**
- ✅ See all jobs → Click "Browse Jobs" or use nav bar "📋 Browse"
- ✅ Create new job → Click "Post New Job"
- ✅ Change job status → Click "Update Job Status" or nav bar "✏️ Update"
- ✅ View who changed what → Click "View Audit Trail" or nav bar "🔍 Provenance"
- ✅ See notifications → Click "Notifications" or nav bar "🔔 Notifications"
- ✅ Check database stats → Look at "Database System" section on dashboard

---

## 🔐 Data You Can Access

### **Without ID:**
- Browse all jobs
- Browse all freelancers
- Browse all applications
- View system-wide audit log

### **With Freelancer ID:**
- View your notifications
- Check your applications
- See payment status

### **With Job ID:**
- View complete audit trail
- See status change history
- See budget change history
- See who made changes

---

## 🚀 API Endpoints (Backend)

### **Job Browse**
```
GET /api/jobs/browse
Returns: All jobs with details
```

### **Update Job**
```
PUT /api/jobs/:jobId/status
PUT /api/jobs/:jobId/budget
```

### **Provenance Queries**
```
GET /api/jobs/:jobId/audit/complete        (Complete audit)
GET /api/jobs/:jobId/audit/status-history  (HOW)
GET /api/jobs/:jobId/audit/budget-history  (WHY)
GET /api/jobs/:jobId/audit/actions-summary (WHERE)
GET /api/jobs/audit/all-jobs               (Global)
```

### **Notifications**
```
GET /api/notifications/freelancer/:freelancerId
GET /api/notifications/freelancer/:freelancerId/applications
GET /api/notifications/freelancer/:freelancerId/payments
GET /api/notifications/freelancer/:freelancerId/jobs-status
GET /api/notifications/freelancer/:freelancerId/unread
```

---

## 📋 Features Checklist

| Feature | Access | Status |
|---------|--------|--------|
| View all jobs | Dashboard / Browse | ✅ |
| Post job | Dashboard / Post New Job | ✅ |
| Update job | Dashboard / Update / updateJob.html | ✅ |
| View provenance | Dashboard / Provenance / viewProvenance.html | ✅ |
| See notifications | Dashboard / Notifications / freelancerNotifications.html | ✅ |
| Download report | Dashboard / Quick Actions | ✅ |
| Browse database | Dashboard / Database System | ✅ |
| Global audit log | Provenance viewer / Tab 5 | ✅ |

---

## 💡 Pro Tips

1. **Bookmark the Dashboard**: Save adminDashboard.html for quick access
2. **Use Dropdown in Provenance**: Job ID dropdown makes it easy to select
3. **Enter Freelancer ID in Notifications**: Save your ID in localStorage
4. **Check Quick Stats**: Dashboard updates stats in real-time
5. **Download Report**: Generate system report from Dashboard

---

## 🎯 Everything is Connected

```
Admin Dashboard (Central Hub)
    ↓
    ├→ Database System (See all data)
    ├→ Quick Stats (Jobs, Apps, Users, Payments)
    ├→ Quick Actions (Fast access)
    ├→ Feature Cards (Detailed access)
    └→ Navigation Bar (Available on all pages)
        ├→ Browse Jobs
        ├→ Update Job
        ├→ View Provenance (Complete audit trail)
        ├→ Notifications (Real-time updates)
        └→ Back to Dashboard
```

---

## 📞 Support

**Issues?** Check:
1. Backend running: `node server.js`
2. Database connected
3. API endpoints working
4. JavaScript console for errors
5. Database queries executing

---

**Created:** April 17, 2026
**System:** Provenance-Enabled RDBMS Job Portal
**Status:** ✅ Fully Integrated and Operational
