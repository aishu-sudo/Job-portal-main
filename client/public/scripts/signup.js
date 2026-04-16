document.addEventListener("DOMContentLoaded", () => {

    console.log("🔥 JS FILE LOADED");

    document.getElementById("submitSignUpFreelancer")
        .addEventListener("click", signupFreelancer);

    document.getElementById("submitSignUpClient")
        .addEventListener("click", signupClient);

    async function signupFreelancer() {
        console.log("Freelancer clicked");
        await signup("freelancer");
    }

    async function signupClient() {
        console.log("Client clicked");
        await signup("client");
    }

    async function signup(role) {
        console.log("Signup running 🚀");

        const name = document.getElementById("firstName").value + " " +
            document.getElementById("lastName").value;

        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        if (!name || !email || !password) {
            alert("Please fill all fields !");
            return;
        }

        try {
            const res = await fetch('http://localhost:5000/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, role, password })
            });

            const data = await res.text();

            if (!res.ok) {
                alert('Signup failed: ' + data);
                return;
            }

            alert(data);

            if (role === 'freelancer') {
                window.location.href = '/htmlfiles/freelancerDashboard.html';
            } else if (role === 'client') {
                window.location.href = '/htmlfiles/clientDashboard.html';
            } else {
                window.location.href = '/htmlfiles/login.html';
            }
        } catch (err) {
            console.error("Signup Error", err);
            alert('Signup error. Check console for details.');
        }
    }

});