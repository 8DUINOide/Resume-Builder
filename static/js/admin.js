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
let isCreatingMode = false;

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
const adminPageIndicator = document.getElementById('admin-page-indicator');

// Actions
const btnDownloadPdfAdmin = document.getElementById('btn-download-pdf-admin');
const btnMarkFulfilled = document.getElementById('btn-mark-fulfilled');
const btnDelete = document.getElementById('btn-delete-order');
const btnEditResume = document.getElementById('btn-edit-resume');

// Edit modal
const editOverlay = document.getElementById('edit-resume-overlay');
const btnCloseEdit = document.getElementById('btn-close-edit');
const btnSaveEdit = document.getElementById('btn-save-edit');
const editResumeTitle = document.getElementById('edit-resume-title');
const btnCreateResume = document.getElementById('btn-create-resume');

// Stats
const statPending = document.getElementById('stat-pending');
const statFulfilled = document.getElementById('stat-fulfilled');
const statTotal = document.getElementById('stat-total');
const statCustomers = document.getElementById('stat-customers');

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
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists && userDoc.data().role === 'ADMIN') {
                currentAdmin = user;
                loginScreen.classList.add('hidden');
                adminShell.classList.remove('hidden');
                accessDenied.classList.add('hidden');
                adminEmailDisplay.textContent = user.email;
                fetchOrders();
            } else {
                accessDenied.classList.remove('hidden');
                await auth.signOut();
            }
        } catch (error) {
            console.error("Auth check error:", error);
            accessDenied.classList.remove('hidden');
            await auth.signOut();
        }
    } else {
        currentAdmin = null;
        loginScreen.classList.remove('hidden');
        adminShell.classList.add('hidden');
        accessDenied.classList.add('hidden');
    }
});

// ===========================================
//  FETCH & RENDER ORDERS
// ===========================================
function fetchOrders() {
    spinner.classList.remove('hidden');
    unsubscribeOrders = db.collection('orders')
        .orderBy('createdAt', 'desc')
        .onSnapshot(snapshot => {
            ordersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
            matchSearch = (order.refId || '').toUpperCase().includes(searchTerm) ||
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
                <td class="ref-id">#${order.refId || '???'}</td>
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

    // Calculate unique customers based on email
    const uniqueEmails = new Set();
    ordersList.forEach(o => {
        const email = o.resumeData?.personalInfo?.email || o.userEmail;
        if (email && email !== 'N/A' && email !== 'admin_created') {
            uniqueEmails.add(email.toLowerCase().trim());
        }
    });
    const totalCustomers = uniqueEmails.size;

    statTotal.textContent = total;
    statPending.textContent = pending;
    statFulfilled.textContent = fulfilledToday;
    if (statCustomers) {
        statCustomers.textContent = totalCustomers;
    }
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
function updateAdminPageIndicator() {
    if (!adminPageIndicator || !adminPreviewInner) return;

    const pageHeight = 1123;
    const estimatedHeight = adminPreviewInner.scrollHeight || adminPreviewInner.offsetHeight || pageHeight;
    const pageCount = clampResumePageCount(estimatedHeight / pageHeight);
    adminPageIndicator.textContent = `Page 1 of ${pageCount}`;
}

function scaleAdminPreview() {
    const container = document.querySelector('.full-preview-container, .admin-full-preview-container');
    if (!container || !adminPreviewInner) return;

    const containerWidth = container.clientWidth;
    const scale = containerWidth / 794;
    const contentHeight = adminPreviewInner.scrollHeight || 1123;
    const pageCount = clampResumePageCount(contentHeight / 1123);
    adminPreviewInner.style.transform = `scale(${scale})`;
    container.style.height = `${(1123 * pageCount) * scale}px`;
    updateAdminPageIndicator();
}

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

    // Render Preview — include colorTheme/photoSize/photoShape from order
    if (typeof ResumeTemplates !== 'undefined' && order.resumeData) {
        const renderData = {
            ...order.resumeData,
            colorTheme: order.colorTheme || order.resumeData.colorTheme || 'indigo',
            photoSize: order.photoSize || order.resumeData.photoSize || 100,
            photoShape: order.photoShape || order.resumeData.photoShape || 'circle'
        };
        const html = ResumeTemplates.render(order.templateType || 'ats_classic', renderData);
        adminPreviewInner.innerHTML = html;

        requestAnimationFrame(() => {
            scaleAdminPreview();
        });
    } else {
        adminPreviewInner.innerHTML = '<p style="padding:20px;">Cannot render preview (missing template system or data).</p>';
        updateAdminPageIndicator();
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

function buildPdfExportNode(order) {
    if (!order || !order.resumeData) return null;

    const renderData = {
        ...order.resumeData,
        colorTheme: order.colorTheme || order.resumeData.colorTheme || 'indigo',
        photoSize: order.photoSize || order.resumeData.photoSize || 100,
        photoShape: order.photoShape || order.resumeData.photoShape || 'circle'
    };

    const resumeHtml = ResumeTemplates.render(order.templateType || 'ats_classic', renderData);
    if (!resumeHtml || !resumeHtml.trim()) return null;

    const exportNode = document.createElement('div');
    exportNode.innerHTML = `
        <style>
            * { box-sizing: border-box; }
            body, html { margin: 0; }
            div, h1, h2, h3, p, ul, li, section, article {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
            }
            .resume-page-break { page-break-before: always; }
        </style>
        ${resumeHtml}
    `;
    exportNode.style.width = '794px';
    exportNode.style.minHeight = '1123px';
    exportNode.style.height = 'auto';
    exportNode.style.background = '#ffffff';
    exportNode.style.boxSizing = 'border-box';
    exportNode.style.margin = '0';
    exportNode.style.padding = '48px';
    exportNode.style.position = 'relative';
    exportNode.style.overflow = 'visible';
    exportNode.style.fontFamily = 'Inter, Arial, sans-serif';

    const wrapper = document.createElement('div');
    wrapper.style.position = 'fixed';
    wrapper.style.left = '-9999px';
    wrapper.style.top = '0';
    wrapper.style.width = '794px';
    wrapper.style.background = '#ffffff';
    wrapper.style.zIndex = '2147483647';
    wrapper.appendChild(exportNode);
    document.body.appendChild(wrapper);

    return { wrapper, exportNode };
}

if (btnDownloadPdfAdmin) {
    btnDownloadPdfAdmin.addEventListener('click', async () => {
        if (!selectedOrder) return;

        const pdfExport = buildPdfExportNode(selectedOrder);
        if (!pdfExport) {
            alert('No resume preview found.');
            return;
        }

        const p = selectedOrder.resumeData?.personalInfo || {};
        const filename = `${p.fullName || 'Resume'}_${selectedOrder.refId}.pdf`;

        const originalText = btnDownloadPdfAdmin.innerHTML;
        btnDownloadPdfAdmin.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating...';
        btnDownloadPdfAdmin.disabled = true;

        try {
            const fullHeight = Math.max(1123, pdfExport.exportNode.scrollHeight + 80);
            const canvas = await html2canvas(pdfExport.exportNode, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                scrollX: 0,
                scrollY: 0,
                width: 794,
                height: fullHeight,
                windowWidth: 794,
                windowHeight: fullHeight
            });

            const { jsPDF } = window.jspdf || {};
            if (!jsPDF) {
                throw new Error('jsPDF is not available.');
            }

            const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const pagePxHeight = 1123 * 2;
            const totalPages = Math.max(1, Math.ceil(canvas.height / pagePxHeight));

            for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
                if (pageIndex > 0) {
                    pdf.addPage();
                }

                const cropHeight = Math.min(pagePxHeight, canvas.height - (pageIndex * pagePxHeight));
                const pageCanvas = document.createElement('canvas');
                pageCanvas.width = canvas.width;
                pageCanvas.height = cropHeight;
                const ctx = pageCanvas.getContext('2d');
                ctx.drawImage(
                    canvas,
                    0,
                    pageIndex * pagePxHeight,
                    canvas.width,
                    cropHeight,
                    0,
                    0,
                    canvas.width,
                    cropHeight
                );

                const pageImage = pageCanvas.toDataURL('image/png');
                const imgProps = pdf.getImageProperties(pageImage);
                const ratio = Math.min(pageWidth / imgProps.width, pageHeight / imgProps.height);
                const imgWidth = imgProps.width * ratio;
                const imgHeight = imgProps.height * ratio;

                pdf.addImage(pageImage, 'PNG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
            }

            pdf.save(filename);
        } catch (err) {
            console.error('PDF generation error:', err);
            alert('Failed to generate PDF.');
        } finally {
            btnDownloadPdfAdmin.innerHTML = originalText;
            btnDownloadPdfAdmin.disabled = false;
            pdfExport.wrapper.remove();
        }
    });
}

// ===========================================
//  EDIT RESUME FUNCTIONALITY
// ===========================================
function escapeHtml(str) {
    if (!str) return '';
    return str.toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

let adminEditPhotoUrl = '';
let adminOriginalPhotoUrl = ''; // Store original photo before attire change
const adminPhotoDrop = document.getElementById('admin-photo-drop');
const adminPhotoInput = document.getElementById('admin-photo-input');
const adminPhotoPreview = document.getElementById('admin-photo-preview');
const adminPhotoText = document.getElementById('admin-photo-text');
const btnAdminRemovePhoto = document.getElementById('btn-admin-remove-photo');
const btnBusinessAttire = document.getElementById('btn-business-attire');

if (adminPhotoDrop) {
    adminPhotoDrop.addEventListener('click', () => adminPhotoInput.click());
    adminPhotoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleAdminPhotoFile(file);
    });
    btnAdminRemovePhoto.addEventListener('click', () => {
        adminEditPhotoUrl = '';
        adminOriginalPhotoUrl = '';
        adminPhotoPreview.src = '';
        adminPhotoPreview.classList.add('hidden');
        btnAdminRemovePhoto.classList.add('hidden');
        if (btnBusinessAttire) btnBusinessAttire.classList.add('hidden');
        adminPhotoText.classList.remove('hidden');
        adminPhotoInput.value = '';
    });
}

function showAdminPhotoButtons() {
    btnAdminRemovePhoto.classList.remove('hidden');
    if (btnBusinessAttire) btnBusinessAttire.classList.remove('hidden');
}

function hideAdminPhotoButtons() {
    btnAdminRemovePhoto.classList.add('hidden');
    if (btnBusinessAttire) btnBusinessAttire.classList.add('hidden');
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
            adminOriginalPhotoUrl = adminEditPhotoUrl; // Save as original
            
            adminPhotoPreview.src = adminEditPhotoUrl;
            adminPhotoPreview.classList.remove('hidden');
            showAdminPhotoButtons();
            adminPhotoText.classList.add('hidden');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// ===========================================
//  BUSINESS ATTIRE AI FEATURE
// ===========================================
const attireModal = document.getElementById('attire-modal');
const attireLoading = document.getElementById('attire-loading');
const attireResult = document.getElementById('attire-result');
const attireActions = document.getElementById('attire-actions');
const attireOriginal = document.getElementById('attire-original');
const attireGenerated = document.getElementById('attire-generated');
const attireErrorMsg = document.getElementById('attire-error-msg');
const btnCloseAttire = document.getElementById('btn-close-attire');
const btnAttireAccept = document.getElementById('btn-attire-accept');
const btnAttireReject = document.getElementById('btn-attire-reject');

let generatedAttireDataUrl = '';

if (btnBusinessAttire) {
    btnBusinessAttire.addEventListener('click', async () => {
        if (!adminEditPhotoUrl) {
            alert('Please upload a photo first.');
            return;
        }

        // Show modal in loading state
        attireModal.classList.remove('hidden');
        attireLoading.classList.remove('hidden');
        attireResult.classList.add('hidden');
        attireActions.classList.add('hidden');
        attireErrorMsg.classList.add('hidden');
        generatedAttireDataUrl = '';

        // Show original
        attireOriginal.src = adminOriginalPhotoUrl || adminEditPhotoUrl;

        try {
            // Extract base64 from data URL
            const base64 = adminEditPhotoUrl.split(',')[1];
            const mimeMatch = adminEditPhotoUrl.match(/data:([^;]+);/);
            const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

            const response = await fetch('/api/gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'businessAttire',
                    imageBase64: base64,
                    mimeType: mimeType
                })
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || result.message || 'Failed to generate business attire');
            }

            generatedAttireDataUrl = `data:${result.mimeType};base64,${result.imageBase64}`;
            attireGenerated.src = generatedAttireDataUrl;

            attireLoading.classList.add('hidden');
            attireResult.classList.remove('hidden');
            attireActions.classList.remove('hidden');

        } catch (error) {
            console.error('Business attire error:', error);
            attireLoading.classList.add('hidden');
            attireResult.classList.remove('hidden');
            attireErrorMsg.textContent = error.message || 'Failed to generate. Try a different photo.';
            attireErrorMsg.classList.remove('hidden');
            attireActions.classList.remove('hidden');
            // Hide accept button on error
            if (btnAttireAccept) btnAttireAccept.style.display = 'none';
        }
    });
}

if (btnCloseAttire) {
    btnCloseAttire.addEventListener('click', () => {
        attireModal.classList.add('hidden');
        if (btnAttireAccept) btnAttireAccept.style.display = '';
    });
}

if (btnAttireReject) {
    btnAttireReject.addEventListener('click', () => {
        attireModal.classList.add('hidden');
        if (btnAttireAccept) btnAttireAccept.style.display = '';
    });
}

if (btnAttireAccept) {
    btnAttireAccept.addEventListener('click', () => {
        if (generatedAttireDataUrl) {
            // Save original if not already saved
            if (!adminOriginalPhotoUrl) {
                adminOriginalPhotoUrl = adminEditPhotoUrl;
            }
            // Set the new attire photo as active
            adminEditPhotoUrl = generatedAttireDataUrl;
            adminPhotoPreview.src = generatedAttireDataUrl;
        }
        attireModal.classList.add('hidden');
    });
}

// ===========================================
//  CREATE / EDIT RESUME
// ===========================================
if (btnCreateResume) {
    btnCreateResume.addEventListener('click', () => {
        selectedOrder = null;
        isCreatingMode = true;
        
        if(editResumeTitle) editResumeTitle.textContent = "Create Resume";
        btnSaveEdit.innerHTML = '<i class="fa-solid fa-plus"></i> Create Order';

        document.getElementById('edit-fullName').value = '';
        document.getElementById('edit-email').value = '';
        document.getElementById('edit-phone').value = '';
        document.getElementById('edit-location').value = '';
        document.getElementById('edit-linkedin').value = '';
        document.getElementById('edit-website').value = '';
        document.getElementById('edit-summary').value = '';
        document.getElementById('edit-template-select').value = 'ats_classic';
        document.getElementById('edit-color-theme').value = 'indigo';

        adminEditPhotoUrl = '';
        adminOriginalPhotoUrl = '';
        adminPhotoPreview.src = '';
        adminPhotoPreview.classList.add('hidden');
        hideAdminPhotoButtons();
        if (adminPhotoText) adminPhotoText.classList.remove('hidden');

        document.getElementById('edit-exp-list').innerHTML = '';
        document.getElementById('edit-edu-list').innerHTML = '';
        document.getElementById('edit-skill-list').innerHTML = '';
        document.getElementById('edit-proj-list').innerHTML = '';

        editOverlay.classList.remove('hidden');
    });
}

btnEditResume.addEventListener('click', () => {
    if (!selectedOrder || !selectedOrder.resumeData) return;
    
    isCreatingMode = false;
    if(editResumeTitle) editResumeTitle.textContent = "Edit Resume";
    btnSaveEdit.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Changes';

    const r = selectedOrder.resumeData;
    const p = r.personalInfo || {};

    // Populate basic info
    adminEditPhotoUrl = p.photoUrl || '';
    adminOriginalPhotoUrl = p.originalPhotoUrl || p.photoUrl || '';
    if (adminEditPhotoUrl) {
        adminPhotoPreview.src = adminEditPhotoUrl;
        adminPhotoPreview.classList.remove('hidden');
        showAdminPhotoButtons();
        adminPhotoText.classList.add('hidden');
    } else {
        adminPhotoPreview.src = '';
        adminPhotoPreview.classList.add('hidden');
        hideAdminPhotoButtons();
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
    document.getElementById('edit-color-theme').value = selectedOrder.colorTheme || r.colorTheme || 'indigo';

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
    if (!isCreatingMode && !selectedOrder) return;
    
    btnSaveEdit.disabled = true;
    btnSaveEdit.textContent = isCreatingMode ? "Creating..." : "Saving...";

    const newResumeData = {
        personalInfo: {
            fullName: document.getElementById('edit-fullName').value,
            email: document.getElementById('edit-email').value,
            phone: document.getElementById('edit-phone').value,
            location: document.getElementById('edit-location').value,
            linkedin: document.getElementById('edit-linkedin').value,
            website: document.getElementById('edit-website').value,
            photoUrl: adminEditPhotoUrl,
            originalPhotoUrl: adminOriginalPhotoUrl || adminEditPhotoUrl // Save original photo
        },
        summary: document.getElementById('edit-summary').value,
        experience: [],
        education: [],
        skills: [],
        projects: []
    };

    const newColorTheme = document.getElementById('edit-color-theme').value;
    newResumeData.colorTheme = newColorTheme;

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
        if (isCreatingMode) {
            const chars = '0123456789';
            let code = '';
            for (let i = 0; i < 4; i++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            let refId = `REF-${code}`;
            
            const newOrder = {
                refId: refId,
                status: 'pending',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                userId: currentAdmin ? currentAdmin.uid : 'admin_created',
                userEmail: currentAdmin ? currentAdmin.email : 'admin_created',
                userDisplayName: currentAdmin ? (currentAdmin.displayName || 'Admin') : 'Admin',
                templateType: newTemplate,
                colorTheme: newColorTheme,
                resumeData: newResumeData,
                hasPhoto: !!adminEditPhotoUrl
            };
            
            await db.collection('orders').doc(refId).set(newOrder);
            editOverlay.classList.add('hidden');
            alert(`Order ${refId} created successfully!`);
        } else {
            await db.collection('orders').doc(selectedOrder.id).update({
                resumeData: newResumeData,
                templateType: newTemplate,
                colorTheme: newColorTheme
            });
            
            // Optimistically update the modal UI
            selectedOrder.resumeData = newResumeData;
            selectedOrder.templateType = newTemplate;
            selectedOrder.colorTheme = newColorTheme;
            
            // Update header texts in the modal
            document.getElementById('detail-name').textContent = newResumeData.personalInfo.fullName;
            document.getElementById('detail-email').textContent = newResumeData.personalInfo.email;
            document.getElementById('detail-phone').textContent = newResumeData.personalInfo.phone;
            document.getElementById('detail-template').textContent = newTemplate;
            
            // Re-render preview
            if (typeof ResumeTemplates !== 'undefined') {
                const renderData = { ...newResumeData, colorTheme: newColorTheme };
                const html = ResumeTemplates.render(newTemplate, renderData);
                adminPreviewInner.innerHTML = html;
            }

            editOverlay.classList.add('hidden');
            alert("Changes saved successfully!");
        }
    } catch (error) {
        console.error("Error saving order:", error);
        alert("Failed to save changes. Check permissions.");
    }
    
    btnSaveEdit.disabled = false;
    btnSaveEdit.innerHTML = isCreatingMode ? '<i class="fa-solid fa-plus"></i> Create Order' : '<i class="fa-solid fa-floppy-disk"></i> Save Changes';
});


// ===========================================
//  PRINTING
// ===========================================
btnPrint.addEventListener('click', () => {
    if (!selectedOrder || !selectedOrder.resumeData) return;

    const printWindow = window.open('', '_blank');

    if (!printWindow) {
        alert("Please allow popups to print.");
        return;
    }

    const renderData = {
        ...selectedOrder.resumeData,
        colorTheme: selectedOrder.colorTheme || selectedOrder.resumeData.colorTheme || 'indigo',
        photoSize: selectedOrder.photoSize || selectedOrder.resumeData.photoSize || 100,
        photoShape: selectedOrder.photoShape || selectedOrder.resumeData.photoShape || 'circle'
    };
    const resumeHtml = ResumeTemplates.render(selectedOrder.templateType || 'ats_classic', renderData);

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Print Order #${selectedOrder.refId}</title>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
            <style>
                @page { margin: 25.4mm 0; size: A4; }
                body { margin: 0; padding: 0; background: #fff; display: flex; justify-content: center; }
                .resume-container {
                    width: 794px;
                    min-height: 1123px;
                    box-sizing: border-box;
                    page-break-inside: avoid;
                    break-inside: avoid;
                }
                .resume-container * {
                    page-break-inside: avoid !important;
                    break-inside: avoid !important;
                }
                /* Hide everything except the resume container when printing */
                @media print {
                    body { display: block; margin: 0; }
                    .resume-container { position: absolute; top: 25.4mm; left: 0; }
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
                }, 1000);
            </script>
        </body>
        </html>
    `);

    printWindow.document.close();
});
// ===========================================
//  AI SCAN FUNCTIONALITY (ADMIN)
// ===========================================
const btnAdminAiScanOpen = document.getElementById('btn-admin-ai-scan-open');
const adminAiScanModal = document.getElementById('admin-ai-scan-modal');
const btnCloseAdminAiScan = document.getElementById('btn-close-admin-ai-scan');
const adminAiScanDrop = document.getElementById('admin-ai-scan-drop');
const adminAiScanInput = document.getElementById('admin-ai-scan-input');
const adminAiScanPreview = document.getElementById('admin-ai-scan-preview');
const adminAiScanUploadInner = document.getElementById('admin-ai-scan-upload-inner');
const adminAiScanStatus = document.getElementById('admin-ai-scan-status');
const adminAiScanError = document.getElementById('admin-ai-scan-error');
const btnAdminStartScan = document.getElementById('btn-admin-start-scan');

let adminAiScanImageBase64 = '';
let adminAiScanMimeType = 'image/jpeg';

if (btnAdminAiScanOpen) {
    btnAdminAiScanOpen.addEventListener('click', () => {
        resetAdminAiScanState();
        adminAiScanModal.classList.remove('hidden');
    });
}

if (btnCloseAdminAiScan) {
    btnCloseAdminAiScan.addEventListener('click', () => {
        adminAiScanModal.classList.add('hidden');
    });
}

function resetAdminAiScanState() {
    adminAiScanImageBase64 = '';
    adminAiScanPreview.src = '';
    adminAiScanPreview.classList.add('hidden');
    adminAiScanUploadInner.classList.remove('hidden');
    adminAiScanStatus.classList.add('hidden');
    adminAiScanError.classList.add('hidden');
    btnAdminStartScan.disabled = true;
    btnAdminStartScan.style.opacity = '0.5';
    btnAdminStartScan.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Extract Data';
    adminAiScanInput.value = '';
}

function handleAdminAiScanFile(file) {
    if (file.size > 10 * 1024 * 1024) {
        alert('File must be under 10 MB.');
        return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
        const dataUrl = e.target.result;
        adminAiScanMimeType = file.type || 'image/jpeg';
        adminAiScanImageBase64 = dataUrl.split(',')[1];

        adminAiScanPreview.src = dataUrl;
        adminAiScanPreview.classList.remove('hidden');
        adminAiScanUploadInner.classList.add('hidden');
        btnAdminStartScan.disabled = false;
        btnAdminStartScan.style.opacity = '1';
    };
    reader.readAsDataURL(file);
}

if (adminAiScanDrop) {
    adminAiScanDrop.addEventListener('click', () => adminAiScanInput.click());
    adminAiScanDrop.addEventListener('dragover', (e) => {
        e.preventDefault();
        adminAiScanDrop.style.borderColor = 'var(--adm-primary)';
    });
    adminAiScanDrop.addEventListener('dragleave', () => {
        adminAiScanDrop.style.borderColor = 'var(--adm-border)';
    });
    adminAiScanDrop.addEventListener('drop', (e) => {
        e.preventDefault();
        adminAiScanDrop.style.borderColor = 'var(--adm-border)';
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleAdminAiScanFile(e.dataTransfer.files[0]);
        }
    });
}

if (adminAiScanInput) {
    adminAiScanInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            handleAdminAiScanFile(e.target.files[0]);
        }
    });
}

if (btnAdminStartScan) {
    btnAdminStartScan.addEventListener('click', async () => {
        if (!adminAiScanImageBase64) return;

        btnAdminStartScan.disabled = true;
        btnAdminStartScan.innerHTML = 'Processing...';
        adminAiScanStatus.classList.remove('hidden');
        adminAiScanError.classList.add('hidden');

        try {
            const response = await fetch('/api/gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'extractResume',
                    imageBase64: adminAiScanImageBase64,
                    mimeType: adminAiScanMimeType
                })
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || result.message || 'Failed to extract data');
            }

            const extracted = result.data;
            
            // Populate admin edit form
            if (extracted.personalInfo) {
                if (extracted.personalInfo.fullName) document.getElementById('edit-fullName').value = extracted.personalInfo.fullName;
                if (extracted.personalInfo.email) document.getElementById('edit-email').value = extracted.personalInfo.email;
                if (extracted.personalInfo.phone) document.getElementById('edit-phone').value = extracted.personalInfo.phone;
                if (extracted.personalInfo.location) document.getElementById('edit-location').value = extracted.personalInfo.location;
                if (extracted.personalInfo.linkedin) document.getElementById('edit-linkedin').value = extracted.personalInfo.linkedin;
                if (extracted.personalInfo.website) document.getElementById('edit-website').value = extracted.personalInfo.website;
            }
            if (extracted.summary) document.getElementById('edit-summary').value = extracted.summary;

            // Clear and replace experience
            if (extracted.experience && extracted.experience.length > 0) {
                document.getElementById('edit-exp-list').innerHTML = '';
                extracted.experience.forEach(exp => {
                    adminAddExp({
                        title: exp.title || exp.role || '',
                        company: exp.company || '',
                        startDate: exp.startDate || exp.date || '',
                        endDate: exp.endDate || '',
                        description: exp.description || ''
                    });
                });
            }

            // Clear and replace education
            if (extracted.education && extracted.education.length > 0) {
                document.getElementById('edit-edu-list').innerHTML = '';
                extracted.education.forEach(edu => {
                    adminAddEdu({
                        degree: edu.degree || '',
                        school: edu.school || '',
                        startDate: edu.startDate || edu.date || '',
                        endDate: edu.endDate || '',
                        gpa: edu.gpa || ''
                    });
                });
            }

            // Clear and replace skills
            if (extracted.skills && extracted.skills.length > 0) {
                document.getElementById('edit-skill-list').innerHTML = '';
                extracted.skills.forEach(sk => {
                    adminAddSkill({ name: sk.name || '' });
                });
            }

            // Clear and replace projects
            if (extracted.projects && extracted.projects.length > 0) {
                document.getElementById('edit-proj-list').innerHTML = '';
                extracted.projects.forEach(proj => {
                    adminAddProj({
                        name: proj.name || '',
                        description: proj.description || ''
                    });
                });
            }

            adminAiScanModal.classList.add('hidden');
            alert('Resume data extracted and form populated!');

        } catch (error) {
            console.error('AI scan error:', error);
            adminAiScanError.textContent = error.message || 'Failed to extract data.';
            adminAiScanError.classList.remove('hidden');
            btnAdminStartScan.disabled = false;
            btnAdminStartScan.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Extract Data';
        }
    });
}
