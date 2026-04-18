/**
 * Role-Based Access Control System
 * Manages user roles, authentication, and feature visibility
 */

class RoleManager {
    constructor() {
        this.roles = {
            ADMIN: 'admin',
            CLIENT: 'client',
            FREELANCER: 'freelancer',
            GUEST: 'guest'
        };

        this.currentUser = this.getCurrentUser();
        this.currentRole = this.currentUser ? .role || this.roles.GUEST;
    }

    /**
     * Get current user from localStorage
     */
    getCurrentUser() {
        const userJson = localStorage.getItem('currentUser');
        return userJson ? JSON.parse(userJson) : null;
    }

    /**
     * Set current user (on login)
     */
    setCurrentUser(userData) {
        localStorage.setItem('currentUser', JSON.stringify(userData));
        this.currentUser = userData;
        this.currentRole = userData.role;
        window.location.reload();
    }

    /**
     * Logout current user
     */
    logout() {
        localStorage.removeItem('currentUser');
        this.currentUser = null;
        this.currentRole = this.roles.GUEST;
        window.location.href = 'login.html';
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return this.currentUser !== null;
    }

    /**
     * Check user role
     */
    isAdmin() {
        return this.currentRole === this.roles.ADMIN;
    }

    isClient() {
        return this.currentRole === this.roles.CLIENT;
    }

    isFreelancer() {
        return this.currentRole === this.roles.FREELANCER;
    }

    isGuest() {
        return this.currentRole === this.roles.GUEST;
    }

    /**
     * Check permission for feature
     */
    hasPermission(feature) {
        const permissions = {
            // Admin only
            'view-all-jobs': [this.roles.ADMIN],
            'update-job': [this.roles.ADMIN, this.roles.CLIENT],
            'view-provenance': [this.roles.ADMIN],
            'view-database': [this.roles.ADMIN],
            'view-all-applications': [this.roles.ADMIN],
            'system-reports': [this.roles.ADMIN],

            // Client features
            'post-job': [this.roles.CLIENT],
            'manage-jobs': [this.roles.CLIENT],
            'view-own-applications': [this.roles.CLIENT],

            // Freelancer features
            'browse-jobs': [this.roles.FREELANCER, this.roles.CLIENT, this.roles.GUEST],
            'apply-job': [this.roles.FREELANCER],
            'view-notifications': [this.roles.FREELANCER],
            'view-profile': [this.roles.FREELANCER],
            'view-payments': [this.roles.FREELANCER],
        };

        const allowedRoles = permissions[feature] || [];
        return allowedRoles.includes(this.currentRole);
    }

    /**
     * Show/hide element based on role
     */
    showElement(elementId, feature) {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.display = this.hasPermission(feature) ? 'block' : 'none';
        }
    }

    /**
     * Redirect if unauthorized
     */
    requireRole(requiredRole) {
        if (this.currentRole !== requiredRole && this.currentRole !== this.roles.ADMIN) {
            alert(`❌ Access Denied! This page requires ${requiredRole} role.`);
            window.location.href = 'adminDashboard.html';
            return false;
        }
        return true;
    }

    /**
     * Get user display info
     */
    getUserDisplay() {
        if (!this.currentUser) {
            return {
                name: 'Guest',
                role: 'Guest',
                icon: '👤',
                initials: 'G'
            };
        }

        const roleIcons = {
            admin: '🔑',
            client: '👔',
            freelancer: '💼'
        };

        return {
            name: this.currentUser.name,
            role: this.currentRole.toUpperCase(),
            icon: roleIcons[this.currentRole] || '👤',
            initials: (this.currentUser.name || 'G').substring(0, 2).toUpperCase()
        };
    }

    /**
     * Get navigation for role
     */
    getNavigation() {
        const baseNav = [
            { label: '🏠 Home', href: 'adminDashboard.html', roles: ['admin', 'client', 'freelancer'] },
        ];

        const roleNav = {
            admin: [
                { label: '🎛️ Dashboard', href: 'adminDashboard.html' },
                { label: '📊 View Database', href: 'adminDashboard.html#database' },
                { label: '📜 Provenance', href: 'viewProvenance.html' },
                { label: '✏️ Update Job', href: 'updateJob.html' },
                { label: '📋 Browse Jobs', href: 'jobBrowse.html' },
            ],
            client: [
                { label: '📋 Browse Jobs', href: 'jobBrowse.html' },
                { label: '➕ Post Job', href: 'post-project.html' },
                { label: '✏️ Manage Jobs', href: 'updateJob.html' },
                { label: '📨 Applications', href: 'freelancerNotifications.html' },
            ],
            freelancer: [
                { label: '📋 Browse Jobs', href: 'jobBrowse.html' },
                { label: '🔔 Notifications', href: 'freelancerNotifications.html' },
                { label: '👤 Profile', href: 'freelancerProfile.html' },
                { label: '💰 Payments', href: 'freelancerNotifications.html#payments' },
            ],
            guest: [
                { label: '📋 Browse Jobs', href: 'jobBrowse.html' },
                { label: '🔐 Login', href: 'login.html' },
                { label: '📝 Sign Up', href: 'signup.html' },
            ]
        };

        return roleNav[this.currentRole] || roleNav.guest;
    }

    /**
     * Create navigation HTML
     */
    createNavigationHTML() {
        const nav = this.getNavigation();
        const user = this.getUserDisplay();

        let html = '<div class="nav-bar">';

        nav.forEach(item => {
            html += `<a href="${item.href}" class="nav-link">${item.label}</a>`;
        });

        html += `<div style="margin-left: auto; display: flex; gap: 10px; align-items: center;">`;
        html += `<span style="color: white; font-weight: 600;">${user.icon} ${user.name}</span>`;

        if (this.isAuthenticated()) {
            html += `<button class="nav-link" style="background: #dc3545; cursor: pointer;" onclick="roleManager.logout()">🚪 Logout</button>`;
        }

        html += `</div></div>`;

        return html;
    }
}

// Global instance
const roleManager = new RoleManager();

/**
 * Initialize role-based navigation on any page
 */
function initializeRoleBasedNav() {
    const existingNav = document.querySelector('.nav-bar');
    if (existingNav) {
        existingNav.innerHTML = roleManager.createNavigationHTML().replace('<div class="nav-bar">', '').replace('</div>', '');
    }
}

/**
 * Hide admin-only features
 */
function hideAdminFeatures() {
    if (!roleManager.isAdmin()) {
        // Hide admin-only cards
        const adminOnlyElements = [
            'feature-update-job',
            'feature-view-provenance',
            'stats-grid',
            'database-section',
            'admin-only-section'
        ];

        adminOnlyElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = 'none';
            }
        });

        // Hide update job page access
        const updateJobBtn = document.querySelector('[href="updateJob.html"]');
        if (updateJobBtn) {
            updateJobBtn.style.display = 'none';
        }

        const provenanceBtn = document.querySelector('[href="viewProvenance.html"]');
        if (provenanceBtn) {
            provenanceBtn.style.display = 'none';
        }
    }
}

/**
 * Show role-specific features
 */
function showRoleSpecificFeatures() {
    const user = roleManager.getUserDisplay();

    // Update header with user info
    const headerElements = document.querySelectorAll('.user-info, .current-user');
    headerElements.forEach(el => {
        el.innerHTML = `<strong>${user.icon} ${user.name}</strong> (${user.role})`;
    });

    if (roleManager.isAdmin()) {
        // Show all features for admin
        document.body.classList.add('role-admin');
    } else if (roleManager.isClient()) {
        // Show client features
        document.body.classList.add('role-client');
        hideElement('feature-view-provenance');
        hideElement('feature-update-job-advanced');
    } else if (roleManager.isFreelancer()) {
        // Show freelancer features
        document.body.classList.add('role-freelancer');
        hideElement('feature-post-job');
        hideElement('feature-view-provenance');
        hideElement('admin-only-section');
    } else {
        // Guest - limited features
        document.body.classList.add('role-guest');
        hideElement('feature-post-job');
        hideElement('feature-update-job');
        hideElement('feature-view-provenance');
        hideElement('admin-only-section');
    }
}

/**
 * Helper: hide element
 */
function hideElement(id) {
    const element = document.getElementById(id);
    if (element) {
        element.style.display = 'none';
    }
}

/**
 * Helper: show element
 */
function showElement(id) {
    const element = document.getElementById(id);
    if (element) {
        element.style.display = 'block';
    }
}

/**
 * Check access and redirect if needed
 */
function checkAccess(requiredRole) {
    if (!roleManager.isAuthenticated()) {
        alert('❌ Please login first');
        window.location.href = 'login.html';
        return false;
    }

    if (requiredRole && !roleManager.hasPermission(requiredRole)) {
        alert(`❌ Access Denied! You don't have permission to access this page.`);
        window.location.href = 'adminDashboard.html';
        return false;
    }

    return true;
}

// Auto-initialize on page load
window.addEventListener('DOMContentLoaded', () => {
    initializeRoleBasedNav();
    showRoleSpecificFeatures();
});