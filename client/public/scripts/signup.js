document.addEventListener("DOMContentLoaded", () => {
    console.log("Signup JS loaded");

    const togglePassword = document.querySelector('.toggle-password');
    const passwordInput = document.getElementById('password');

    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', () => {
            const isHidden = passwordInput.type === 'password';
            passwordInput.type = isHidden ? 'text' : 'password';
            togglePassword.querySelector('i').className = isHidden ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash';
        });
    }

    document.getElementById("submitSignUpFreelancer").addEventListener("click", () => signup("freelancer"));
    document.getElementById("submitSignUpClient").addEventListener("click", () => signup("client"));
    document.getElementById("submitSignUpAdmin").addEventListener("click", () => signup("admin"));

    async function signup(role) {
        const firstName = document.getElementById("firstName").value.trim();
        const lastName = document.getElementById("lastName").value.trim();
        const name = `${firstName} ${lastName}`.trim();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        if (!firstName || !email || !password) {
            alert("Please fill all required fields.");
            return;
        }

        if (password.length < 6) {
            alert("Password must be at least 6 characters.");
            return;
        }

        try {
            const res = await fetch(`${window.API_BASE}/api/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, role, password })
            });

            const data = await res.json();

            if (!res.ok) {
                alert(data.error || 'Signup failed.');
                return;
            }

            // Store auth info from response
            if (data.token) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('userId', data.user.id);
                localStorage.setItem('userName', data.user.name);
                localStorage.setItem('userEmail', data.user.email);
                localStorage.setItem('userRole', data.user.role);
            }

            alert(data.message || 'Registered successfully!');

            if (role === 'admin') {
                window.location.href = '/htmlfiles/adminDashboard.html';
            } else if (role === 'freelancer') {
                window.location.href = '/htmlfiles/freelancerDashboard.html';
            } else {
                window.location.href = '/htmlfiles/clientDashboard.html';
            }
        } catch (err) {
            console.error("Signup Error", err);
            alert('Connection error. Make sure the server is running on port 5000.');
        }
    }
});