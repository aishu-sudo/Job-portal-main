/**
 * Freelancer Notifications System
 * Handles fetching, displaying, and managing notifications
 */

class NotificationManager {
    constructor(freelancerId) {
        this.freelancerId = freelancerId;
        this.apiBase = (window.API_BASE !== undefined) ? window.API_BASE : 'http://localhost:5000';
        this.notificationsCache = [];
        this.newJobsCache = [];
        this.dismissedStorageKey = `dismissedFreelancerNotifications_${freelancerId}`;
        this.dismissedNotificationKeys = new Set(this.loadDismissedNotificationKeys());
    }

    /**
     * Load dismissed notification keys from localStorage
     */
    loadDismissedNotificationKeys() {
        try {
            const stored = localStorage.getItem(this.dismissedStorageKey);
            const parsed = stored ? JSON.parse(stored) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            console.warn('Failed to parse dismissed notifications:', error);
            return [];
        }
    }

    /**
     * Persist dismissed notification keys to localStorage
     */
    saveDismissedNotificationKeys() {
        try {
            localStorage.setItem(this.dismissedStorageKey, JSON.stringify(Array.from(this.dismissedNotificationKeys)));
        } catch (error) {
            console.warn('Failed to save dismissed notifications:', error);
        }
    }

    /**
     * Build a stable key for deduping and dismissing notifications
     */
    createNotificationKey(notification) {
        const type = notification.type || 'Notification';
        const relatedId = notification.relatedId ?? '';
        const title = notification.jobTitle || notification.title || '';
        const message = notification.message || '';
        return `${type}::${relatedId}::${title}::${message}`;
    }

    /**
     * Normalize API notifications and remove duplicates
     */
    normalizeAndDedupeNotifications(notifications = []) {
        const deduped = new Map();

        notifications.forEach(raw => {
            const normalized = {
                type: raw.type || 'Notification',
                relatedId: raw.relatedId ?? null,
                jobTitle: raw.jobTitle || raw.title || 'Notification',
                message: raw.message || '',
                timestamp: raw.timestamp || raw.createdAt || new Date().toISOString(),
                icon: raw.icon || '🔔'
            };

            const key = this.createNotificationKey(normalized);
            const existing = deduped.get(key);

            if (!existing || new Date(normalized.timestamp) > new Date(existing.timestamp)) {
                deduped.set(key, normalized);
            }
        });

        return Array.from(deduped.values()).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    /**
     * Clear all currently visible notifications for this freelancer
     */
    clearAllNotifications() {
        this.notificationsCache.forEach(notification => {
            this.dismissedNotificationKeys.add(this.createNotificationKey(notification));
        });
        this.notificationsCache = [];
        this.saveDismissedNotificationKeys();

        localStorage.setItem('freelancerNotifications', JSON.stringify([]));
        localStorage.setItem('freelancerNotificationCount', '0');
    }

    /**
     * Fetch all notifications for the freelancer
     */
    async fetchAllNotifications() {
        try {
            const response = await fetch(`${this.apiBase}/api/notifications/freelancer/${this.freelancerId}`);
            if (!response.ok) throw new Error('Failed to fetch notifications');
            const data = await response.json();
            const normalizedNotifications = this.normalizeAndDedupeNotifications(data.notifications || []);
            this.notificationsCache = normalizedNotifications.filter(notification =>
                !this.dismissedNotificationKeys.has(this.createNotificationKey(notification))
            );

            return {
                ...data,
                totalNotifications: this.notificationsCache.length,
                notifications: this.notificationsCache
            };
        } catch (error) {
            console.error('Error fetching notifications:', error);
            this.notificationsCache = [];
            return { notifications: [], totalNotifications: 0 };
        }
    }

    /**
     * Fetch new job postings
     */
    async fetchNewJobs() {
        try {
            const url = `${this.apiBase}/api/notifications/freelancer/${this.freelancerId}/new-jobs`;
            console.log(`📥 Fetching new jobs from: ${url}`);
            const response = await fetch(url);
            if (!response.ok) {
                console.error(`❌ Failed to fetch new jobs. Status: ${response.status}`);
                throw new Error('Failed to fetch new jobs');
            }
            const data = await response.json();
            console.log(`✅ New jobs fetched: ${data.newJobs.length} jobs found`, data.newJobs);
            this.newJobsCache = data.newJobs || [];
            return data;
        } catch (error) {
            console.error('❌ Error fetching new jobs:', error);
            return { newJobs: [], totalNewJobs: 0 };
        }
    }

    /**
     * Get only new job notifications
     */
    getNewJobNotifications() {
        return this.notificationsCache.filter(n => n.type === 'New Job');
    }

    /**
     * Get all notifications grouped by type
     */
    getNotificationsByType() {
        const grouped = {};
        this.notificationsCache.forEach(notification => {
            if (!grouped[notification.type]) {
                grouped[notification.type] = [];
            }
            grouped[notification.type].push(notification);
        });
        return grouped;
    }

    /**
     * Display notifications in a dropdown
     */
    displayNotificationsDropdown(containerId) {
            const container = document.getElementById(containerId);
            if (!container) return;

            const notifications = this.notificationsCache.slice(0, 50);
            const grouped = this.getNotificationsByType();
            const newJobCount = this.getNewJobNotifications().length;

            let html = `
            <div class="notification-header">
                <h3>Notifications 
                    ${newJobCount > 0 ? `<span class="badge" style="background: #ff5722; color: white; border-radius: 50%; padding: 2px 6px; font-size: 12px;">${newJobCount}</span>` : ''}
                </h3>
                <button class="mark-all-read" onclick="clearAllDashboardNotifications()">Clear All</button>
            </div>
        `;

        // Show new jobs first
        if (grouped['New Job'] && grouped['New Job'].length > 0) {
            html += '<div class="notification-category"><h4 style="padding: 10px 15px; background: #f0f7ff; margin: 0; border-bottom: 1px solid #ddd; font-weight: 600; color: #1976d2;">🆕 New Jobs</h4>';
            grouped['New Job'].forEach(notif => {
                const hasValidJobId = Number.isFinite(Number(notif.relatedId));
                html += `
                    <div class="notification-item unread" ${hasValidJobId ? `onclick="goToJobDetail(${Number(notif.relatedId)})"` : ''}>
                        <div class="notification-title">${notif.icon} ${notif.jobTitle}</div>
                        <div class="notification-message">${notif.message}</div>
                        <div class="notification-time">${formatTime(notif.timestamp)}</div>
                    </div>
                `;
            });
            html += '</div>';
        }

        // Show applications
        if (grouped['Application'] && grouped['Application'].length > 0) {
            html += '<div class="notification-category"><h4 style="padding: 10px 15px; background: #fff3e0; margin: 0; border-bottom: 1px solid #ddd; font-weight: 600; color: #f57c00;">📋 Applications</h4>';
            grouped['Application'].forEach(notif => {
                html += `
                    <div class="notification-item">
                        <div class="notification-title">${notif.icon} ${notif.jobTitle}</div>
                        <div class="notification-message">${notif.message}</div>
                        <div class="notification-time">${formatTime(notif.timestamp)}</div>
                    </div>
                `;
            });
            html += '</div>';
        }

        // Show other notifications
        const otherTypes = ['Job Update', 'Payment'];
        otherTypes.forEach(type => {
            if (grouped[type] && grouped[type].length > 0) {
                const icon = type === 'Payment' ? '💰' : '🔄';
                html += `<div class="notification-category"><h4 style="padding: 10px 15px; background: #e8f5e9; margin: 0; border-bottom: 1px solid #ddd; font-weight: 600; color: #388e3c;">${icon} ${type}</h4>`;
                grouped[type].forEach(notif => {
                    html += `
                        <div class="notification-item">
                            <div class="notification-title">${notif.icon} ${notif.jobTitle}</div>
                            <div class="notification-message">${notif.message}</div>
                            <div class="notification-time">${formatTime(notif.timestamp)}</div>
                        </div>
                    `;
                });
                html += '</div>';
            }
        });

        if (notifications.length === 0) {
            html += '<div style="padding: 20px; text-align: center; color: #999;">No notifications yet</div>';
        }

        container.innerHTML = html;
    }

    /**
     * Display new jobs section on page
     */
    displayNewJobsSection(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Use newJobsCache instead of notifications
        const newJobs = this.newJobsCache || [];
        
        console.log(`🎨 Displaying ${newJobs.length} new jobs in section: ${containerId}`);
        
        if (newJobs.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">No new jobs available at this time.</p>';
            return;
        }

        let html = `<h2 style="color: #e65100; display: flex; align-items: center; gap: 10px; margin: 0 0 20px 0;">
            <i class="fas fa-fire"></i> New Job Postings (${newJobs.length})
        </h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 15px;">`;

        newJobs.slice(0, 6).forEach(job => {
            html += `
                <div style="border-left: 4px solid #ff5722; cursor: pointer; background: white; padding: 15px; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); transition: transform 0.2s, box-shadow 0.2s;" 
                     onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.15)';"
                     onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.1)';"
                     onclick="goToJobDetail(${job.jobId})">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                        <h4 style="color: #0c2333; margin: 0; flex: 1; font-size: 14px;">${job.title}</h4>
                        <span style="background: #ff5722; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; white-space: nowrap; margin-left: 10px;">NEW</span>
                    </div>
                    <p style="color: #666; font-size: 13px; margin: 8px 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${job.description}</p>
                    <p style="color: #1976d2; font-weight: 600; margin: 10px 0; font-size: 14px;">$${job.budget}</p>
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #999;">
                        <span>${job.category}</span>
                        <span>${formatTime(job.postedDate)}</span>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
    }

    /**
     * Update notification badge count
     */
    async updateNotificationBadge(badgeElementId) {
        const badge = document.getElementById(badgeElementId);
        if (!badge) return;

        const data = await this.fetchAllNotifications();
        const newJobCount = this.getNewJobNotifications().length;
        
        if (newJobCount > 0) {
            badge.textContent = newJobCount;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }

    /**
     * Display new jobs notifications banner on browse page
     */
    displayNewJobsNotificationsBanner(containerId, badgeId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Use newJobsCache instead of notifications
        const newJobs = this.newJobsCache || [];
        
        if (newJobs.length === 0) {
            container.parentElement.style.display = 'none';
            return;
        }

        container.parentElement.style.display = 'block';
        
        // Update badge count
        const badge = document.getElementById(badgeId);
        if (badge) {
            badge.textContent = newJobs.length;
        }

        // Clear previous notifications
        container.innerHTML = '';

        // Display first 3 new job notifications
        newJobs.slice(0, 3).forEach(job => {
            const notifDiv = document.createElement('div');
            notifDiv.style.cssText = `
                background: white;
                padding: 12px;
                border-radius: 6px;
                border-left: 3px solid #ff5722;
                cursor: pointer;
                transition: background 0.2s, transform 0.2s;
                display: flex;
                justify-content: space-between;
                align-items: start;
                gap: 10px;
            `;
            
            notifDiv.onmouseover = () => {
                notifDiv.style.background = '#fff9f5';
                notifDiv.style.transform = 'translateX(4px)';
            };
            
            notifDiv.onmouseout = () => {
                notifDiv.style.background = 'white';
                notifDiv.style.transform = 'translateX(0)';
            };
            
            notifDiv.innerHTML = `
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: #e65100; margin-bottom: 4px;">${job.title}</div>
                    <div style="font-size: 13px; color: #666;">${job.description.substring(0, 80)}...</div>
                    <div style="font-size: 12px; color: #999; margin-top: 4px;">$${job.budget}</div>
                </div>
                <button onclick="goToJobDetail(${job.jobId})" style="background: #ff5722; color: white; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600; white-space: nowrap;">
                    View Job
                </button>
            `;
            
            container.appendChild(notifDiv);
        });
        
        // Show link to see more if there are more notifications
        if (newJobs.length > 3) {
            const moreLink = document.createElement('div');
            moreLink.style.cssText = 'text-align: center; margin-top: 10px;';
            moreLink.innerHTML = `<a href="#" onclick="showAllNewJobNotifications(event)" style="color: #ff5722; font-weight: 600; text-decoration: none; font-size: 13px;">+${newJobs.length - 3} more job alerts →</a>`;
            container.parentElement.appendChild(moreLink);
        }
    }

    /**
     * Create notification badge for header
     */
    createNotificationBadgeHTML() {
        const newJobCount = this.getNewJobNotifications().length;
        if (newJobCount === 0) return '';
        
        return `<span class="notification-badge-icon" style="
            display: inline-block;
            background: #ff5722;
            color: white;
            border-radius: 50%;
            width: 24px;
            height: 24px;
            line-height: 24px;
            text-align: center;
            font-size: 12px;
            font-weight: bold;
            margin-left: 5px;
        ">${newJobCount}</span>`;
    }

}

/**
 * Utility function to format time
 */
function formatTime(timestamp) {
    if (!timestamp) return 'Just now';
    
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return 'Just now';
    const now = new Date();
    const diff = Math.floor((now - date) / 1000); // difference in seconds

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    
    return date.toLocaleDateString();
}

/**
 * Utility function to navigate to job detail
 */
function goToJobDetail(jobId) {
    // If on freelancer dashboard, load in iframe; otherwise navigate directly
    const contentFrame = document.getElementById('contentFrame');
    const dashboardContent = document.getElementById('dashboardContent');
    if (contentFrame && dashboardContent) {
        dashboardContent.style.display = 'none';
        contentFrame.style.display = 'block';
        contentFrame.src = `jobBrowse.html?jobId=${jobId}`;
    } else {
        window.location.href = `jobBrowse.html?jobId=${jobId}`;
    }
}

/**
 * Initialize notifications on page load
 */
function initializeNotifications(freelancerId) {
    const notificationManager = new NotificationManager(freelancerId);
    
    window.notificationManager = notificationManager;
    
    // Fetch both all notifications AND new jobs
    Promise.all([
        notificationManager.fetchAllNotifications(),
        notificationManager.fetchNewJobs()
    ]).then(() => {
        const dropdownElement = document.getElementById('notificationDropdown') || document.getElementById('notification-dropdown');
        if (dropdownElement) {
            notificationManager.displayNotificationsDropdown(dropdownElement.id);
        }
        
        // Display new jobs section if element exists
        if (document.getElementById('new-jobs-section')) {
            notificationManager.displayNewJobsSection('new-jobs-section');
        }
        
        // Display notifications banner on browse page
        if (document.getElementById('new-job-notifications-list')) {
            notificationManager.displayNewJobsNotificationsBanner('new-job-notifications-list', 'new-job-badge');
        }
        
        const notificationBadge = document.getElementById('notification-badge') || document.querySelector('.notification-badge');
        if (notificationBadge) {
            const totalCount = notificationManager.notificationsCache.length;
            notificationBadge.textContent = totalCount;
            notificationBadge.style.display = totalCount > 0 ? 'flex' : 'none';
        }
        
        console.log(`✅ Notifications initialized. New jobs found: ${notificationManager.newJobsCache.length}`);
    });
    
    return notificationManager;
}

/**
 * Dashboard clear-all handler used by notification dropdown action
 */
function clearAllDashboardNotifications() {
    if (!window.notificationManager) return;

    window.notificationManager.clearAllNotifications();

    const dropdownElement = document.getElementById('notificationDropdown') || document.getElementById('notification-dropdown');
    if (dropdownElement) {
        window.notificationManager.displayNotificationsDropdown(dropdownElement.id);
    }

    const notificationBadge = document.getElementById('notification-badge') || document.querySelector('.notification-badge');
    if (notificationBadge) {
        notificationBadge.textContent = '0';
        notificationBadge.style.display = 'none';
    }
}

window.clearAllDashboardNotifications = clearAllDashboardNotifications;

/**
 * Show all new job notifications in a modal or expanded view
 */
function showAllNewJobNotifications(event) {
    event.preventDefault();
    if (!window.notificationManager) return;
    
    const newJobs = window.notificationManager.newJobsCache || [];
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 2000;
    `;
    
    let modalContent = `
        <div style="background: white; border-radius: 8px; width: 90%; max-width: 600px; max-height: 80vh; overflow-y: auto; padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0; color: #e65100;">🆕 All New Job Alerts (${newJobs.length})</h2>
                <button onclick="this.closest('[style*=position]').parentElement.removeChild(this.closest('[style*=position]'))" 
                        style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">×</button>
            </div>
    `;
    
    newJobs.forEach(job => {
        modalContent += `
            <div style="background: #fff3e0; padding: 15px; border-radius: 6px; border-left: 3px solid #ff5722; margin-bottom: 12px;">
                <h4 style="margin: 0 0 8px 0; color: #0c2333;">${job.title}</h4>
                <p style="margin: 0 0 8px 0; color: #666; font-size: 13px;">${job.description}</p>
                <div style="font-size: 12px; color: #999; margin-bottom: 10px;">Budget: $${job.budget} | Category: ${job.category}</div>
                <button onclick="goToJobDetail(${job.jobId}); this.closest('[style*=position]').parentElement.removeChild(this.closest('[style*=position]'))" 
                        style="background: #ff5722; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: 600;">
                    View Job Details
                </button>
            </div>
        `;
    });
    
    modalContent += '</div>';
    modal.innerHTML = modalContent;
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
    
    document.body.appendChild(modal);
}