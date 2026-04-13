document.addEventListener("DOMContentLoaded", () => {

    document.getElementById("submitSignUpFreelancer").addEventListener("click", signupFreelancer);
    document.getElementById("submitSignUpClient").addEventListener("click", signupClient);

    async function signupFreelancer() {
        await signup("freelancer");
    }

    async function signupClient() {
        await signup("client");
    }

    async function signup(role) {
        const name = document.getElementById("firstName").value + " " +
            document.getElementById("lastName").value;

        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        if (!name || !email || !password) {
            alert("Please fill all fields !");
            return;
        }

        try {
            const res = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, role, password })
            });

            const data = await res.text();
            alert(data);
        } catch (err) {
            console.error("Signup Error", err);
        }
    }

});