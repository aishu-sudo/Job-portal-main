import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
    getAuth,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    sendPasswordResetEmail,
    signOut
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyD8RTED-Pc532DVq0JtL-s-85Tx7OCZXCQ",
    authDomain: "freelancing-job-portal-60da1.firebaseapp.com",
    projectId: "freelancing-job-portal-60da1",
    storageBucket: "freelancing-job-portal-60da1.appspot.com",
    messagingSenderId: "300920992917",
    appId: "1:300920992917:web:8980b888330e4af189579c"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Export the auth instance
export { auth };

const loginForm = document.getElementById("login-form");
const messageElement = document.getElementById("message");
const forgotPasswordBtn = document.getElementById("forgot-password");

function showMessage(text, type = "error") {
    if (!messageElement) return;
    messageElement.textContent = text;
    messageElement.style.color = type === "success" ? "green" : "red";
    messageElement.style.display = "block";
    setTimeout(() => (messageElement.style.display = "none"), 4000);
}

if (loginForm) {
    loginForm.addEventListener("submit", async(event) => {
        event.preventDefault();

        const email = document.getElementById("login-email").value.trim();
        const password = document.getElementById("login-password").value;

        if (!email || !password) {
            showMessage("❌ Please fill all fields!");
            return;
        }

        try {
            const { user } = await signInWithEmailAndPassword(auth, email, password);
            const userSnap = await getDoc(doc(db, "users", user.uid));

            if (!userSnap.exists()) {
                showMessage("❌ User data not found!");
                return;
            }

            const userData = userSnap.data();
            const role = (userData.userType || userData.role || "").toLowerCase();

            // Store user role in localStorage
            localStorage.setItem('userRole', role);
            localStorage.setItem('userId', user.uid);

            showMessage("✅ Login successful! Redirecting...", "success");

            setTimeout(() => {
                // Check if there's pending project data
                const pendingProjectData = localStorage.getItem('pendingProjectData');

                if (role === "client") {
                    if (pendingProjectData) {
                        // Clear the pending data and redirect to post-project section
                        localStorage.removeItem('pendingProjectData');
                        window.location.href = "clientDashboard.html?section=post-project";
                    } else {
                        window.location.href = "clientDashboard.html";
                    }
                } else if (role === "freelancer") {
                    window.location.href = "freelancerDashboard.html";
                } else {
                    window.location.href = "dashboard.html";
                }
            }, 1500);

        } catch (err) {
            console.error("Login error:", err);
            if (err.code === "auth/wrong-password") showMessage("❌ Incorrect password!");
            else if (err.code === "auth/user-not-found") showMessage("❌ User not found!");
            else showMessage("❌ Login failed!");
        }
    });
}

if (forgotPasswordBtn) {
    forgotPasswordBtn.addEventListener("click", async() => {
        const email = document.getElementById("login-email").value.trim();
        if (!email) return showMessage("❌ Enter your email first!");

        try {
            await sendPasswordResetEmail(auth, email);
            showMessage("✅ Reset email sent", "success");
        } catch (error) {
            showMessage("❌ Failed to send reset email");
        }
    });
}

setTimeout(() => {
    onAuthStateChanged(auth, (user) => {
        const protectedRoutes = ["clientDashboard.html", "freelancerDashboard.html"];
        const currentPage = window.location.pathname.split("/").pop();

        if (protectedRoutes.includes(currentPage) && !user) {
            window.location.href = "login.html";
        }
    });
}, 500);