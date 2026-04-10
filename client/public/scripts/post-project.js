document.addEventListener('DOMContentLoaded', function() {
    const API_BASE_URL = 'http://localhost:5501';
    const form = document.getElementById('project-form');
    const descriptionInput = document.getElementById('project-description');
    const nextBtn = document.querySelector('.next-btn');

    // Autofill draft from query string (if redirected after login)
    const params = new URLSearchParams(window.location.search);
    const draft = params.get('draft');
    if (draft) {
        descriptionInput.value = decodeURIComponent(draft);
        postProject(draft); // Auto-submit after login
    }

    async function postProject(description) {
        nextBtn.disabled = true;
        nextBtn.textContent = 'Posting...';

        try {
            const csrfRes = await fetch(`${API_BASE_URL}/api/auth/csrf-token`, {
                credentials: 'include'
            });
            const { csrfToken } = await csrfRes.json();

            const res = await fetch(`${API_BASE_URL}/api/projects`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken
                },
                body: JSON.stringify({ description })
            });

            const result = await res.json();

            if (!res.ok || !result.success) {
                throw new Error(result.message || 'Project submission failed');
            }

            window.location.href = 'client-dashboard.html?success=true';

        } catch (err) {
            console.error('Project submission error:', err);
            alert(`Error: ${err.message}`);
        } finally {
            nextBtn.disabled = false;
            nextBtn.textContent = 'Next';
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();

        const description = descriptionInput.value.trim();
        if (!description) return alert('Description is required.');

        // Check if coming from index page
        const referrer = document.referrer;
        const isFromIndex = referrer.includes('index.html') || referrer.endsWith('/');

        try {
            const authCheck = await fetch(`${API_BASE_URL}/api/auth/check`, {
                credentials: 'include'
            });

            if (!authCheck.ok) {
                if (isFromIndex) {
                    // Store the project data and redirect to login if from index
                    localStorage.setItem('pendingProjectData', description);
                    window.location.href = 'login.html';
                } else {
                    // For client dashboard, just show error
                    alert('Please log in to post a project');
                }
                return;
            }

            // If logged in, post the project
            postProject(description);

        } catch (err) {
            console.error('Auth check error:', err);
            alert('Error checking authentication.');
        }
    }

    form.addEventListener('submit', handleSubmit);
});