// hirefreelancer.js
export function loadHireTab() {
    document.addEventListener('DOMContentLoaded', async function() {
        // Tab switching logic
        const options = document.querySelectorAll('.option');
        const contentSections = document.querySelectorAll('.content-section');

        options.forEach(option => {
            option.addEventListener('click', async function() {
                options.forEach(opt => opt.classList.remove('active'));
                this.classList.add('active');

                const target = this.dataset.target;
                contentSections.forEach(section => section.classList.remove('active'));
                const activeSection = document.querySelector(`.${target}-section`);
                if (activeSection) activeSection.classList.add('active');

                // Load data based on selected tab
                if (target === 'skills') {
                    await loadFreelancersBySkill();
                } else if (target === 'location') {
                    await loadFreelancersByLocation();
                }
            });
        });

        // Initialize with skills tab
        const defaultOption = document.querySelector('.option[data-target="skills"]');
        if (defaultOption) {
            defaultOption.classList.add('active');
            await loadFreelancersBySkill();
        }
    });
}

async function loadFreelancersBySkill() {
    try {
        const response = await fetch('/api/freelancers?limit=6');
        const { data: freelancers } = await response.json();
        renderFreelancers(freelancers);
    } catch (error) {
        console.error('Error loading freelancers:', error);
    }
}

async function loadFreelancersByLocation() {
    // Similar implementation for location-based filtering
}

function renderFreelancers(freelancers) {
    const container = document.querySelector('.freelancers-container');
    if (!container) return;

    container.innerHTML = freelancers.map(freelancer => `
        <div class="freelancer-card">
            <img src="${freelancer.profilePicture || 'default-profile.jpg'}" alt="${freelancer.name}">
            <h3>${freelancer.name}</h3>
            <div class="skills">
                ${freelancer.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
            </div>
            <p class="location"><i class="fas fa-map-marker-alt"></i> ${freelancer.location}</p>
            <p class="rating">${freelancer.rating} ★</p>
            <button class="hire-btn" data-id="${freelancer._id}">Hire Now</button>
        </div>
    `).join('');

    // Add event listeners to hire buttons
    document.querySelectorAll('.hire-btn').forEach(button => {
        button.addEventListener('click', initiateHireProcess);
    });
}

function initiateHireProcess(event) {
    const freelancerId = event.target.dataset.id;
    // Implement hiring logic or redirect to hiring page
    console.log('Initiating hire process for:', freelancerId);
}