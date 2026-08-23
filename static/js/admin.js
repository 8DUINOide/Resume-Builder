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

// Note: For a real production app, checking admin emails on the client side is insecure.
// You should use Firebase Custom Claims or Security Rules.
// For this demo/shop context, we are hardcoding an allowed email list on the client side.
const ALLOWED_ADMIN_EMAILS = [
    // Add your shop's admin emails here:
    "your.admin@email.com",
    "msi36@example.com" // Placeholder for testing
];

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

// Stats
const statPending = document.getElementById('stat-pending');
const statFulfilled = document.getElementById('stat-fulfilled');
const statTotal = document.getElementById('stat-total');

// ===========================================
//  AUTH LOGIC
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

auth.onAuthStateChanged((user) => {
    if (user) {
        // Quick/dirty client-side admin check
        // WARNING: In production, use Firebase Security Rules!
        if (ALLOWED_ADMIN_EMAILS.includes(user.email) || ALLOWED_ADMIN_EMAILS.length === 0) { // If array is empty, allow all for testing
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
    if (window.ResumeTemplates && order.resumeData) {
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
