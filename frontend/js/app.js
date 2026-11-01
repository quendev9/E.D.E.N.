const API_URL = '/api';

let currentFilter = 'All';
let deleteTargetId = null;

document.addEventListener('DOMContentLoaded', () => {
    fetchStats();
    fetchProjects();
    fetchLiveActivity();
    initDraggableDom();
});

async function fetchStats() {
    try {
        const res = await fetch(`${API_URL}/stats`);
        const stats = await res.json();
        const statTotal = document.getElementById('statTotal');
        const statActive = document.getElementById('statActive');
        const statCompleted = document.getElementById('statCompleted');
        const sysProjectCount = document.getElementById('sysProjectCount');

        if (statTotal) statTotal.innerText = stats.total || 0;
        if (statActive) statActive.innerText = stats.active || 0;
        if (statCompleted) statCompleted.innerText = stats.completed || 0;
        if (sysProjectCount) sysProjectCount.innerText = `${stats.total || 0} Projects`;
    } catch (err) {
        console.error('Failed to fetch stats:', err);
    }
}

async function fetchProjects() {
    const searchInput = document.getElementById('projectSearchInput');
    const searchQuery = searchInput ? searchInput.value.trim() : '';
    try {
        const res = await fetch(`${API_URL}/projects?status=${encodeURIComponent(currentFilter)}&search=${encodeURIComponent(searchQuery)}`);
        const projects = await res.json();
        renderProjects(projects);
    } catch (err) {
        console.error('Failed to fetch projects:', err);
    }
}

async function fetchLiveActivity() {
    try {
        const res = await fetch(`${API_URL}/projects`);
        const projects = await res.json();
        const timeline = document.getElementById('liveActivityTimeline');
        if (!timeline) return;

        timeline.innerHTML = '';
        if (!Array.isArray(projects) || projects.length === 0) {
            timeline.innerHTML = `<p style="color: var(--text-muted); font-size: 0.8rem;">No recent project activity logged.</p>`;
            return;
        }

        projects.slice(0, 5).forEach(p => {
            const item = document.createElement('div');
            item.className = 'timeline-item';
            item.innerHTML = `
                <span class="timeline-icon">📁</span>
                <div>
                    <strong>Project [${escapeHtml(p.status)}]</strong>
                    <p>${escapeHtml(p.title)} (${escapeHtml(p.category)})</p>
                    <small>Updated: ${escapeHtml(p.updated_at || 'Just now')}</small>
                </div>
            `;
            timeline.appendChild(item);
        });
    } catch (err) {
        console.error('Failed to fetch live activity:', err);
    }
}

function renderProjects(projects) {
    const grid = document.getElementById('projectsGrid');
    const emptyState = document.getElementById('emptyState');
    if (!grid) return;
    
    grid.innerHTML = '';

    if (!Array.isArray(projects) || projects.length === 0) {
        if (emptyState) emptyState.classList.remove('hidden');
        return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    projects.forEach(p => {
        const card = document.createElement('div');
        card.className = 'project-card';
        card.innerHTML = `
            <div>
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <span class="badge badge-${(p.status || 'Active').toLowerCase()}">${escapeHtml(p.status || 'Active')}</span>
                    <small style="color: var(--text-muted); font-size: 0.7rem;">${escapeHtml(p.category || 'General')}</small>
                </div>
                <h4 class="card-title">${escapeHtml(p.title || 'Untitled Project')}</h4>
                <p class="card-desc">${escapeHtml(p.description || 'No description provided.')}</p>
            </div>
            <div class="card-actions">
                <button class="btn btn-secondary btn-sm" onclick='openEditModal(${JSON.stringify(p).replace(/'/g, "&#39;")})'>Edit</button>
                <button class="btn btn-danger btn-sm" onclick="promptDelete(${p.id})">Delete</button>
            </div>
        `;
        grid.appendChild(card);
    });
}

function handleSearchFilter() {
    fetchProjects();
}

function setFilter(status, btnElement) {
    currentFilter = status;
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');
    fetchProjects();
}

function openCreateModal() {
    document.getElementById('modalTitle').innerText = 'New Engineering Project';
    document.getElementById('projectId').value = '';
    document.getElementById('projectForm').reset();
    document.getElementById('projectModal').classList.remove('hidden');
}

function openEditModal(project) {
    document.getElementById('modalTitle').innerText = 'Edit Engineering Project';
    document.getElementById('projectId').value = project.id;
    document.getElementById('title').value = project.title || '';
    document.getElementById('category').value = project.category || 'General Engineering';
    document.getElementById('status').value = project.status || 'Active';
    document.getElementById('problemStatement').value = project.problem_statement || '';
    document.getElementById('description').value = project.description || '';
    document.getElementById('projectModal').classList.remove('hidden');
}

async function saveProject(e) {
    e.preventDefault();
    const id = document.getElementById('projectId').value;
    const payload = {
        title: document.getElementById('title').value,
        category: document.getElementById('category').value,
        status: document.getElementById('status').value,
        problem_statement: document.getElementById('problemStatement').value,
        description: document.getElementById('description').value
    };

    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_URL}/projects/${id}` : `${API_URL}/projects`;

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (response.ok) {
            closeModal('projectModal');
            document.getElementById('projectForm').reset();
            document.getElementById('projectId').value = '';

            const searchInput = document.getElementById('projectSearchInput');
            if (searchInput) searchInput.value = '';
            currentFilter = 'All';
            document.querySelectorAll('.filter-btn').forEach(btn => {
                if (btn.innerText.trim() === 'All') btn.classList.add('active');
                else btn.classList.remove('active');
            });

            await fetchProjects();
            await fetchStats();
            await fetchLiveActivity();
        } else {
            console.error('Server returned error while saving project.');
        }
    } catch (err) {
        console.error('Error saving project:', err);
    }
}

function promptDelete(id) {
    deleteTargetId = id;
    document.getElementById('confirmDeleteBtn').onclick = executeDelete;
    document.getElementById('deleteModal').classList.remove('hidden');
}

async function executeDelete() {
    if (!deleteTargetId) return;
    try {
        await fetch(`${API_URL}/projects/${deleteTargetId}`, { method: 'DELETE' });
        closeModal('deleteModal');
        deleteTargetId = null;
        fetchProjects();
        fetchStats();
        fetchLiveActivity();
    } catch (err) {
        console.error('Error deleting project:', err);
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function switchView(viewName, element) {
    document.querySelectorAll('.sidebar .nav-item').forEach(item => item.classList.remove('active'));
    if (element) {
        element.classList.add('active');
    } else {
        document.querySelectorAll('.sidebar .nav-item').forEach(item => {
            if (item.innerText.includes(viewName)) item.classList.add('active');
        });
    }

    const cmdCenter = document.getElementById('viewCommandCenter');
    const dynamicView = document.getElementById('viewDynamic');
    const contentArea = document.getElementById('dynamicViewContent');

    if (viewName === 'Command Center' || viewName === 'Recent' || viewName === 'My Projects') {
        cmdCenter.classList.remove('hidden');
        dynamicView.classList.add('hidden');
        fetchProjects();
        fetchLiveActivity();
    } else {
        cmdCenter.classList.add('hidden');
        dynamicView.classList.remove('hidden');
        document.getElementById('dynamicViewTitle').innerText = viewName;
        document.getElementById('dynamicViewDesc').innerText = `${viewName} module active in EDEN ecosystem.`;
        
        // --- IDEA STUDIO ROUTE CONNECTION ---
        if (viewName === 'Idea Studio') {
            loadIdeaStudioView(contentArea);
        } else if (viewName === 'Simulation Lab') {
            contentArea.innerHTML = `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    <div style="background: var(--bg-main); padding: 16px; border-radius: 8px; border: 1px solid var(--border);">
                        <h4>Simulation Parameters</h4>
                        <div class="form-group" style="margin-top: 12px;">
                            <label>Input Voltage (V)</label>
                            <input type="number" value="12.0">
                        </div>
                        <div class="form-group">
                            <label>Load Resistance (Ω)</label>
                            <input type="number" value="45.0">
                        </div>
                        <button class="btn btn-primary" style="margin-top: 10px;" onclick="alert('Simulation executed successfully!')">Run Simulation</button>
                    </div>
                    <div style="background: var(--bg-main); padding: 16px; border-radius: 8px; border: 1px solid var(--border);">
                        <h4>Real-Time Telemetry</h4>
                        <p style="margin-top: 10px; font-size: 0.85rem; color: var(--text-muted);">System operating at nominal thresholds.</p>
                        <div style="margin-top: 20px; font-size: 1.2rem; font-weight: 700; color: var(--green-primary);">Efficiency: 94.2%</div>
                    </div>
                </div>
            `;
        } else {
            contentArea.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem;">Workspace module initialized and ready for engineering tasks.</p>`;
        }
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById('appSidebar');
    if (sidebar) {
        sidebar.classList.toggle('collapsed');
    }
}

function toggleTheme() {
    const html = document.documentElement;
    const btn = document.getElementById('themeToggleBtn');
    if (html.getAttribute('data-theme') === 'dark') {
        html.removeAttribute('data-theme');
        if (btn) btn.innerText = '☀️';
    } else {
        html.setAttribute('data-theme', 'dark');
        if (btn) btn.innerText = '🌙';
    }
}

// --- Draggable DOM AI Companion ---
function initDraggableDom() {
    const bubble = document.getElementById('domFloatingBubble');
    const chatWin = document.getElementById('domChatWindow');
    if (!bubble || !chatWin) return;

    let isDragging = false;
    let hasMoved = false;
    let startX, startY;
    let initialX, initialY;

    bubble.addEventListener('mousedown', (e) => {
        isDragging = true;
        hasMoved = false;
        startX = e.clientX;
        startY = e.clientY;

        const rect = bubble.getBoundingClientRect();
        initialX = rect.left;
        initialY = rect.top;

        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
            hasMoved = true;
        }

        let newX = initialX + dx;
        let newY = initialY + dy;

        bubble.style.left = `${newX}px`;
        bubble.style.top = `${newY}px`;
        bubble.style.right = 'auto';
        bubble.style.bottom = 'auto';

        chatWin.style.left = `${newX - 300}px`;
        chatWin.style.top = `${newY - 450}px`;
        chatWin.style.right = 'auto';
        chatWin.style.bottom = 'auto';
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
    });

    bubble.addEventListener('click', () => {
        if (!hasMoved) {
            toggleDomChat();
        }
    });
}

function toggleDomChat() {
    const chatWin = document.getElementById('domChatWindow');
    if (chatWin) {
        chatWin.classList.toggle('hidden');
    }
}

function sendAiPrompt(promptText) {
    const input = document.getElementById('aiInputText');
    if (input) {
        input.value = promptText;
        submitAiMessage();
    }
}

function handleAiKeyPress(e) {
    if (e.key === 'Enter') {
        submitAiMessage();
    }
}

function submitAiMessage() {
    const input = document.getElementById('aiInputText');
    if (!input || !input.value.trim()) return;
    const text = input.value.trim();
    input.value = '';

    const chatBody = document.getElementById('domChatBody');
    if (chatBody) {
        const userMsg = document.createElement('div');
        userMsg.className = 'chat-bubble';
        userMsg.style.background = 'var(--green-light)';
        userMsg.style.marginLeft = 'auto';
        userMsg.style.maxWidth = '85%';
        userMsg.innerText = text;
        chatBody.appendChild(userMsg);

        setTimeout(() => {
            const aiMsg = document.createElement('div');
            aiMsg.className = 'chat-bubble ai';
            aiMsg.innerText = `DOM analyzing query: "${text}". Systems online and ready to assist with your engineering workflow.`;
            chatBody.appendChild(aiMsg);
            chatBody.scrollTop = chatBody.scrollHeight;
        }, 500);

        chatBody.scrollTop = chatBody.scrollHeight;
    }
}