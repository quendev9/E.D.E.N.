
 // -----------------------------------------
 // DOM ELEMENTS
 // -----------------------------------------

const modal = document.getElementById("project-modal");
const projectForm = document.getElementById("project-form");

const projectName = document.getElementById("project-name");
const projectDescription = document.getElementById("project-description");
const problemStatement = document.getElementById("problem-statement");

const modalTitle = document.getElementById("modal-title");
const formError = document.getElementById("form-error");

const totalProjects = document.getElementById("total-projects");
const activeProjects = document.getElementById("active-projects");

const recentProjects = document.getElementById("recent-projects");
const allProjects = document.getElementById("all-projects");

// Delete confirmation modal
const deleteModal = document.getElementById("delete-modal");
const deleteProjectName = document.getElementById("delete-project-name");

const confirmDeleteButton = document.getElementById("confirm-delete");
const cancelDeleteButton = document.getElementById("cancel-delete");
const closeDeleteModalButton = document.getElementById("close-delete-modal");


// -----------------------------------------
// APPLICATION STATE
// -----------------------------------------

let projects = [];
let editingProjectId = null;
let deletingProjectId = null;


// -----------------------------------------
// API COMMUNICATION
// -----------------------------------------

async function apiRequest(url, options = {}) {

    const response = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...options.headers
        }
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || "Something went wrong.");
    }

    return data;

}


// -----------------------------------------
// LOAD PROJECTS
// -----------------------------------------

async function loadProjects() {

    try {

        projects = await apiRequest("/api/projects");

        renderDashboard();
        renderProjects();

    } catch (error) {

        console.error("Could not load projects:", error);

    }

}


// -----------------------------------------
// RENDER DASHBOARD
// -----------------------------------------

function renderDashboard() {

    totalProjects.textContent = projects.length;

    activeProjects.textContent = projects.filter(
        project => project.status === "Active"
    ).length;

    const recent = projects.slice(0, 4);

    renderProjectCards(recent, recentProjects);

}


// -----------------------------------------
// RENDER ALL PROJECTS
// -----------------------------------------

function renderProjects() {

    renderProjectCards(projects, allProjects);

}


// -----------------------------------------
// PROJECT CARD GENERATOR
// -----------------------------------------

function renderProjectCards(projectList, container) {

    if (projectList.length === 0) {

        container.innerHTML = `
            <div class="empty-state">
                <h3>No projects yet</h3>
                <p>Create your first engineering project.</p>

                <button
                    class="primary-button"
                    data-action="create"
                >
                    Create Project
                </button>
            </div>
        `;

        return;

    }


    container.innerHTML = projectList.map(project => `

        <article class="project-card">

            <h3>${escapeHTML(project.name)}</h3>

            <p>
                ${escapeHTML(
                    project.description || "No description provided."
                )}
            </p>

            <div class="project-meta">

                <span class="project-status">
                    ${escapeHTML(project.status)}
                </span>

                <div class="project-actions">

                    <button
                        class="text-button"
                        data-action="edit"
                        data-id="${project.id}"
                    >
                        Open Project →
                    </button>

                    <button
                        class="text-button delete-button"
                        data-action="delete"
                        data-id="${project.id}"
                    >
                        Delete
                    </button>

                </div>

            </div>

        </article>

    `).join("");

}


// -----------------------------------------
// BASIC HTML ESCAPING
// -----------------------------------------

function escapeHTML(value) {

    return String(value).replace(/[&<>"']/g, character => {

        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        };

        return entities[character];

    });

}


// -----------------------------------------
// MODAL CONTROLS
// -----------------------------------------

function openCreateModal() {

    editingProjectId = null;

    modalTitle.textContent = "Create Project";

    projectForm.reset();

    formError.textContent = "";

    modal.classList.remove("hidden");

    projectName.focus();

}


function closeModal() {

    modal.classList.add("hidden");

    projectForm.reset();

    editingProjectId = null;

    formError.textContent = "";

}


function openEditModal(project) {

    editingProjectId = project.id;

    modalTitle.textContent = "Edit Project";

    projectName.value = project.name;
    projectDescription.value = project.description || "";
    problemStatement.value = project.problem_statement || "";

    formError.textContent = "";

    modal.classList.remove("hidden");

}


// -----------------------------------------
// CREATE / UPDATE PROJECT
// -----------------------------------------

projectForm.addEventListener("submit", async event => {

    event.preventDefault();

    const projectData = {
        name: projectName.value.trim(),
        description: projectDescription.value.trim(),
        problem_statement: problemStatement.value.trim()
    };


    if (!projectData.name) {

        formError.textContent = "Please enter a project name.";

        return;

    }


    const isEditing = editingProjectId !== null;

    const url = isEditing
        ? `/api/projects/${editingProjectId}`
        : "/api/projects";

    const method = isEditing ? "PUT" : "POST";


    try {

        await apiRequest(url, {
            method,
            body: JSON.stringify(projectData)
        });

        closeModal();

        await loadProjects();

    } catch (error) {

        formError.textContent = error.message;

    }

});


// -----------------------------------------
// DELETE PROJECT
// -----------------------------------------

function openDeleteModal(project) {

    deletingProjectId = project.id;

    deleteProjectName.textContent = project.name;

    deleteModal.classList.remove("hidden");

}


function closeDeleteModal() {

    deleteModal.classList.add("hidden");

    deletingProjectId = null;

}


async function deleteProject() {

    if (deletingProjectId === null) return;

    const projectId = deletingProjectId;

    confirmDeleteButton.disabled = true;

    try {

        await apiRequest(`/api/projects/${projectId}`, {
            method: "DELETE"
        });

        closeDeleteModal();

        await loadProjects();

    } catch (error) {

        console.error("Could not delete project:", error);

        alert(`Project deletion failed: ${error.message}`);

    } finally {

        confirmDeleteButton.disabled = false;

    }

}


// -----------------------------------------
// PROJECT CARD ACTIONS
// -----------------------------------------

document.addEventListener("click", event => {

    const button = event.target.closest("[data-action]");

    if (!button) return;

    const action = button.dataset.action;


    if (action === "create") {

        openCreateModal();

    }


    if (action === "edit") {

        const projectId = Number(button.dataset.id);

        const project = projects.find(
            item => item.id === projectId
        );

        if (project) {

            openEditModal(project);

        }

    }


    if (action === "delete") {

        const projectId = Number(button.dataset.id);

        const project = projects.find(
            item => item.id === projectId
        );

        if (project) {

            openDeleteModal(project);

        }

    }

});


// -----------------------------------------
// NAVIGATION
// -----------------------------------------

const navigationButtons = document.querySelectorAll(".nav-item");

const pages = {
    dashboard: document.getElementById("dashboard-page"),
    projects: document.getElementById("projects-page"),
    settings: document.getElementById("settings-page")
};


const pageTitles = {
    dashboard: "Command Center",
    projects: "Projects",
    settings: "Settings"
};


function navigateTo(pageName) {

    Object.entries(pages).forEach(([name, page]) => {

        page.classList.toggle("hidden", name !== pageName);

    });


    navigationButtons.forEach(button => {

        button.classList.toggle(
            "active",
            button.dataset.page === pageName
        );

    });


    document.getElementById("page-title").textContent =
        pageTitles[pageName];

}


navigationButtons.forEach(button => {

    button.addEventListener("click", () => {

        navigateTo(button.dataset.page);

    });

});


// -----------------------------------------
// BUTTON EVENTS
// -----------------------------------------

document.getElementById("new-project-btn")
    .addEventListener("click", openCreateModal);


document.getElementById("empty-create-btn")
    .addEventListener("click", openCreateModal);


document.getElementById("close-modal")
    .addEventListener("click", closeModal);


document.getElementById("cancel-modal")
    .addEventListener("click", closeModal);


document.getElementById("view-all-btn")
    .addEventListener("click", () => {

        navigateTo("projects");

    });


// Project modal overlay

modal.addEventListener("click", event => {

    if (event.target === modal) {

        closeModal();

    }

});


// Delete modal buttons

confirmDeleteButton.addEventListener("click", deleteProject);

cancelDeleteButton.addEventListener("click", closeDeleteModal);

closeDeleteModalButton.addEventListener("click", closeDeleteModal);


// Delete modal overlay

deleteModal.addEventListener("click", event => {

    if (event.target === deleteModal) {

        closeDeleteModal();

    }

});


// -----------------------------------------
// INITIALIZE APPLICATION
// -----------------------------------------

loadProjects();
