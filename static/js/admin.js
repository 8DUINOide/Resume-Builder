// ===========================================
//  ARTEX ADMIN LOGIC
//  Firestore order management, admin auth
// ===========================================

// --- Firebase Configuration ---
// Must match the main app configuration
const firebaseConfig = {
    apiKey: "AIzaSyCqxKzBeqcqVu61oGJGvqpOeJE85vHD9IU",
    authDomain: "resume-builder-57506.firebaseapp.com",
    projectId: "resume-builder-57506",
    storageBucket: "resume-builder-57506.firebasestorage.app",
    messagingSenderId: "913860230219",
    appId: "1:913860230219:web:c4f33ba46a14436c2961ce"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

// Admin access is now determined by the "role" field in the Firestore "users" collection.
// Set a user's role to "ADMIN" in Firestore to grant admin access.

// --- State ---
let currentAdmin = null;
let ordersList = [];
let currentFilter = 'all';
let unsubscribeOrders = null;
let selectedOrder = null;

// --- DOM Elements ---
const loginScreen = document.getElementById('admin-login');
const adminShell = document.getElementById('admin-shell');
const btnLogin = document.getElementById('btn-admin-login');
const btnLogout = document.getElementById('btn-admin-logout');
const accessDenied = document.getElementById('admin-access-denied');
const adminEmailDisplay = document.getElementById('admin-email');

const searchInput = document.getElementById('search-input');
const btnSearch = document.getElementById('btn-search');
const filterBtns = document.querySelectorAll('.filter-btn');

const tbody = document.getElementById('orders-tbody');
const spinner = document.getElementById('loading-spinner');
const emptyState = document.getElementById('empty-state');

// Details modal
const detailOverlay = document.getElementById('order-detail-overlay');
const btnCloseDetail = document.getElementById('btn-close-detail');
const detailRefId = document.getElementById('detail-ref-id');
const detailName = document.getElementById('detail-name');
const detailEmail = document.getElementById('detail-email');
const detailPhone = document.getElementById('detail-phone');
const detailTemplate = document.getElementById('detail-template');
const detailDate = document.getElementById('detail-date');
const detailStatus = document.getElementById('detail-status');
const adminPreviewInner = document.getElementById('admin-preview-inner');

// Actions
const btnMarkPaid = document.getElementById('btn-mark-paid');
const btnPrint = document.getElementById('btn-print-resume');
const btnMarkFulfilled = document.getElementById('btn-mark-fulfilled');
const btnDelete = document.getElementById('btn-delete-order');
const btnEditResume = document.getElementById('btn-edit-resume');

// Edit modal
const editOverlay = document.getElementById('edit-resume-overlay');
const btnCloseEdit = document.getElementById('btn-close-edit');
const btnSaveEdit = document.getElementById('btn-save-edit');

// Stats
const statPending = document.getElementById('stat-pending');
const statFulfilled = document.getElementById('stat-fulfilled');
const statTotal = document.getElementById('stat-total');

// ===========================================
//  AUTH LOGIC (Role-based from Firestore)
// ===========================================
btnLogin.addEventListener('click', async () => {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        await auth.signInWithPopup(provider);
    } catch (error) {
        console.error('Sign-in error:', error);
    }
});

btnLogout.addEventListener('click', async () => {
    if (unsubscribeOrders) unsubscribeOrders();
    await auth.signOut();
});

auth.onAuthStateChanged(async (user) => {
    if (user) {
        try {
            // Check the user's role from Firestore "users" collection
            const userDoc = await db.collection('users').doc(user.uid).get();
            const userData = userDoc.exists ? userDoc.data() : null;
            const role = userData?.role?.toUpperCase();

            if (role === 'ADMIN') {
                currentAdmin = user;
                loginScreen.classList.add('hidden');
                adminShell.classList.remove('hidden');
                adminEmailDisplay.textContent = user.email;
                accessDenied.style.display = 'none';
                initDashboard();
            } else {
                accessDenied.style.display = 'block';
                auth.signOut();
            }
        } catch (error) {
            console.error('Error checking admin role:', error);
            accessDenied.style.display = 'block';
            auth.signOut();
        }
    } else {
        currentAdmin = null;
        loginScreen.classList.remove('hidden');
        adminShell.classList.add('hidden');
        if (unsubscribeOrders) {
            unsubscribeOrders();
            unsubscribeOrders = null;
        }
    }
});

// ===========================================
//  DASHBOARD LOGIC
// ===========================================
function initDashboard() {
    spinner.classList.remove('hidden');
    emptyState.classList.add('hidden');
    tbody.innerHTML = '';

    // Listen to all orders ordered by creation date
    unsubscribeOrders = db.collection('orders')
        .orderBy('createdAt', 'desc')
        .onSnapshot(snapshot => {
            ordersList = [];
            snapshot.forEach(doc => {
                ordersList.push({ id: doc.id, ...doc.data() });
            });
            renderOrders();
            updateStats();
            spinner.classList.add('hidden');
        }, error => {
            console.error("Error fetching orders: ", error);
            spinner.classList.add('hidden');
            alert("Error loading orders. Ensure Firebase rules allow read access.");
        });
}

function renderOrders() {
    tbody.innerHTML = '';
    const searchTerm = searchInput.value.trim().toUpperCase();

    let filtered = ordersList.filter(order => {
        const matchFilter = currentFilter === 'all' || order.status === currentFilter;
        let matchSearch = true;
        if (searchTerm) {
            matchSearch = order.refId.toUpperCase().includes(searchTerm) ||
                (order.resumeData?.personalInfo?.fullName || '').toUpperCase().includes(searchTerm);
        }
        return matchFilter && matchSearch;
    });

    if (filtered.length === 0) {
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');

        filtered.forEach(order => {
            const tr = document.createElement('tr');

            const dateStr = order.createdAt && order.createdAt.toDate
                ? order.createdAt.toDate().toLocaleString()
                : 'Unknown date';

            const name = order.resumeData?.personalInfo?.fullName || 'N/A';
            const email = order.resumeData?.personalInfo?.email || 'N/A';
            const tpl = order.templateType || 'ats_classic';

            const statusClass = `status-${order.status || 'pending'}`;
            const statusText = (order.status || 'pending').toUpperCase();

            tr.innerHTML = `
                <td class="ref-id">#${order.refId}</td>
                <td>${dateStr}</td>
                <td>${escapeHtml(name)}</td>
                <td>${escapeHtml(email)}</td>
                <td>${escapeHtml(tpl)}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    <button class="filter-btn view-btn" style="padding:4px 10px;font-size:12px;">View</button>
                </td>
            `;

            tr.querySelector('.view-btn').addEventListener('click', () => openDetailModal(order));
            tbody.appendChild(tr);
        });
    }
}

function updateStats() {
    const total = ordersList.length;
    const pending = ordersList.filter(o => o.status === 'pending').length;

    // Simple today check
    const today = new Date().toDateString();
    const fulfilledToday = ordersList.filter(o => {
        if (o.status !== 'fulfilled' || !o.createdAt) return false;
        const d = o.createdAt.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
        return d.toDateString() === today;
    }).length;

    statTotal.textContent = total;
    statPending.textContent = pending;
    statFulfilled.textContent = fulfilledToday;
}

// Filters & Search
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        renderOrders();
    });
});

searchInput.addEventListener('input', () => {
    renderOrders(); // live search
});

btnSearch.addEventListener('click', () => {
    renderOrders();
});

// ===========================================
//  ORDER DETAILS MODAL
// ===========================================
function openDetailModal(order) {
    selectedOrder = order;
    const p = order.resumeData?.personalInfo || {};
    const dateStr = order.createdAt && order.createdAt.toDate ? order.createdAt.toDate().toLocaleString() : 'N/A';

    detailRefId.textContent = `#${order.refId}`;
    detailName.textContent = p.fullName || 'N/A';
    detailEmail.textContent = p.email || 'N/A';
    detailPhone.textContent = p.phone || 'N/A';
    detailTemplate.textContent = order.templateType || 'N/A';
    detailDate.textContent = dateStr;

    const statusText = (order.status || 'pending').toUpperCase();
    detailStatus.innerHTML = `<span class="status-badge status-${order.status || 'pending'}">${statusText}</span>`;

    // Render Preview
    if (typeof ResumeTemplates !== 'undefined' && order.resumeData) {
        const html = ResumeTemplates.render(order.templateType || 'ats_classic', order.resumeData);
        adminPreviewInner.innerHTML = html;

        // Scale to fit Container
        setTimeout(() => {
            const container = document.querySelector('.admin-resume-preview .preview-scale-container');
            const containerWidth = container.clientWidth;
            const scale = containerWidth / 794;
            adminPreviewInner.style.transform = `scale(${scale})`;
            container.style.height = `${1123 * scale}px`;
        }, 50);
    } else {
        adminPreviewInner.innerHTML = '<p style="padding:20px;">Cannot render preview (missing template system or data).</p>';
    }

    detailOverlay.classList.remove('hidden');
}

btnCloseDetail.addEventListener('click', () => {
    detailOverlay.classList.add('hidden');
    selectedOrder = null;
});

detailOverlay.addEventListener('click', (e) => {
    if (e.target === detailOverlay) {
        detailOverlay.classList.add('hidden');
        selectedOrder = null;
    }
});

// ===========================================
//  ORDER ACTIONS
// ===========================================
async function updateOrderStatus(newStatus) {
    if (!selectedOrder) return;
    try {
        await db.collection('orders').doc(selectedOrder.id).update({
            status: newStatus
        });

        // Optimistically update local modal view
        selectedOrder.status = newStatus;
        const statusText = newStatus.toUpperCase();
        detailStatus.innerHTML = `<span class="status-badge status-${newStatus}">${statusText}</span>`;

    } catch (error) {
        console.error("Error updating status:", error);
        alert("Failed to update status. Check permissions.");
    }
}

btnMarkPaid.addEventListener('click', () => updateOrderStatus('paid'));
btnMarkFulfilled.addEventListener('click', () => updateOrderStatus('fulfilled'));

btnDelete.addEventListener('click', async () => {
    if (!selectedOrder) return;
    if (confirm(`Are you sure you want to delete order #${selectedOrder.refId}? This cannot be undone.`)) {
        try {
            await db.collection('orders').doc(selectedOrder.id).delete();
            detailOverlay.classList.add('hidden');
            selectedOrder = null;
        } catch (error) {
            console.error("Error deleting order:", error);
            alert("Failed to delete order. Check permissions.");
        }
    }
});

// ===========================================
//  EDIT RESUME FUNCTIONALITY
// ===========================================
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

let adminEditPhotoUrl = '';
const adminPhotoDrop = document.getElementById('admin-photo-drop');
const adminPhotoInput = document.getElementById('admin-photo-input');
const adminPhotoPreview = document.getElementById('admin-photo-preview');
const adminPhotoText = document.getElementById('admin-photo-text');
const btnAdminRemovePhoto = document.getElementById('btn-admin-remove-photo');

if (adminPhotoDrop) {
    adminPhotoDrop.addEventListener('click', () => adminPhotoInput.click());
    adminPhotoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleAdminPhotoFile(file);
    });
    btnAdminRemovePhoto.addEventListener('click', () => {
        adminEditPhotoUrl = '';
        adminPhotoPreview.src = '';
        adminPhotoPreview.classList.add('hidden');
        btnAdminRemovePhoto.classList.add('hidden');
        adminPhotoText.classList.remove('hidden');
        adminPhotoInput.value = '';
    });
}

function handleAdminPhotoFile(file) {
    if (file.size > 5 * 1024 * 1024) {
        alert('Photo must be under 5 MB.');
        return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_SIZE = 300;
            let width = img.width;
            let height = img.height;
            if (width > height) {
                if (width > MAX_SIZE) {
                    height *= MAX_SIZE / width;
                    width = MAX_SIZE;
                }
            } else {
                if (height > MAX_SIZE) {
                    width *= MAX_SIZE / height;
                    height = MAX_SIZE;
                }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            adminEditPhotoUrl = canvas.toDataURL('image/jpeg', 0.6);
            
            adminPhotoPreview.src = adminEditPhotoUrl;
            adminPhotoPreview.classList.remove('hidden');
            btnAdminRemovePhoto.classList.remove('hidden');
            adminPhotoText.classList.add('hidden');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

btnEditResume.addEventListener('click', () => {
    if (!selectedOrder || !selectedOrder.resumeData) return;
    const r = selectedOrder.resumeData;
    const p = r.personalInfo || {};

    // Populate basic info
    adminEditPhotoUrl = p.photoUrl || '';
    if (adminEditPhotoUrl) {
        adminPhotoPreview.src = adminEditPhotoUrl;
        adminPhotoPreview.classList.remove('hidden');
        btnAdminRemovePhoto.classList.remove('hidden');
        adminPhotoText.classList.add('hidden');
    } else {
        adminPhotoPreview.src = '';
        adminPhotoPreview.classList.add('hidden');
        btnAdminRemovePhoto.classList.add('hidden');
        adminPhotoText.classList.remove('hidden');
    }

    document.getElementById('edit-fullName').value = p.fullName || '';
    document.getElementById('edit-email').value = p.email || '';
    document.getElementById('edit-phone').value = p.phone || '';
    document.getElementById('edit-location').value = p.location || '';
    document.getElementById('edit-linkedin').value = p.linkedin || '';
    document.getElementById('edit-website').value = p.website || '';
    document.getElementById('edit-summary').value = r.summary || '';
    document.getElementById('edit-template-select').value = selectedOrder.templateType || 'ats_classic';

    // Clear dynamic lists
    document.getElementById('edit-exp-list').innerHTML = '';
    document.getElementById('edit-edu-list').innerHTML = '';
    document.getElementById('edit-skill-list').innerHTML = '';
    document.getElementById('edit-proj-list').innerHTML = '';

    // Populate dynamic lists
    (r.experience || []).forEach(e => adminAddExp(e));
    (r.education || []).forEach(e => adminAddEdu(e));
    (r.skills || []).forEach(e => adminAddSkill(e));
    (r.projects || []).forEach(e => adminAddProj(e));

    editOverlay.classList.remove('hidden');
});

btnCloseEdit.addEventListener('click', () => {
    editOverlay.classList.add('hidden');
});

// Dynamic List Adders
document.getElementById('btn-edit-add-exp').addEventListener('click', () => adminAddExp());
document.getElementById('btn-edit-add-edu').addEventListener('click', () => adminAddEdu());
document.getElementById('btn-edit-add-skill').addEventListener('click', () => adminAddSkill());
document.getElementById('btn-edit-add-proj').addEventListener('click', () => adminAddProj());

function adminAddExp(data = {}) {
    const div = document.createElement('div');
    div.className = 'admin-entry-card';
    div.innerHTML = `
        <button type="button" class="btn-remove-adm-entry" onclick="this.closest('.admin-entry-card').remove();"><i class="fa-solid fa-xmark"></i> Remove</button>
        <div class="form-grid cols-2">
            <div class="form-group"><label>Job Title</label><input type="text" class="adm-input exp-title" value="${escapeHtml(data.title)}"></div>
            <div class="form-group"><label>Company</label><input type="text" class="adm-input exp-company" value="${escapeHtml(data.company)}"></div>
            <div class="form-group"><label>Start Date</label><input type="text" class="adm-input exp-start" value="${escapeHtml(data.startDate)}"></div>
            <div class="form-group"><label>End Date</label><input type="text" class="adm-input exp-end" value="${escapeHtml(data.endDate)}"></div>
            <div class="form-group" style="grid-column: 1 / -1;"><label>Description</label><textarea class="adm-input exp-desc" rows="3">${escapeHtml(data.description)}</textarea></div>
        </div>`;
    document.getElementById('edit-exp-list').appendChild(div);
}

function adminAddEdu(data = {}) {
    const div = document.createElement('div');
    div.className = 'admin-entry-card';
    div.innerHTML = `
        <button type="button" class="btn-remove-adm-entry" onclick="this.closest('.admin-entry-card').remove();"><i class="fa-solid fa-xmark"></i> Remove</button>
        <div class="form-grid cols-2">
            <div class="form-group"><label>Degree</label><input type="text" class="adm-input edu-degree" value="${escapeHtml(data.degree)}"></div>
            <div class="form-group"><label>School</label><input type="text" class="adm-input edu-school" value="${escapeHtml(data.school)}"></div>
            <div class="form-group"><label>Start</label><input type="text" class="adm-input edu-start" value="${escapeHtml(data.startDate)}"></div>
            <div class="form-group"><label>End</label><input type="text" class="adm-input edu-end" value="${escapeHtml(data.endDate)}"></div>
            <div class="form-group"><label>GPA</label><input type="text" class="adm-input edu-gpa" value="${escapeHtml(data.gpa)}"></div>
        </div>`;
    document.getElementById('edit-edu-list').appendChild(div);
}

function adminAddSkill(data = {}) {
    const div = document.createElement('div');
    div.className = 'admin-entry-card';
    div.style.padding = '8px 16px';
    div.innerHTML = `
        <div style="display:flex; gap:10px; align-items:center;">
            <input type="text" class="adm-input skill-name" value="${escapeHtml(data.name)}" style="flex:1;">
            <button type="button" class="btn-remove-adm-entry" style="position:static;" onclick="this.closest('.admin-entry-card').remove();"><i class="fa-solid fa-xmark"></i></button>
        </div>`;
    document.getElementById('edit-skill-list').appendChild(div);
}

function adminAddProj(data = {}) {
    const div = document.createElement('div');
    div.className = 'admin-entry-card';
    div.innerHTML = `
        <button type="button" class="btn-remove-adm-entry" onclick="this.closest('.admin-entry-card').remove();"><i class="fa-solid fa-xmark"></i> Remove</button>
        <div class="form-grid">
            <div class="form-group"><label>Project Name</label><input type="text" class="adm-input proj-name" value="${escapeHtml(data.name)}"></div>
            <div class="form-group"><label>Description</label><textarea class="adm-input proj-desc" rows="3">${escapeHtml(data.description)}</textarea></div>
        </div>`;
    document.getElementById('edit-proj-list').appendChild(div);
}

btnSaveEdit.addEventListener('click', async () => {
    if (!selectedOrder) return;
    
    btnSaveEdit.disabled = true;
    btnSaveEdit.textContent = "Saving...";

    const newResumeData = {
        personalInfo: {
            fullName: document.getElementById('edit-fullName').value,
            email: document.getElementById('edit-email').value,
            phone: document.getElementById('edit-phone').value,
            location: document.getElementById('edit-location').value,
            linkedin: document.getElementById('edit-linkedin').value,
            website: document.getElementById('edit-website').value,
            photoUrl: adminEditPhotoUrl
        },
        summary: document.getElementById('edit-summary').value,
        experience: [],
        education: [],
        skills: [],
        projects: []
    };

    // Collect Dynamic Lists
    document.querySelectorAll('#edit-exp-list > .admin-entry-card').forEach(card => {
        newResumeData.experience.push({
            title: card.querySelector('.exp-title').value,
            company: card.querySelector('.exp-company').value,
            startDate: card.querySelector('.exp-start').value,
            endDate: card.querySelector('.exp-end').value,
            description: card.querySelector('.exp-desc').value
        });
    });
    document.querySelectorAll('#edit-edu-list > .admin-entry-card').forEach(card => {
        newResumeData.education.push({
            degree: card.querySelector('.edu-degree').value,
            school: card.querySelector('.edu-school').value,
            startDate: card.querySelector('.edu-start').value,
            endDate: card.querySelector('.edu-end').value,
            gpa: card.querySelector('.edu-gpa').value
        });
    });
    document.querySelectorAll('#edit-skill-list > .admin-entry-card').forEach(card => {
        const name = card.querySelector('.skill-name').value.trim();
        if (name) newResumeData.skills.push({ name });
    });
    document.querySelectorAll('#edit-proj-list > .admin-entry-card').forEach(card => {
        newResumeData.projects.push({
            name: card.querySelector('.proj-name').value,
            description: card.querySelector('.proj-desc').value
        });
    });

    const newTemplate = document.getElementById('edit-template-select').value;

    try {
        await db.collection('orders').doc(selectedOrder.id).update({
            resumeData: newResumeData,
            templateType: newTemplate
        });
        
        // Optimistically update the modal UI
        selectedOrder.resumeData = newResumeData;
        selectedOrder.templateType = newTemplate;
        
        // Update header texts in the modal
        document.getElementById('detail-name').textContent = newResumeData.personalInfo.fullName;
        document.getElementById('detail-email').textContent = newResumeData.personalInfo.email;
        document.getElementById('detail-phone').textContent = newResumeData.personalInfo.phone;
        document.getElementById('detail-template').textContent = newTemplate;
        
        // Re-render preview
        if (typeof ResumeTemplates !== 'undefined') {
            const html = ResumeTemplates.render(newTemplate, newResumeData);
            adminPreviewInner.innerHTML = html;
        }

        editOverlay.classList.add('hidden');
        alert("Changes saved successfully!");
    } catch (error) {
        console.error("Error updating order:", error);
        alert("Failed to save changes. Check permissions.");
    }
    
    btnSaveEdit.disabled = false;
    btnSaveEdit.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Changes';
});


// ===========================================
//  PRINTING
// ===========================================
btnPrint.addEventListener('click', () => {
    if (!selectedOrder || !selectedOrder.resumeData) return;

    // The trick for clean printing without blowing up the admin UI:
    // We open a new window, write the resume HTML to it, and call print()
    const printWindow = window.open('', '_blank');

    if (!printWindow) {
        alert("Please allow popups to print.");
        return;
    }

    // We need the template HTML
    const resumeHtml = ResumeTemplates.render(selectedOrder.templateType || 'ats_classic', selectedOrder.resumeData);

    updateOrderStatus('printed');

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Print Order #${selectedOrder.refId}</title>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
            <style>
                @page { margin: 0; size: A4; }
                body { margin: 0; padding: 0; background: #fff; display: flex; justify-content: center; }
                .resume-container { width: 794px; min-height: 1123px; }
                /* Hide everything except the resume container when printing */
                @media print {
                    body { display: block; }
                    .resume-container { position: absolute; top: 0; left: 0; }
                }
            </style>
        </head>
        <body>
            <div class="resume-container">
                ${resumeHtml}
            </div>
            <script>
                // Wait a moment for fonts/images to load, then print
                setTimeout(() => {
                    window.print();
                    // window.close(); // Optional: close after print dialog
                }, 1000);
            </script>
        </body>
        </html>
    `);

    printWindow.document.close();
});

// Helper
function escapeHtml(str) {
    if (!str) return '';
    return str.toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
