document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('login-form');

    form.addEventListener('submit', async(e) => {
        e.preventDefault();

        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;

        if (!email || !password) {
            alert('Please enter email and password.');
            return;
        }

        const submitBtn = form.querySelector('.login-btn');
        submitBtn.textContent = 'Logging in...';
        submitBtn.disabled = true;

        try {
            const res = await fetch(`${window.API_BASE}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();

            if (!res.ok) {
                alert(data.error || 'Login failed. Please check your credentials.');
                return;
            }

            localStorage.setItem('token', data.token);
            localStorage.setItem('userId', data.user.id);
            localStorage.setItem('userName', data.user.name);
            localStorage.setItem('userEmail', data.user.email);
            localStorage.setItem('userRole', data.user.role);

            if (data.user.role === 'admin') {
                window.location.href = '/htmlfiles/adminDashboard.html';
            } else if (data.user.role === 'freelancer') {
                window.location.href = '/htmlfiles/freelancerDashboard.html';
            } else {
                window.location.href = '/htmlfiles/clientDashboard.html';
            }
        } catch (err) {
            console.error('Login error:', err);
            alert('Connection error. Make sure the server is running on port 5000.');
        } finally {
            submitBtn.textContent = 'Log in';
            submitBtn.disabled = false;
        }
    });
});