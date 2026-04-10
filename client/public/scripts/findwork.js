export function setupWorkTabs() {
    document.addEventListener('DOMContentLoaded', function() {
        // Tab functionality
        const options = document.querySelectorAll('.category-option');
        const workSections = document.querySelectorAll('.work-section');

        if (options.length && workSections.length) {
            // Set up tab click functionality
            options.forEach(option => {
                option.addEventListener('click', function() {
                    // Remove active class from all tabs
                    options.forEach(opt => opt.classList.remove('active'));
                    // Add active to clicked tab
                    this.classList.add('active');

                    // Get target (skills/languages)
                    const target = this.getAttribute('data-target');

                    // Hide all sections
                    workSections.forEach(section => section.classList.remove('active'));

                    // Show the matching section
                    const activeSection = document.querySelector(`.work-section.${target}-section`);
                    if (activeSection) activeSection.classList.add('active');
                });
            });

            // Top Rated Jobs scroll functionality
            const trigger = document.getElementById('top-rated-jobs-link');
            const target = document.getElementById('top-rated-jobs-section');

            if (trigger && target) {
                trigger.addEventListener('click', function(e) {
                    // Prevent conflict with tab functionality
                    if (e.target.closest('.category-option[data-target="toprated"]')) {
                        e.stopPropagation();
                    }
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                });
            } else {
                console.error('Scroll elements not found:', !trigger ? '#top-rated-jobs-link missing' : '', !target ? '#top-rated-jobs-section missing' : '');
            }

            // Activate the default tab on load
            const defaultOption = document.querySelector('.category-option[data-target="skills"]');
            if (defaultOption) {
                defaultOption.click();
            }
        }
    });
}