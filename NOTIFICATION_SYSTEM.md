# 🔔 Freelancer Notification System

## Overview

A comprehensive notification system for freelancers to track:
- ✅ Application updates (accepted/rejected/pending)
- ✅ Job status changes
- ✅ Payment notifications
- ✅ Unread notification count

---

## 📋 API Endpoints

### **1. Get All Notifications for Freelancer**
```http
GET /api/notifications/freelancer/:freelancerId
```

**Response:**
```json
{
  "freelancerId": 1,
  "totalNotifications": 5,
  "notifications": [
    {
      "type": "Application",
      "relatedId": 1,
      "jobTitle": "Website Design",
      "message": "Application status: accepted",
      "timestamp": "2026-04-17T10:30:00Z",
      "icon": "📋"
    },
    {
      "type": "Job Update",
      "relatedId": 1,
      "jobTitle": "Website Design",
      "message": "Job status changed to: in-progress",
      "timestamp": "2026-04-17T11:00:00Z",
      "icon": "🔄"
    },
    {
      "type": "Payment",
      "relatedId": 1,
      "jobTitle": "Website Design",
      "message": "Payment completed",
      "timestamp": "2026-04-17T12:00:00Z",
      "icon": "💰"
    }
  ]
}
```

---

### **2. Get Unread Notifications Count**
```http
GET /api/notifications/freelancer/:freelancerId/unread
```

**Response:**
```json
{
  "freelancerId": 1,
  "unreadNotifications": 3
}
```

---

### **3. Get Application Notifications**
```http
GET /api/notifications/freelancer/:freelancerId/applications
```

**Response:**
```json
{
  "freelancerId": 1,
  "totalApplications": 4,
  "applications": [
    {
      "applicationId": 1,
      "jobId": 1,
      "jobTitle": "Website Design",
      "budget": 5000,
      "jobStatus": "open",
      "applicationStatus": "accepted",
      "bidAmount": 4800,
      "proposal": "I have 5 years of experience...",
      "clientName": "Alice Johnson",
      "appliedDate": "2026-04-17T10:00:00Z",
      "message": "✅ Accepted: Website Design - Alice Johnson"
    }
  ]
}
```

---

### **4. Get Payment Notifications**
```http
GET /api/notifications/freelancer/:freelancerId/payments
```

**Response:**
```json
{
  "freelancerId": 1,
  "totalPayments": 2,
  "payments": [
    {
      "paymentId": 1,
      "jobId": 1,
      "jobTitle": "Website Design",
      "amount": 4800,
      "type": "freelancer_payout",
      "status": "completed",
      "transactionId": "TXN123456",
      "createdDate": "2026-04-17T12:00:00Z",
      "message": "Payment completed: $4800 for Website Design",
      "icon": "✅"
    }
  ]
}
```

---

### **5. Get Job Status Update Notifications**
```http
GET /api/notifications/freelancer/:freelancerId/jobs-status
```

**Response:**
```json
{
  "freelancerId": 1,
  "jobStatusUpdates": [
    {
      "jobId": 1,
      "title": "Website Design",
      "status": "in-progress",
      "budget": 5000,
      "category": "web-development",
      "clientName": "Alice Johnson",
      "totalApplicants": 5,
      "createdDate": "2026-04-17T10:00:00Z",
      "message": "Job \"Website Design\" is now in-progress",
      "icon": "⚙️"
    }
  ]
}
```

---

## 🖥️ Frontend Pages

### **Freelancer Notifications Page**
**URL:** `http://localhost:3000/client/public/htmlfiles/freelancerNotifications.html`

**Features:**
- 📌 All notifications in one place
- 📋 Filter by Applications
- 🔄 Filter by Job Updates
- 💰 Filter by Payments
- 🔔 Unread notification badge

**How to use:**
1. Enter your Freelancer ID
2. View all notifications
3. Switch between tabs to filter

---

## 🔄 Notification Types

### **Application Updates**
- ✅ **Accepted** - Your application was accepted by the client
- ❌ **Rejected** - Your application was rejected
- ⏳ **Pending** - Your application is waiting for client response

### **Job Updates**
- 🔓 **Open** - A job you applied for is still open
- ⚙️ **In-Progress** - A job you applied for is in progress
- ✅ **Completed** - A job you applied for is completed
- ❌ **Cancelled** - A job you applied for is cancelled

### **Payment Notifications**
- ✅ **Completed** - Payment has been completed
- ⏳ **Pending** - Payment is pending
- ❌ **Failed** - Payment failed
- 🔄 **Refunded** - Payment was refunded

---

## 📊 Data Structure

### **Notification Object**
```javascript
{
  type: String,           // "Application", "Job Update", "Payment"
  relatedId: Number,      // ID of related entity
  jobTitle: String,       // Job title
  message: String,        // Notification message
  timestamp: Date,        // When the notification was created
  icon: String            // Emoji icon
}
```

### **Application Notification**
```javascript
{
  applicationId: Number,
  jobId: Number,
  jobTitle: String,
  budget: Number,
  jobStatus: String,      // "open", "in-progress", "completed", "cancelled"
  applicationStatus: String, // "pending", "accepted", "rejected"
  bidAmount: Number,
  proposal: String,
  clientName: String,
  appliedDate: Date,
  message: String
}
```

### **Payment Notification**
```javascript
{
  paymentId: Number,
  jobId: Number,
  jobTitle: String,
  amount: Number,
  type: String,           // "freelancer_payout", "client_payment"
  status: String,         // "pending", "completed", "failed", "refunded"
  transactionId: String,
  errorMessage: String,   // If payment failed
  createdDate: Date,
  message: String,
  icon: String
}
```

---

## 🚀 Integration Examples

### **Get notifications for Freelancer ID 1**
```bash
curl http://localhost:3000/api/notifications/freelancer/1
```

### **Get unread count**
```bash
curl http://localhost:3000/api/notifications/freelancer/1/unread
```

### **Get only applications**
```bash
curl http://localhost:3000/api/notifications/freelancer/1/applications
```

### **Get only payments**
```bash
curl http://localhost:3000/api/notifications/freelancer/1/payments
```

### **Get job updates**
```bash
curl http://localhost:3000/api/notifications/freelancer/1/jobs-status
```

---

## 💡 Features

### **Smart Notifications**
- Real-time updates based on database queries
- Automatic filtering and sorting
- Timestamp tracking for all notifications
- Status badges for quick identification

### **User-Friendly Interface**
- Beautiful card-based layout
- Color-coded status indicators
- Tab-based organization
- Responsive design for mobile

### **Comprehensive Information**
- Job details (title, budget, category)
- Client information
- Application bid amount
- Payment transaction IDs
- Timestamp for each event

---

## 🔐 Notes

- Notifications are read from the main database tables
- No separate notification table required (uses existing data)
- Freelancer ID must be provided to view notifications
- Stored locally in browser (localStorage) for quick access
- Real-time status updates when page is refreshed

---

## 📚 Related Files

- **Backend Route:** `server/routes/notifications.js`
- **Frontend Page:** `client/public/htmlfiles/freelancerNotifications.html`
- **Server Integration:** `server/server.js` (added `/api/notifications`)

---

## ✅ What's Included

| Feature | Status |
|---------|--------|
| All Notifications | ✅ |
| Applications | ✅ |
| Job Updates | ✅ |
| Payments | ✅ |
| Unread Count | ✅ |
| Timestamps | ✅ |
| Status Filtering | ✅ |
| Responsive UI | ✅ |

---

## 🎯 Usage Flow

```
Freelancer opens notification page
↓
Enters their Freelancer ID
↓
System fetches notifications from database
↓
Displays in organized tabs
↓
Freelancer can filter by type
↓
Clicks on notification to see details
```

---

## 🔄 Auto-Refresh Option

To add auto-refresh (optional), add this to the page:

```javascript
// Refresh notifications every 30 seconds
setInterval(() => {
    if (freelancerId) {
        loadAllNotifications();
    }
}, 30000);
```

---

## 📞 Future Enhancements

- 📧 Email notifications
- 🔔 Browser push notifications
- 💬 In-app messaging system
- ⭐ Notification preferences/settings
- 🔄 Mark as read/unread functionality
- 🗑️ Notification history/archive
