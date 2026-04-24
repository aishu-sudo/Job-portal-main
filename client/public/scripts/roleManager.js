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
            'view-all-jobs': [this.roles.ADMIN],
            'update-job': [this.roles.ADMIN, this.roles.CLIENT],
            'view-provenance': [this.roles.ADMIN],
            'view-database': [this.roles.ADMIN],
            'view-all-applications': [this.roles.ADMIN],
            'system-reports': [this.roles.ADMIN],
            'post-job': [this.roles.CLIENT],
            'manage-jobs': [this.roles.CLIENT],
            'view-own-applications': [this.roles.CLIENT],
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
            alert(`Access Denied! This page requires ${requiredRole} role.`);
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
            html += `<button class="nav-link" style="background: #dc3545; cursor: pointer;" onclick="roleManager.logout()">Logout</button>`;
        }

        html += `</div></div>`;

        return html;
    }
}

// Global instance
const roleManager = new RoleManager();