// Firebase Configuration - Replace with your actual Firebase config
// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCqxKzBeqcqVu61oGjGvqpoEJE85vHD9IU",
    authDomain: "resume-builder-57506.firebaseapp.com",
    projectId: "resume-builder-57506",
    storageBucket: "resume-builder-57506.firebasestorage.app",
    messagingSenderId: "913860230219",
    appId: "1:913860230219:web:c4f33ba46a14436c2961ce",
    measurementId: "G-0QTMHK3JQC"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// Global state
let currentUser = null;
let userRole = 'CUSTOMER';
let currentStep = 1;
let selectedTemplate = 'ats_classic';
let resumeData = {
    personalInfo: {},
    summary: '',
    experience: [],
    education: [],
    skills: [],
    projects: []
};
let autoSaveTimeout = null;
let currentOrderId = null;

// DOM Elements
const loginPrompt = document.getElementById('login-prompt');
const builderSection = document.getElementById('builder-section');
const dashboardSection = document.getElementById('dashboard-section');
const adminSection = document.getElementById('admin-section');
const navTabs = document.getElementById('nav-tabs');
const authSection = document.getElementById('auth-section');
const loginBtn = document.getElementById('login-btn');
const mainLoginBtn = document.getElementById('main-login-btn');
const userInfo = document.getElementById('user-info');
const userPhoto = document.getElementById('user-photo');
const userName = document.getElementById('user-name');
const userRoleSpan = document.getElementById('user-role');
const logoutBtn = document.getElementById('logout-btn');

// Auth State Observer
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        userPhoto.src = user.photoURL || '';
        userName.textContent = user.displayName || user.email;
        
        // Get user role
        try {
            const response = await fetch('/api/user-role', {
                headers: {
                    'Authorization': `Bearer ${await user.getIdToken()}`
                }
            });
            const data = await response.json();
            userRole = data.role || 'CUSTOMER';
            userRoleSpan.textContent = userRole;
            
            // Show admin tab if admin
            if (userRole === 'ADMIN') {
                document.getElementById('tab-admin').classList.remove('hidden');
            }
        } catch (error) {
            console.error('Error getting user role:', error);
        }
        
        // Show logged-in UI
        loginPrompt.classList.add('hidden');
        authSection.classList.remove('hidden');
        userInfo.classList.remove('hidden');
        loginBtn.classList.add('hidden');
        navTabs.classList.remove('hidden');
        builderSection.classList.remove('hidden');
        
        // Load draft
        loadDraft();
    } else {
        currentUser = null;
        userRole = 'CUSTOMER';
        
        // Show login UI
        loginPrompt.classList.remove('hidden');
        authSection.classList.add('hidden');
        userInfo.classList.add('hidden');
        loginBtn.classList.remove('hidden');
        navTabs.classList.add('hidden');
        builderSection.classList.add('hidden');
        dashboardSection.classList.add('hidden');
        adminSection.classList.add('hidden');
    }
});

// Google Sign-In
async function signInWithGoogle() {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        const result = await auth.signInWithPopup(provider);
        console.log('Signed in:', result.user);
    } catch (error) {
        console.error('Sign-in error:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
        alert(`Sign-in failed: ${error.message} (Code: ${error.code})`);
    }
}

loginBtn.addEventListener('click', signInWithGoogle);
mainLoginBtn.addEventListener('click', signInWithGoogle);

// Sign Out
logoutBtn.addEventListener('click', async () => {
    try {
        await auth.signOut();
        console.log('Signed out');
    } catch (error) {
        console.error('Sign-out error:', error);
    }
});

// Navigation Tabs
document.getElementById('tab-builder').addEventListener('click', () => {
    builderSection.classList.remove('hidden');
    dashboardSection.classList.add('hidden');
    adminSection.classList.add('hidden');
    updateTabStyles('tab-builder');
});

document.getElementById('tab-dashboard').addEventListener('click', () => {
    builderSection.classList.add('hidden');
    dashboardSection.classList.remove('hidden');
    adminSection.classList.add('hidden');
    updateTabStyles('tab-dashboard');
    loadCustomerDashboard();
});

document.getElementById('tab-admin').addEventListener('click', () => {
    if (userRole === 'ADMIN') {
        builderSection.classList.add('hidden');
        dashboardSection.classList.add('hidden');
        adminSection.classList.remove('hidden');
        updateTabStyles('tab-admin');
        loadAdminDashboard();
    }
});

function updateTabStyles(activeTab) {
    const tabs = ['tab-builder', 'tab-dashboard', 'tab-admin'];
    tabs.forEach(tab => {
        const element = document.getElementById(tab);
        if (tab === activeTab) {
            element.classList.add('border-purple-600', 'text-purple-600');
            element.classList.remove('border-transparent', 'text-gray-600');
        } else {
            element.classList.remove('border-purple-600', 'text-purple-600');
            element.classList.add('border-transparent', 'text-gray-600');
        }
    });
}

// Step Navigation
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const submitBtn = document.getElementById('submit-btn');

prevBtn.addEventListener('click', () => {
    if (currentStep > 1) {
        currentStep--;
        updateStepUI();
    }
});

nextBtn.addEventListener('click', () => {
    if (currentStep < 5) {
        currentStep++;
        updateStepUI();
    }
});

submitBtn.addEventListener('click', submitOrder);

function updateStepUI() {
    // Hide all steps
    document.querySelectorAll('.step-content').forEach(step => {
        step.classList.add('hidden');
    });
    
    // Show current step
    document.getElementById(`step-${currentStep}`).classList.remove('hidden');
    
    // Update step indicators
    document.querySelectorAll('.step-indicator').forEach(indicator => {
        const step = parseInt(indicator.dataset.step);
        indicator.classList.remove('active', 'completed');
        if (step < currentStep) {
            indicator.classList.add('completed');
        } else if (step === currentStep) {
            indicator.classList.add('active');
        }
    });
    
    // Update buttons
    prevBtn.classList.toggle('hidden', currentStep === 1);
    nextBtn.classList.toggle('hidden', currentStep === 5);
    submitBtn.classList.toggle('hidden', currentStep !== 5);
}

// Template Selection
document.querySelectorAll('.template-card').forEach(card => {
    card.addEventListener('click', () => {
        document.querySelectorAll('.template-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selectedTemplate = card.dataset.template;
    });
});

// Auto-save functionality
function setupAutoSave() {
    const inputs = document.querySelectorAll('input, textarea');
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            clearTimeout(autoSaveTimeout);
            autoSaveTimeout = setTimeout(saveDraft, 1000);
        });
    });
}

async function saveDraft() {
    if (!currentUser) return;
    
    try {
        collectFormData();
        const idToken = await currentUser.getIdToken();
        
        const response = await fetch('/api/save-draft', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                idToken: idToken,
                draftData: resumeData
            })
        });
        
        if (response.ok) {
            showAutoSaveIndicator();
        }
    } catch (error) {
        console.error('Auto-save error:', error);
    }
}

async function loadDraft() {
    if (!currentUser) return;
    
    try {
        const idToken = await currentUser.getIdToken();
        const response = await fetch('/api/load-draft', {
            headers: {
                'Authorization': `Bearer ${idToken}`
            }
        });
        
        const data = await response.json();
        if (data.draft && Object.keys(data.draft).length > 0) {
            resumeData = data.draft;
            populateFormData();
        }
    } catch (error) {
        console.error('Load draft error:', error);
    }
}

function showAutoSaveIndicator() {
    const indicator = document.getElementById('auto-save-indicator');
    indicator.classList.remove('hidden');
    setTimeout(() => {
        indicator.classList.add('hidden');
    }, 2000);
}

// Form Data Collection
function collectFormData() {
    resumeData.personalInfo = {
        fullName: document.getElementById('fullName').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        location: document.getElementById('location').value,
        linkedin: document.getElementById('linkedin').value,
        website: document.getElementById('website').value,
        photoUrl: document.getElementById('photo-preview-img').src || ''
    };
    resumeData.summary = document.getElementById('summary').value;
    
    // Experience, education, skills, projects are collected separately
}

function populateFormData() {
    if (resumeData.personalInfo) {
        document.getElementById('fullName').value = resumeData.personalInfo.fullName || '';
        document.getElementById('email').value = resumeData.personalInfo.email || '';
        document.getElementById('phone').value = resumeData.personalInfo.phone || '';
        document.getElementById('location').value = resumeData.personalInfo.location || '';
        document.getElementById('linkedin').value = resumeData.personalInfo.linkedin || '';
        document.getElementById('website').value = resumeData.personalInfo.website || '';
        
        if (resumeData.personalInfo.photoUrl) {
            document.getElementById('photo-preview-img').src = resumeData.personalInfo.photoUrl;
            document.getElementById('photo-preview').classList.remove('hidden');
        }
    }
    
    document.getElementById('summary').value = resumeData.summary || '';
    
    // Populate experience, education, skills, projects
    resumeData.experience.forEach(exp => addExperienceField(exp));
    resumeData.education.forEach(edu => addEducationField(edu));
    resumeData.skills.forEach(skill => addSkillField(skill));
    resumeData.projects.forEach(proj => addProjectField(proj));
}

// Experience Fields
document.getElementById('add-experience').addEventListener('click', () => addExperienceField());

function addExperienceField(data = {}) {
    const container = document.getElementById('experience-list');
    const div = document.createElement('div');
    div.className = 'bg-gray-50 p-4 rounded-lg';
    div.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                <input type="text" class="exp-title w-full px-3 py-2 border rounded-lg" value="${data.title || ''}" placeholder="Software Engineer">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Company</label>
                <input type="text" class="exp-company w-full px-3 py-2 border rounded-lg" value="${data.company || ''}" placeholder="Tech Company">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input type="text" class="exp-start w-full px-3 py-2 border rounded-lg" value="${data.startDate || ''}" placeholder="Jan 2020">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input type="text" class="exp-end w-full px-3 py-2 border rounded-lg" value="${data.endDate || ''}" placeholder="Present">
            </div>
            <div class="md:col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea class="exp-desc w-full px-3 py-2 border rounded-lg" rows="3" placeholder="Describe your responsibilities...">${data.description || ''}</textarea>
            </div>
        </div>
        <button class="mt-2 text-red-600 hover:text-red-800 text-sm" onclick="this.parentElement.remove()">Remove</button>
    `;
    container.appendChild(div);
    setupAutoSave();
}

// Education Fields
document.getElementById('add-education').addEventListener('click', () => addEducationField());

function addEducationField(data = {}) {
    const container = document.getElementById('education-list');
    const div = document.createElement('div');
    div.className = 'bg-gray-50 p-4 rounded-lg';
    div.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Degree</label>
                <input type="text" class="edu-degree w-full px-3 py-2 border rounded-lg" value="${data.degree || ''}" placeholder="Bachelor of Science">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">School</label>
                <input type="text" class="edu-school w-full px-3 py-2 border rounded-lg" value="${data.school || ''}" placeholder="University Name">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input type="text" class="edu-start w-full px-3 py-2 border rounded-lg" value="${data.startDate || ''}" placeholder="Sep 2016">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input type="text" class="edu-end w-full px-3 py-2 border rounded-lg" value="${data.endDate || ''}" placeholder="May 2020">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">GPA</label>
                <input type="text" class="edu-gpa w-full px-3 py-2 border rounded-lg" value="${data.gpa || ''}" placeholder="3.8">
            </div>
        </div>
        <button class="mt-2 text-red-600 hover:text-red-800 text-sm" onclick="this.parentElement.remove()">Remove</button>
    `;
    container.appendChild(div);
    setupAutoSave();
}

// Skills Fields
document.getElementById('add-skill').addEventListener('click', () => addSkillField());

function addSkillField(data = {}) {
    const container = document.getElementById('skills-list');
    const div = document.createElement('div');
    div.className = 'flex items-center space-x-4';
    div.innerHTML = `
        <input type="text" class="skill-name flex-1 px-3 py-2 border rounded-lg" value="${data.name || ''}" placeholder="JavaScript">
        <button class="text-red-600 hover:text-red-800" onclick="this.parentElement.remove()">Remove</button>
    `;
    container.appendChild(div);
    setupAutoSave();
}

// Projects Fields
document.getElementById('add-project').addEventListener('click', () => addProjectField());

function addProjectField(data = {}) {
    const container = document.getElementById('projects-list');
    const div = document.createElement('div');
    div.className = 'bg-gray-50 p-4 rounded-lg';
    div.innerHTML = `
        <div class="grid grid-cols-1 gap-4">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                <input type="text" class="proj-name w-full px-3 py-2 border rounded-lg" value="${data.name || ''}" placeholder="My Awesome Project">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea class="proj-desc w-full px-3 py-2 border rounded-lg" rows="3" placeholder="Describe your project...">${data.description || ''}</textarea>
            </div>
        </div>
        <button class="mt-2 text-red-600 hover:text-red-800 text-sm" onclick="this.parentElement.remove()">Remove</button>
    `;
    container.appendChild(div);
    setupAutoSave();
}

// Photo Upload
document.getElementById('photo').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
        const formData = new FormData();
        formData.append('photo', file);
        
        try {
            const response = await fetch('/api/upload-photo', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            if (data.success) {
                document.getElementById('photo-preview-img').src = data.photoUrl;
                document.getElementById('photo-preview').classList.remove('hidden');
                saveDraft();
            }
        } catch (error) {
            console.error('Photo upload error:', error);
            alert('Photo upload failed. Please try again.');
        }
    }
});

// Collect all form data for submission
function collectAllFormData() {
    collectFormData();
    
    // Collect experience
    resumeData.experience = [];
    document.querySelectorAll('#experience-list > div').forEach(div => {
        resumeData.experience.push({
            title: div.querySelector('.exp-title').value,
            company: div.querySelector('.exp-company').value,
            startDate: div.querySelector('.exp-start').value,
            endDate: div.querySelector('.exp-end').value,
            description: div.querySelector('.exp-desc').value
        });
    });
    
    // Collect education
    resumeData.education = [];
    document.querySelectorAll('#education-list > div').forEach(div => {
        resumeData.education.push({
            degree: div.querySelector('.edu-degree').value,
            school: div.querySelector('.edu-school').value,
            startDate: div.querySelector('.edu-start').value,
            endDate: div.querySelector('.edu-end').value,
            gpa: div.querySelector('.edu-gpa').value
        });
    });
    
    // Collect skills
    resumeData.skills = [];
    document.querySelectorAll('#skills-list > div').forEach(div => {
        resumeData.skills.push({
            name: div.querySelector('.skill-name').value
        });
    });
    
    // Collect projects
    resumeData.projects = [];
    document.querySelectorAll('#projects-list > div').forEach(div => {
        resumeData.projects.push({
            name: div.querySelector('.proj-name').value,
            description: div.querySelector('.proj-desc').value
        });
    });
    
    resumeData.templateType = selectedTemplate;
}

// Submit Order
async function submitOrder() {
    if (!currentUser) {
        alert('Please sign in to submit your order.');
        return;
    }
    
    collectAllFormData();
    
    // Validation
    if (!resumeData.personalInfo.fullName || !resumeData.personalInfo.email || !resumeData.personalInfo.phone) {
        alert('Please fill in all required personal information fields.');
        return;
    }
    
    if (!resumeData.summary) {
        alert('Please provide a professional summary.');
        return;
    }
    
    try {
        const idToken = await currentUser.getIdToken();
        const response = await fetch('/api/create-order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                idToken: idToken,
                templateType: selectedTemplate,
                resumeData: resumeData
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentOrderId = data.orderId;
            showConfirmationModal(data.refId);
        } else {
            alert('Order submission failed: ' + data.error);
        }
    } catch (error) {
        console.error('Order submission error:', error);
        alert('Order submission failed. Please try again.');
    }
}

function showConfirmationModal(refId) {
    document.getElementById('modal-ref-id').textContent = refId;
    document.getElementById('qrcode').innerHTML = '';
    new QRCode(document.getElementById('qrcode'), {
        text: refId,
        width: 128,
        height: 128
    });
    document.getElementById('confirmation-modal').classList.remove('hidden');
}

document.getElementById('close-modal').addEventListener('click', () => {
    document.getElementById('confirmation-modal').classList.add('hidden');
    // Reset form
    currentStep = 1;
    updateStepUI();
    resumeData = {
        personalInfo: {},
        summary: '',
        experience: [],
        education: [],
        skills: [],
        projects: []
    };
    document.querySelectorAll('input, textarea').forEach(input => input.value = '');
    document.getElementById('experience-list').innerHTML = '';
    document.getElementById('education-list').innerHTML = '';
    document.getElementById('skills-list').innerHTML = '';
    document.getElementById('projects-list').innerHTML = '';
    document.getElementById('photo-preview').classList.add('hidden');
});

// Customer Dashboard
async function loadCustomerDashboard() {
    if (!currentUser) return;
    
    try {
        const idToken = await currentUser.getIdToken();
        
        // Get edit count
        const userResponse = await fetch('/api/user-role', {
            headers: {
                'Authorization': `Bearer ${idToken}`
            }
        });
        const userData = await userResponse.json();
        
        // Update edit progress (this would need a separate endpoint to get actual count)
        document.getElementById('edit-count').textContent = '0/5';
        document.getElementById('edit-progress').style.width = '0%';
        
        // Load recent orders (this would need a customer-specific orders endpoint)
        document.getElementById('recent-orders').innerHTML = `
            <p class="text-gray-500">No recent orders found.</p>
        `;
        
    } catch (error) {
        console.error('Dashboard load error:', error);
    }
}

// Admin Dashboard
async function loadAdminDashboard() {
    if (userRole !== 'ADMIN') return;
    
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('admin-date-filter').value = today;
    
    loadAdminOrders(today);
}

document.getElementById('admin-search-btn').addEventListener('click', () => {
    const dateFilter = document.getElementById('admin-date-filter').value;
    const searchTerm = document.getElementById('admin-search').value;
    
    if (searchTerm) {
        loadAdminOrders(null, searchTerm);
    } else {
        loadAdminOrders(dateFilter);
    }
});

async function loadAdminOrders(dateFilter = null, refId = null) {
    if (!currentUser) return;
    
    try {
        const idToken = await currentUser.getIdToken();
        let url = '/api/orders?';
        
        if (dateFilter) {
            url += `date=${dateFilter}`;
        } else if (refId) {
            url += `refId=${refId}`;
        }
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${idToken}`
            }
        });
        
        const data = await response.json();
        
        if (data.orders) {
            renderAdminOrders(data.orders);
        }
    } catch (error) {
        console.error('Admin orders load error:', error);
    }
}

function renderAdminOrders(orders) {
    const tbody = document.getElementById('admin-orders-table');
    tbody.innerHTML = '';
    
    if (orders.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-8 text-gray-500">No orders found</td>
            </tr>
        `;
        return;
    }
    
    orders.forEach(order => {
        const tr = document.createElement('tr');
        tr.className = 'border-b hover:bg-gray-50';
        
        const statusClass = order.status === 'FULFILLED' ? 'bg-green-100 text-green-800' : 
                           order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 
                           'bg-gray-100 text-gray-800';
        
        tr.innerHTML = `
            <td class="py-3 px-4 font-semibold">${order.refId}</td>
            <td class="py-3 px-4">${order.customerName || order.customerEmail}</td>
            <td class="py-3 px-4">${order.templateType}</td>
            <td class="py-3 px-4">
                <span class="px-2 py-1 rounded-full text-xs font-semibold ${statusClass}">${order.status}</span>
            </td>
            <td class="py-3 px-4">${new Date(order.createdAt).toLocaleDateString()}</td>
            <td class="py-3 px-4">
                <button class="text-purple-600 hover:text-purple-800 mr-2" onclick="editOrder('${order.orderId}')">Edit</button>
                ${order.status === 'PENDING' ? `
                    <button class="text-green-600 hover:text-green-800" onclick="fulfillOrder('${order.orderId}')">Fulfill</button>
                ` : `
                    <a href="/api/download-resume/${order.refId}" class="text-blue-600 hover:text-blue-800" target="_blank">Download</a>
                `}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Admin Edit Order
let editingOrderId = null;

async function editOrder(orderId) {
    editingOrderId = orderId;
    
    if (!currentUser) return;
    
    try {
        const idToken = await currentUser.getIdToken();
        const response = await fetch('/api/orders', {
            headers: {
                'Authorization': `Bearer ${idToken}`
            }
        });
        
        const data = await response.json();
        const order = data.orders.find(o => o.orderId === orderId);
        
        if (order) {
            showAdminEditModal(order);
        }
    } catch (error) {
        console.error('Edit order error:', error);
    }
}

function showAdminEditModal(order) {
    const content = document.getElementById('admin-edit-content');
    const resumeData = order.resumeData;
    
    content.innerHTML = `
        <div class="space-y-6">
            <div>
                <h4 class="font-semibold mb-2">Personal Information</h4>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm text-gray-600 mb-1">Full Name</label>
                        <input type="text" id="edit-fullName" class="w-full px-3 py-2 border rounded" value="${resumeData.personalInfo?.fullName || ''}">
                    </div>
                    <div>
                        <label class="block text-sm text-gray-600 mb-1">Email</label>
                        <input type="text" id="edit-email" class="w-full px-3 py-2 border rounded" value="${resumeData.personalInfo?.email || ''}">
                    </div>
                    <div>
                        <label class="block text-sm text-gray-600 mb-1">Phone</label>
                        <input type="text" id="edit-phone" class="w-full px-3 py-2 border rounded" value="${resumeData.personalInfo?.phone || ''}">
                    </div>
                    <div>
                        <label class="block text-sm text-gray-600 mb-1">Location</label>
                        <input type="text" id="edit-location" class="w-full px-3 py-2 border rounded" value="${resumeData.personalInfo?.location || ''}">
                    </div>
                </div>
            </div>
            <div>
                <label class="block text-sm text-gray-600 mb-1">Summary</label>
                <textarea id="edit-summary" class="w-full px-3 py-2 border rounded" rows="4">${resumeData.summary || ''}</textarea>
            </div>
        </div>
    `;
    
    document.getElementById('admin-edit-modal').classList.remove('hidden');
}

document.getElementById('close-admin-modal').addEventListener('click', () => {
    document.getElementById('admin-edit-modal').classList.add('hidden');
});

document.getElementById('cancel-admin-edit').addEventListener('click', () => {
    document.getElementById('admin-edit-modal').classList.add('hidden');
});

document.getElementById('save-admin-edit').addEventListener('click', async () => {
    if (!currentUser || !editingOrderId) return;
    
    try {
        const idToken = await currentUser.getIdToken();
        
        const updatedData = {
            personalInfo: {
                fullName: document.getElementById('edit-fullName').value,
                email: document.getElementById('edit-email').value,
                phone: document.getElementById('edit-phone').value,
                location: document.getElementById('edit-location').value
            },
            summary: document.getElementById('edit-summary').value
        };
        
        const response = await fetch('/api/update-resume', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                idToken: idToken,
                orderId: editingOrderId,
                resumeData: updatedData
            })
        });
        
        if (response.ok) {
            alert('Changes saved successfully');
            document.getElementById('admin-edit-modal').classList.add('hidden');
            loadAdminOrders(document.getElementById('admin-date-filter').value);
        } else {
            const data = await response.json();
            alert('Save failed: ' + data.error);
        }
    } catch (error) {
        console.error('Save edit error:', error);
        alert('Save failed. Please try again.');
    }
});

// Fulfill Order
async function fulfillOrder(orderId) {
    if (!confirm('Are you sure you want to fulfill this order? This will generate the PDF.')) return;
    
    if (!currentUser) return;
    
    try {
        const idToken = await currentUser.getIdToken();
        const response = await fetch('/api/fulfill-order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                idToken: idToken,
                orderId: orderId
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Order fulfilled successfully! PDF generated.');
            loadAdminOrders(document.getElementById('admin-date-filter').value);
        } else {
            alert('Fulfillment failed: ' + data.error);
        }
    } catch (error) {
        console.error('Fulfill order error:', error);
        alert('Fulfillment failed. Please try again.');
    }
}

// Initialize
setupAutoSave();
