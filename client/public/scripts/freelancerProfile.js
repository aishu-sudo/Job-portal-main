function openEditModal() {
    document.getElementById("editModal").style.display = "block";
}

function closeEditModal() {
    document.getElementById("editModal").style.display = "none";
}

function saveProfile() {
    let newName = document.getElementById("editName").value;
    let newLocation = document.getElementById("editLocation").value;
    let newAbout = document.getElementById("editAbout").value;
    let newPortfolio = document.getElementById("editPortfolio").value;

    if (newName) document.getElementById("name").innerText = newName;
    if (newLocation) document.getElementById("location").innerText = "📍 " + newLocation;
    if (newAbout) document.getElementById("about").innerText = newAbout;
    if (newPortfolio) document.getElementById("portfolio").href = newPortfolio;

    closeEditModal();
}

function addSkill() {
    let newSkill = document.getElementById("newSkill").value;
    if (newSkill) {
        let skillList = document.getElementById("skills");
        let newSkillItem = document.createElement("li");
        newSkillItem.innerHTML = `${newSkill} <span onclick="removeSkill(this)">❌</span>`;
        skillList.appendChild(newSkillItem);
        document.getElementById("newSkill").value = "";
    }
}

function removeSkill(element) {
    element.parentElement.remove();
}

document.getElementById("toggleTheme").addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
});