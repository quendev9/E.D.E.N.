// --- Idea Studio Module ---

async function loadIdeaStudioView(contentArea) {
    contentArea.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <div>
                <h3 style="font-weight: 700; color: var(--text-primary);">Concept Incubator</h3>
                <p style="font-size: 0.85rem; color: var(--text-muted);">Capture unrefined concepts, raw notes, and sketches before promoting them into projects.</p>
            </div>
            <button class="btn btn-primary" onclick="openCreateIdeaModal()">+ New Concept</button>
        </div>

        <div id="ideasGrid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;">
            <p style="color: var(--text-muted); font-size: 0.85rem;">Loading concepts...</p>
        </div>
    `;
    await fetchIdeas();
}

async function fetchIdeas() {
    const grid = document.getElementById('ideasGrid');
    if (!grid) return;
    try {
        const res = await fetch('/api/ideas');
        const ideas = await res.json();
        
        grid.innerHTML = '';
        if (!Array.isArray(ideas) || ideas.length === 0) {
            grid.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem;">No concepts stored yet. Click <strong>+ New Concept</strong> to start brainstorming!</p>`;
            return;
        }

        ideas.forEach(idea => {
            const card = document.createElement('div');
            card.style.cssText = 'background: var(--bg-main); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 16px; display: flex; flex-direction: column; justify-content: space-between; gap: 12px;';
            
            const isPromoted = idea.status === 'Promoted';
            card.innerHTML = `
                <div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span class="badge ${isPromoted ? 'badge-completed' : 'badge-active'}">${escapeHtml(idea.status)}</span>
                        <small style="color: var(--text-muted); font-size: 0.7rem;">${escapeHtml(idea.category)}</small>
                    </div>
                    <h4 style="margin-top: 8px; font-weight: 700; color: var(--text-primary);">${escapeHtml(idea.title)}</h4>
                    <p style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.4; margin-top: 4px;">${escapeHtml(idea.raw_notes || 'No notes added.')}</p>
                    ${idea.tags ? `<div style="margin-top: 8px;"><span style="font-size: 0.65rem; background: var(--green-light); color: var(--green-primary); padding: 2px 6px; border-radius: 4px; font-weight: 600;">🏷️ ${escapeHtml(idea.tags)}</span></div>` : ''}
                </div>
                <div style="display: flex; justify-content: flex-end; gap: 6px; border-top: 1px solid var(--border); padding-top: 10px;">
                    ${!isPromoted ? `<button class="btn btn-primary btn-sm" onclick="promoteIdea(${idea.id})">🚀 Promote</button>` : ''}
                    <button class="btn btn-danger btn-sm" onclick="deleteIdea(${idea.id})">Delete</button>
                </div>
            `;
            grid.appendChild(card);
        });
    } catch (err) {
        console.error('Error fetching ideas:', err);
    }
}

function openCreateIdeaModal() {
    const title = prompt("Concept Title:");
    if (!title) return;
    const notes = prompt("Raw Notes / Brainstorming details:");
    const tags = prompt("Tags (comma separated):", "eco, mechanical");
    
    if (title.trim()) {
        saveIdea({ title: title.trim(), raw_notes: notes || '', tags: tags || '' });
    }
}

async function saveIdea(payload) {
    try {
        const res = await fetch('/api/ideas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) fetchIdeas();
    } catch (err) {
        console.error('Error saving idea:', err);
    }
}

async function promoteIdea(id) {
    if (!confirm("Promote this concept to an official Active Engineering Project?")) return;
    try {
        const res = await fetch(`/api/ideas/${id}/promote`, { method: 'POST' });
        if (res.ok) {
            alert("Success! Idea promoted to My Projects.");
            fetchIdeas();
            if (typeof fetchProjects === 'function') fetchProjects();
            if (typeof fetchStats === 'function') fetchStats();
        }
    } catch (err) {
        console.error('Error promoting idea:', err);
    }
}

async function deleteIdea(id) {
    if (!confirm("Delete this concept?")) return;
    try {
        await fetch(`/api/ideas/${id}`, { method: 'DELETE' });
        fetchIdeas();
    } catch (err) {
        console.error('Error deleting idea:', err);
    }
}