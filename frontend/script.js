/* ══════════════════════════════════════════════════════════
   PLACEMENT PORTAL — FRONTEND SCRIPT
   Vanilla JS, uses fetch() to call Express REST API
   Enhanced: Bulk Processing, SP-backed operations, Role-based Access
   ══════════════════════════════════════════════════════════ */

const API = 'http://localhost:5001/api';

// ─── ROLE MANAGEMENT ──────────────────────────────────────────────
function getCurrentRole() {
    return sessionStorage.getItem('pp_role') || 'user';
}

function isAdmin() {
    return getCurrentRole() === 'admin';
}

function handleLogout() {
    sessionStorage.removeItem('pp_role');
    sessionStorage.removeItem('pp_user');
    window.location.href = 'login.html';
}

function initRoleUI() {
    const role = getCurrentRole();
    const user = sessionStorage.getItem('pp_user') || role;

    // Set role badge
    const badge = document.getElementById('roleBadge');
    if (badge) {
        badge.textContent = role === 'admin' ? '🛡️ Admin' : '👤 User';
        badge.className = `role-badge role-badge-${role}`;
    }

    // Hide admin-only elements for users
    document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = role === 'admin' ? '' : 'none';
    });

    // Hide admin-only sidebar nav items for users
    if (role !== 'admin') {
        // Hide Skills nav item for users (skill management is admin-only)
        const skillsNav = document.querySelector('[data-page="skills"]');
        if (skillsNav) skillsNav.style.display = 'none';
    }
}

// ─── NAVIGATION ──────────────────────────────────────────────
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', e => {
        e.preventDefault();
        const page = item.dataset.page;
        navigateTo(page, item.textContent.trim());
        // Close sidebar on mobile
        document.getElementById('sidebar').classList.remove('open');
    });
});

document.getElementById('menuBtn').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
});

function navigateTo(page, title) {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelector(`[data-page="${page}"]`).classList.add('active');
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${page}`).classList.add('active');
    document.getElementById('pageTitle').textContent = title || page;
    // Load data for the page
    const loaders = {
        dashboard: loadDashboard,
        students: loadStudents,
        skills: loadSkills,
        companies: loadCompanies,
        jobs: loadJobs,
        apply: loadApplyPage,
        applications: loadApplications,
        results: loadResults
    };
    if (loaders[page]) loaders[page]();
}

// ─── TOAST ───────────────────────────────────────────────────
function showToast(msg, type = 'info') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = `toast show ${type}`;
    setTimeout(() => t.classList.remove('show'), 3000);
}

// ─── TOGGLE FORM ─────────────────────────────────────────────
function toggleForm(id) {
    const el = document.getElementById(id);
    el.classList.toggle('hidden');
}

// ─── RENDER HELPERS ──────────────────────────────────────────
function renderTable(containerId, columns, rows, renderRow) {
    const container = document.getElementById(containerId);
    if (!rows || rows.length === 0) {
        container.innerHTML = `<div class="empty">No records found.</div>`;
        return;
    }
    const headers = columns.map(c => `<th>${c}</th>`).join('');
    const body = rows.map(renderRow).join('');
    container.innerHTML = `
        <div class="table-wrap">
          <table>
            <thead><tr>${headers}</tr></thead>
            <tbody>${body}</tbody>
          </table>
        </div>`;
}

function statusBadge(status) {
    const map = {
        'Pending': 'pending',
        'Selected': 'selected',
        'Rejected': 'rejected',
        'Placed': 'placed',
        'Not Placed': 'notplaced'
    };
    const cls = map[status] || 'pending';
    return `<span class="badge badge-${cls}">${status}</span>`;
}



// ─── DASHBOARD ───────────────────────────────────────────────
async function loadDashboard() {
    try {
        const [statsRes, branchRes] = await Promise.all([
            fetch(`${API}/placements/stats`),
            fetch(`${API}/placements/branch`)
        ]);
        const stats = await statsRes.json();
        const branch = await branchRes.json();

        if (stats.success) {
            const d = stats.data;
            document.getElementById('stat-students').textContent = d.total_students;
            document.getElementById('stat-placed').textContent = d.placed_students;
            document.getElementById('stat-companies').textContent = d.total_companies;
            document.getElementById('stat-jobs').textContent = d.total_jobs;
            document.getElementById('stat-apps').textContent = d.total_applications;
            document.getElementById('stat-cgpa').textContent = d.avg_cgpa;
            document.getElementById('stat-pkg').textContent = d.top_package || '—';
        }

        if (branch.success) {
            renderTable('branchTable',
                ['Branch', 'Total Students', 'Placed', 'Placement %'],
                branch.data,
                row => {
                    const pct = row.placement_pct || (row.total > 0 ? Math.round((row.placed / row.total) * 100) : 0);
                    return `<tr>
                        <td><strong>${row.branch}</strong></td>
                        <td>${row.total}</td>
                        <td style="color:var(--success);font-weight:600">${row.placed}</td>
                        <td>
                            <div style="display:flex;align-items:center;gap:10px">
                                <div style="flex:1;height:6px;background:var(--bg3);border-radius:99px;overflow:hidden">
                                    <div style="width:${pct}%;height:100%;background:var(--success);border-radius:99px"></div>
                                </div>
                                <span style="font-size:12px;color:var(--text2)">${pct}%</span>
                            </div>
                        </td>
                    </tr>`;
                }
            );
        }
    } catch (err) {
        showToast('Could not connect to API. Is the server running?', 'error');
    }
}

// ─── STUDENTS ────────────────────────────────────────────────
async function loadStudents() {
    const search = document.getElementById('studentSearch')?.value || '';
    const sortBy = document.getElementById('studentSort')?.value || '';
    const params = new URLSearchParams({ search, sortBy });
    const res = await fetch(`${API}/students?${params}`);
    const data = await res.json();

    renderTable('studentsTable',
        ['ID', 'Name', 'Email', 'Branch', 'CGPA', 'Year', 'Status', ...(isAdmin() ? ['Actions'] : [])],
        data.data,
        s => `<tr>
            <td style="color:var(--text2)">#${s.student_id}</td>
            <td><strong>${s.name}</strong></td>
            <td style="color:var(--text2)">${s.email}</td>
            <td>${s.branch}</td>
            <td><span style="color:${s.cgpa >= 8 ? 'var(--success)' : s.cgpa >= 6 ? 'var(--warning)' : 'var(--danger)'}; font-weight:700">${s.cgpa}</span></td>
            <td>${s.year}</td>
            <td>${statusBadge(s.placement_status || 'Not Placed')}</td>
            ${isAdmin() ? `<td>
                <button class="btn-sm btn-danger" onclick="deleteStudent(${s.student_id})">Delete</button>
            </td>` : ''}
        </tr>`
    );
}

async function addStudent() {
    if (!isAdmin()) return showToast('Admin access required', 'error');
    const payload = {
        name: document.getElementById('s_name').value.trim(),
        email: document.getElementById('s_email').value.trim(),
        branch: document.getElementById('s_branch').value.trim(),
        cgpa: parseFloat(document.getElementById('s_cgpa').value),
        year: parseInt(document.getElementById('s_year').value)
    };
    if (!payload.name || !payload.email || !payload.branch || isNaN(payload.cgpa) || isNaN(payload.year)) {
        return showToast('Please fill all fields', 'error');
    }
    const res = await fetch(`${API}/students`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json();
    showToast(data.message, data.success ? 'success' : 'error');
    if (data.success) {
        toggleForm('studentForm');
        loadStudents();
        ['s_name', 's_email', 's_branch', 's_cgpa', 's_year'].forEach(id => document.getElementById(id).value = '');
    }
}

async function deleteStudent(id) {
    if (!isAdmin()) return showToast('Admin access required', 'error');
    if (!confirm('Delete this student?')) return;
    const res = await fetch(`${API}/students/${id}`, { method: 'DELETE' });
    const data = await res.json();
    showToast(data.message, data.success ? 'success' : 'error');
    if (data.success) loadStudents();
}

// ─── SKILLS ──────────────────────────────────────────────────
async function loadSkills() {
    const res = await fetch(`${API}/skills`);
    const data = await res.json();
    if (!data.success) return;

    // Render skill chips
    const chips = data.data.map(sk =>
        `<span class="chip">${sk.skill_name} <span style="font-size:10px;opacity:0.6">(${sk.category || 'General'})</span></span>`
    ).join('');
    document.getElementById('skillsList').innerHTML = chips || '<span style="color:var(--text2);font-size:12px">No skills yet</span>';

    // Populate dropdowns
    const skillOpts = data.data.map(sk => `<option value="${sk.skill_id}">${sk.skill_name}</option>`).join('');
    document.getElementById('assign_skill').innerHTML = skillOpts;

    // Load students for dropdown
    const sRes = await fetch(`${API}/students`);
    const sData = await sRes.json();
    const sOpts = sData.data.map(s => `<option value="${s.student_id}">${s.name}</option>`).join('');
    document.getElementById('assign_student').innerHTML = sOpts;

    loadAssignedSkills();
}

async function addSkill() {
    const name = document.getElementById('skill_name').value.trim();
    if (!name) return showToast('Enter skill name', 'error');
    const res = await fetch(`${API}/skills`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ skill_name: name }) });
    const data = await res.json();
    showToast(data.message, data.success ? 'success' : 'error');
    if (data.success) { document.getElementById('skill_name').value = ''; loadSkills(); }
}

async function assignSkill() {
    const student_id = document.getElementById('assign_student').value;
    const skill_id = document.getElementById('assign_skill').value;
    if (!student_id || !skill_id) return showToast('Select student and skill', 'error');
    const res = await fetch(`${API}/skills/assign`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ student_id, skill_id }) });
    const data = await res.json();
    showToast(data.message, data.success ? 'success' : 'error');
    if (data.success) loadAssignedSkills();
}

async function loadAssignedSkills() {
    const sid = document.getElementById('assign_student')?.value;
    if (!sid) return;
    const res = await fetch(`${API}/skills/student/${sid}`);
    const data = await res.json();
    const chips = (data.data || []).map(sk =>
        `<span class="chip">${sk.skill_name} <span class="chip-remove" onclick="removeSkill(${document.getElementById('assign_student').value},${sk.skill_id})">×</span></span>`
    ).join('');
    document.getElementById('assignedSkills').innerHTML = chips || '<span style="color:var(--text2);font-size:12px">No skills assigned</span>';
}

document.addEventListener('change', e => {
    if (e.target.id === 'assign_student') loadAssignedSkills();
});

async function removeSkill(student_id, skill_id) {
    const res = await fetch(`${API}/skills/${student_id}/${skill_id}`, { method: 'DELETE' });
    const data = await res.json();
    showToast(data.message, data.success ? 'success' : 'error');
    if (data.success) loadAssignedSkills();
}

// ─── COMPANIES ───────────────────────────────────────────────
async function loadCompanies() {
    const res = await fetch(`${API}/companies`);
    const data = await res.json();
    renderTable('companiesTable',
        ['ID', 'Company Name', 'Location', 'Jobs Available'],
        data.data,
        c => `<tr>
            <td style="color:var(--text2)">#${c.company_id}</td>
            <td><strong>${c.company_name}</strong></td>
            <td>${c.location}</td>
            <td><button class="btn-sm btn-warn" onclick="navigateTo('jobs','Job Roles')">View Jobs</button></td>
        </tr>`
    );
}

async function addCompany() {
    if (!isAdmin()) return showToast('Admin access required', 'error');
    const payload = {
        company_name: document.getElementById('c_name').value.trim(),
        location: document.getElementById('c_location').value.trim()
    };
    if (!payload.company_name || !payload.location) return showToast('Fill all fields', 'error');
    const res = await fetch(`${API}/companies`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json();
    showToast(data.message, data.success ? 'success' : 'error');
    if (data.success) { toggleForm('companyForm'); loadCompanies(); }
}

// ─── JOBS ─────────────────────────────────────────────────────
async function loadJobs() {
    const res = await fetch(`${API}/companies/jobs`);
    const data = await res.json();
    renderTable('jobsTable',
        ['ID', 'Company', 'Location', 'Role', 'Min CGPA', 'Package (LPA)', 'Openings', 'Apps', ...(isAdmin() ? ['Actions'] : [])],
        data.data,
        j => `<tr>
            <td style="color:var(--text2)">#${j.job_id}</td>
            <td><strong>${j.company_name}</strong></td>
            <td style="color:var(--text2)">${j.location}</td>
            <td>${j.role}</td>
            <td><span style="color:var(--warning);font-weight:600">${j.min_cgpa}+</span></td>
            <td><span style="color:var(--success);font-weight:700">${j.package} LPA</span></td>
            <td>${j.selected_count || 0}/${j.openings}</td>
            <td>${j.application_count || 0}</td>
            ${isAdmin() ? `<td><button class="btn-sm btn-danger" onclick="deleteJobRole(${j.job_id})">Delete</button></td>` : ''}
        </tr>`
    );

    // Populate company dropdown in job form
    const cRes = await fetch(`${API}/companies`);
    const cData = await cRes.json();
    const opts = (cData.data || []).map(c => `<option value="${c.company_id}">${c.company_name}</option>`).join('');
    document.getElementById('j_company').innerHTML = opts;
}

async function addJobRole() {
    if (!isAdmin()) return showToast('Admin access required', 'error');
    const payload = {
        company_id: document.getElementById('j_company').value,
        role: document.getElementById('j_role').value.trim(),
        min_cgpa: parseFloat(document.getElementById('j_mincgpa').value),
        package: parseFloat(document.getElementById('j_package').value)
    };
    if (!payload.role || isNaN(payload.min_cgpa) || isNaN(payload.package)) return showToast('Fill all fields', 'error');
    const res = await fetch(`${API}/companies/jobs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json();
    showToast(data.message, data.success ? 'success' : 'error');
    if (data.success) { toggleForm('jobForm'); loadJobs(); }
}

async function deleteJobRole(id) {
    if (!isAdmin()) return showToast('Admin access required', 'error');
    if (!confirm('Delete this job role?')) return;
    const res = await fetch(`${API}/companies/jobs/${id}`, { method: 'DELETE' });
    const data = await res.json();
    showToast(data.message, data.success ? 'success' : 'error');
    if (data.success) loadJobs();
}

// ─── APPLY PAGE ───────────────────────────────────────────────
async function loadApplyPage() {
    const [sRes, jRes] = await Promise.all([fetch(`${API}/students`), fetch(`${API}/companies/jobs`)]);
    const sData = await sRes.json();
    const jData = await jRes.json();

    document.getElementById('apply_student').innerHTML =
        (sData.data || []).map(s => `<option value="${s.student_id}" data-cgpa="${s.cgpa}">${s.name} (CGPA: ${s.cgpa})</option>`).join('');
    document.getElementById('apply_job').innerHTML =
        (jData.data || []).map(j => `<option value="${j.job_id}" data-mincgpa="${j.min_cgpa}">${j.company_name} — ${j.role} (${j.package} LPA, Min: ${j.min_cgpa})</option>`).join('');

    checkEligibility();
}

function checkEligibility() {
    const sEl = document.getElementById('apply_student');
    const jEl = document.getElementById('apply_job');
    const box = document.getElementById('eligibilityBox');
    if (!sEl.value || !jEl.value) return;

    const cgpa = parseFloat(sEl.selectedOptions[0]?.dataset.cgpa);
    const minCgpa = parseFloat(jEl.selectedOptions[0]?.dataset.mincgpa);

    box.classList.remove('hidden', 'eligibility-ok', 'eligibility-fail');
    if (cgpa >= minCgpa) {
        box.classList.add('eligibility-ok');
        box.textContent = `✓ Eligible — Your CGPA ${cgpa} meets the minimum requirement of ${minCgpa}`;
    } else {
        box.classList.add('eligibility-fail');
        box.textContent = `✗ Not Eligible — Your CGPA ${cgpa} is below the minimum requirement of ${minCgpa}`;
    }
}

async function applyForJob() {
    const student_id = document.getElementById('apply_student').value;
    const job_id = document.getElementById('apply_job').value;
    if (!student_id || !job_id) return showToast('Select student and job', 'error');
    const res = await fetch(`${API}/applications`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ student_id, job_id }) });
    const data = await res.json();
    showToast(data.message, data.success ? 'success' : 'error');
}

// ─── APPLICATIONS ─────────────────────────────────────────────
async function loadApplications() {
    const res = await fetch(`${API}/applications`);
    const data = await res.json();
    renderTable('applicationsTable',
        ['#', 'Student', 'Branch', 'CGPA', 'Company', 'Role', 'Package', 'Applied', 'Status', ...(isAdmin() ? ['Actions'] : [])],
        data.data,
        a => `<tr>
            <td style="color:var(--text2)">${a.application_id}</td>
            <td><strong>${a.student_name}</strong><br><span style="font-size:11px;color:var(--text2)">${a.email}</span></td>
            <td>${a.branch}</td>
            <td style="color:${a.cgpa >= 8 ? 'var(--success)' : a.cgpa >= 6 ? 'var(--warning)' : 'var(--danger)'}; font-weight:600">${a.cgpa}</td>
            <td>${a.company_name}</td>
            <td>${a.role}</td>
            <td style="color:var(--success)">${a.package} LPA</td>
            <td style="color:var(--text2);font-size:12px">${new Date(a.applied_at).toLocaleDateString()}</td>
            <td>${statusBadge(a.status)}</td>
            ${isAdmin() ? `<td style="display:flex;gap:4px;flex-wrap:wrap">
                <button class="btn-sm btn-success" onclick="updateStatus(${a.application_id},'Selected')">✓</button>
                <button class="btn-sm btn-danger"  onclick="updateStatus(${a.application_id},'Rejected')">✗</button>
                <button class="btn-sm btn-warn"    onclick="updateStatus(${a.application_id},'Pending')">⊙</button>
            </td>` : ''}
        </tr>`
    );

    // Populate process form job dropdown
    const jRes = await fetch(`${API}/companies/jobs`);
    const jData = await jRes.json();
    const processJobEl = document.getElementById('process_job');
    if (processJobEl) {
        processJobEl.innerHTML = (jData.data || []).map(j =>
            `<option value="${j.job_id}">${j.company_name} — ${j.role} (${j.application_count || 0} apps)</option>`
        ).join('');
    }
}

async function updateStatus(id, status) {
    const res = await fetch(`${API}/applications/${id}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    const data = await res.json();
    showToast(data.message, data.success ? 'success' : 'error');
    if (data.success) loadApplications();
}

// ─── PROCESS APPLICATIONS (Cursor-based SP) ──────────────────
async function processApps() {
    if (!isAdmin()) return showToast('Admin access required', 'error');
    const job_id = document.getElementById('process_job').value;
    const min_cgpa_cutoff = parseFloat(document.getElementById('process_cutoff').value);
    if (!job_id || isNaN(min_cgpa_cutoff)) return showToast('Select job and enter cutoff', 'error');
    if (!confirm('This will auto-select/reject ALL pending applications for this job. Continue?')) return;

    const res = await fetch(`${API}/applications/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id, min_cgpa_cutoff })
    });
    const data = await res.json();
    showToast(data.message, data.success ? 'success' : 'error');
    if (data.success) {
        toggleForm('processForm');
        loadApplications();
    }
}

// ─── PLACEMENT RESULTS ────────────────────────────────────────
async function loadResults() {
    const res = await fetch(`${API}/placements`);
    const data = await res.json();
    renderTable('resultsTable',
        ['#', 'Student', 'Branch', 'CGPA', 'Company', 'Role', 'Package', 'Status', 'Date'],
        data.data,
        r => `<tr>
            <td style="color:var(--text2)">${r.result_id}</td>
            <td><strong>${r.student_name}</strong><br><span style="font-size:11px;color:var(--text2)">${r.email}</span></td>
            <td>${r.branch}</td>
            <td>${r.cgpa}</td>
            <td>${r.company_name}</td>
            <td>${r.role}</td>
            <td style="color:var(--success);font-weight:600">${r.package} LPA</td>
            <td>${statusBadge(r.final_status)}</td>
            <td style="color:var(--text2);font-size:12px">${new Date(r.recorded_at).toLocaleDateString()}</td>
        </tr>`
    );

    // Populate result form dropdowns
    const [sRes, jRes] = await Promise.all([fetch(`${API}/students`), fetch(`${API}/companies/jobs`)]);
    const sData = await sRes.json();
    const jData = await jRes.json();
    document.getElementById('r_student').innerHTML = (sData.data || []).map(s => `<option value="${s.student_id}">${s.name}</option>`).join('');
    document.getElementById('r_job').innerHTML = (jData.data || []).map(j => `<option value="${j.job_id}">${j.company_name} — ${j.role}</option>`).join('');
}

async function addResult() {
    if (!isAdmin()) return showToast('Admin access required', 'error');
    const payload = {
        student_id: document.getElementById('r_student').value,
        job_id: document.getElementById('r_job').value,
        final_status: document.getElementById('r_status').value
    };
    const res = await fetch(`${API}/placements`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json();
    showToast(data.message, data.success ? 'success' : 'error');
    if (data.success) { toggleForm('resultForm'); loadResults(); loadDashboard(); }
}



// ─── INIT ─────────────────────────────────────────────────────
initRoleUI();
loadDashboard();
