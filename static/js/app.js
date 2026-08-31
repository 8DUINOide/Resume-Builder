// ===========================================
//  ARTEX RESUME BUILDER — APPLICATION LOGIC
//  Firebase Auth + Firestore, 4-step flow,
//  Ref ID ordering, rate limiting, anti-spam
// ===========================================

// --- Firebase Configuration ---
const firebaseConfig = {
    apiKey: "AIzaSyCqxKzBeqcqVu61oGJGvqpOeJE85vHD9IU",
    authDomain: "resume-builder-57506.firebaseapp.com",
    projectId: "resume-builder-57506",
    storageBucket: "resume-builder-57506.firebasestorage.app",
    messagingSenderId: "913860230219",
    appId: "1:913860230219:web:c4f33ba46a14436c2961ce"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

// --- Global State ---
let currentUser = null;
let currentStep = 1;
const TOTAL_STEPS = 4;
let selectedTemplate = 'ats_classic';
let selectedColorTheme = 'indigo';
let photoSize = 100;
let photoShape = 'circle';
let resumeData = {
    personalInfo: {},
    summary: '',
    experience: [],
    education: [],
    skills: [],
    projects: []
};
let autoSaveTimeout = null;
let photoDataUrl = '';

// Rate limiting: max 3 orders per hour per device
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const COOLDOWN_SECONDS = 60;
let cooldownTimer = null;

// AI scan state
let aiScanImageBase64 = '';
let aiScanMimeType = 'image/jpeg';

// --- DOM Elements ---
const loginScreen = document.getElementById('login-screen');
const appShell = document.getElementById('app-shell');
const btnLogin = document.getElementById('btn-login');
const btnSignout = document.getElementById('btn-signout');
const userAvatar = document.getElementById('user-avatar');
const userName = document.getElementById('user-name');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const btnGenerate = document.getElementById('btn-generate');
const refModal = document.getElementById('ref-modal');
const refIdDisplay = document.getElementById('ref-id-display');
const btnCopyRef = document.getElementById('btn-copy-ref');
const btnCloseRef = document.getElementById('btn-close-ref');
const rateLimitBanner = document.getElementById('rate-limit-banner');
const autoSaveBadge = document.getElementById('auto-save-badge');

// ===========================================
//  AUTH
// ===========================================
btnLogin.addEventListener('click', async () => {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        await auth.signInWithPopup(provider);
    } catch (error) {
        console.error('Sign-in error:', error);
        showToast('Sign-in failed. Please try again.', 'error');
    }
});

btnSignout.addEventListener('click', async () => {
    await auth.signOut();
});

auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        loginScreen.classList.add('hidden');
        appShell.classList.remove('hidden');

        // Set user info in header
        userAvatar.src = user.photoURL || '';
        userName.textContent = user.displayName || user.email;

        // Pre-fill name and email if form is empty
        const nameInput = document.getElementById('fullName');
        const emailInput = document.getElementById('email');
        if (!nameInput.value && user.displayName) nameInput.value = user.displayName;
        if (!emailInput.value && user.email) emailInput.value = user.email;

        loadDraft();
        updatePreview();
    } else {
        currentUser = null;
        loginScreen.classList.remove('hidden');
        appShell.classList.add('hidden');
    }
});

// ===========================================
//  STEP NAVIGATION
// ===========================================
btnPrev.addEventListener('click', () => {
    if (currentStep > 1) {
        currentStep--;
        updateStepUI();
    }
});

btnNext.addEventListener('click', () => {
    if (currentStep < TOTAL_STEPS) {
        currentStep++;
        updateStepUI();
    }
});

btnGenerate.addEventListener('click', generateOrder);

function updateStepUI() {
    // Hide all step content
    document.querySelectorAll('.step-content').forEach(el => el.classList.add('hidden'));
    document.getElementById(`step-${currentStep}`).classList.remove('hidden');

    // Update step dots
    document.querySelectorAll('.step-dot').forEach(dot => {
        const step = parseInt(dot.dataset.step);
        dot.classList.remove('active', 'completed');
        if (step < currentStep) dot.classList.add('completed');
        else if (step === currentStep) dot.classList.add('active');
    });

    // Update step labels
    document.querySelectorAll('.step-label').forEach((label, i) => {
        const step = i + 1;
        label.classList.remove('active', 'completed');
        if (step < currentStep) label.classList.add('completed');
        else if (step === currentStep) label.classList.add('active');
    });

    // Update connectors
    document.querySelectorAll('.step-connector').forEach(conn => {
        const connStep = parseInt(conn.dataset.connector);
        conn.classList.toggle('completed', connStep < currentStep);
    });

    // Update nav buttons
    btnPrev.classList.toggle('hidden', currentStep === 1);
    btnNext.classList.toggle('hidden', currentStep === TOTAL_STEPS);
    btnGenerate.classList.toggle('hidden', currentStep !== TOTAL_STEPS);

    // If step 4, render full preview
    if (currentStep === TOTAL_STEPS) {
        renderFullPreview();
        checkRateLimit();
    }

    // Scroll form to top
    document.querySelector('.form-panel-inner').scrollTop = 0;
}

// ===========================================
//  TEMPLATE SELECTION
// ===========================================
document.querySelectorAll('.tpl-card').forEach(card => {
    card.addEventListener('click', () => {
        document.querySelectorAll('.tpl-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selectedTemplate = card.dataset.template;
        updatePreview();
    });
});

// ===========================================
//  COLOR THEME SELECTION
// ===========================================
document.querySelectorAll('.color-swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
        document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
        swatch.classList.add('selected');
        selectedColorTheme = swatch.dataset.theme;
        debounceSave();
        updatePreview();
    });
});

// ===========================================
//  PHOTO SIZE & SHAPE CONTROLS
// ===========================================
const photoSizeSlider = document.getElementById('photo-size-slider');
const photoSizeValue = document.getElementById('photo-size-value');
const photoControlsPanel = document.getElementById('photo-controls');

if (photoSizeSlider) {
    photoSizeSlider.addEventListener('input', (e) => {
        photoSize = parseInt(e.target.value);
        photoSizeValue.textContent = `${photoSize}px`;
        debounceSave();
        updatePreview();
    });
}

document.querySelectorAll('.shape-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.shape-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        photoShape = btn.dataset.shape;
        debounceSave();
        updatePreview();
    });
});

function showPhotoControls() {
    if (photoControlsPanel && photoDataUrl) {
        photoControlsPanel.classList.remove('hidden');
    }
}

function hidePhotoControls() {
    if (photoControlsPanel) {
        photoControlsPanel.classList.add('hidden');
    }
}

// ===========================================
//  DYNAMIC FORM ENTRIES
// ===========================================

// --- Experience ---
document.getElementById('btn-add-experience').addEventListener('click', () => addExperienceEntry());

function addExperienceEntry(data = {}) {
    const container = document.getElementById('experience-list');
    const div = document.createElement('div');
    div.className = 'entry-card';
    div.innerHTML = `
        <button type="button" class="btn-remove-entry" onclick="this.closest('.entry-card').remove(); debounceSave();"><i class="fa-solid fa-xmark"></i></button>
        <div class="form-grid cols-2">
            <div class="form-group">
                <label class="form-label">Job Title</label>
                <input type="text" class="form-input exp-title" value="${escAttr(data.title)}" placeholder="Software Engineer">
            </div>
            <div class="form-group">
                <label class="form-label">Company</label>
                <input type="text" class="form-input exp-company" value="${escAttr(data.company)}" placeholder="Tech Corp">
            </div>
            <div class="form-group">
                <label class="form-label">Start Date</label>
                <input type="text" class="form-input exp-start" value="${escAttr(data.startDate)}" placeholder="Jan 2020">
            </div>
            <div class="form-group">
                <label class="form-label">End Date</label>
                <input type="text" class="form-input exp-end" value="${escAttr(data.endDate)}" placeholder="Present">
            </div>
            <div class="form-group full-width">
                <label class="form-label">Description</label>
                <textarea class="form-textarea exp-desc" rows="3" placeholder="Describe your responsibilities (one per line)...">${escHtml(data.description)}</textarea>
            </div>
        </div>
    `;
    container.appendChild(div);
    bindAutoSave(div);
}

// --- Education ---
document.getElementById('btn-add-education').addEventListener('click', () => addEducationEntry());

function addEducationEntry(data = {}) {
    const container = document.getElementById('education-list');
    const div = document.createElement('div');
    div.className = 'entry-card';
    div.innerHTML = `
        <button type="button" class="btn-remove-entry" onclick="this.closest('.entry-card').remove(); debounceSave();"><i class="fa-solid fa-xmark"></i></button>
        <div class="form-grid cols-2">
            <div class="form-group">
                <label class="form-label">Degree</label>
                <input type="text" class="form-input edu-degree" value="${escAttr(data.degree)}" placeholder="BS Computer Science">
            </div>
            <div class="form-group">
                <label class="form-label">School</label>
                <input type="text" class="form-input edu-school" value="${escAttr(data.school)}" placeholder="University">
            </div>
            <div class="form-group">
                <label class="form-label">Start</label>
                <input type="text" class="form-input edu-start" value="${escAttr(data.startDate)}" placeholder="2016">
            </div>
            <div class="form-group">
                <label class="form-label">End</label>
                <input type="text" class="form-input edu-end" value="${escAttr(data.endDate)}" placeholder="2020">
            </div>
            <div class="form-group">
                <label class="form-label">GPA</label>
                <input type="text" class="form-input edu-gpa" value="${escAttr(data.gpa)}" placeholder="3.8">
            </div>
        </div>
    `;
    container.appendChild(div);
    bindAutoSave(div);
}

// --- Skills ---
document.getElementById('btn-add-skill').addEventListener('click', () => addSkillEntry());

function addSkillEntry(data = {}) {
    const container = document.getElementById('skills-list');
    const div = document.createElement('div');
    div.className = 'entry-card';
    div.style.padding = '12px 16px';
    div.innerHTML = `
        <div style="display:flex;align-items:center;gap:12px;">
            <input type="text" class="form-input skill-name" value="${escAttr(data.name)}" placeholder="e.g. JavaScript, Python, Photoshop" style="flex:1;">
            <button type="button" class="btn-remove-entry" style="position:static;width:28px;height:28px;" onclick="this.closest('.entry-card').remove(); debounceSave();"><i class="fa-solid fa-xmark"></i></button>
        </div>
    `;
    container.appendChild(div);
    bindAutoSave(div);
}

// --- Projects ---
document.getElementById('btn-add-project').addEventListener('click', () => addProjectEntry());

function addProjectEntry(data = {}) {
    const container = document.getElementById('projects-list');
    const div = document.createElement('div');
    div.className = 'entry-card';
    div.innerHTML = `
        <button type="button" class="btn-remove-entry" onclick="this.closest('.entry-card').remove(); debounceSave();"><i class="fa-solid fa-xmark"></i></button>
        <div class="form-grid">
            <div class="form-group">
                <label class="form-label">Project Name</label>
                <input type="text" class="form-input proj-name" value="${escAttr(data.name)}" placeholder="My Project">
            </div>
            <div class="form-group">
                <label class="form-label">Description</label>
                <textarea class="form-textarea proj-desc" rows="3" placeholder="Describe what you built...">${escHtml(data.description)}</textarea>
            </div>
        </div>
    `;
    container.appendChild(div);
    bindAutoSave(div);
}

// ===========================================
//  PHOTO UPLOAD
// ===========================================
const photoDropArea = document.getElementById('photo-drop-area');
const photoInput = document.getElementById('photo-input');
const photoPreviewImg = document.getElementById('photo-preview-img');
const btnRemovePhoto = document.getElementById('btn-remove-photo');

photoDropArea.addEventListener('click', () => photoInput.click());

photoDropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    photoDropArea.style.borderColor = 'var(--primary)';
});

photoDropArea.addEventListener('dragleave', () => {
    photoDropArea.style.borderColor = '';
});

photoDropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    photoDropArea.style.borderColor = '';
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) handlePhotoFile(file);
});

photoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handlePhotoFile(file);
});

function handlePhotoFile(file) {
    if (file.size > 5 * 1024 * 1024) {
        showToast('Photo must be under 5 MB.', 'error');
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

            // Compress heavily to ensure it fits in Firestore document limit (1 MiB)
            photoDataUrl = canvas.toDataURL('image/jpeg', 0.6);
            
            photoPreviewImg.src = photoDataUrl;
            photoPreviewImg.classList.remove('hidden');
            photoDropArea.classList.add('has-photo');
            btnRemovePhoto.classList.remove('hidden');
            photoDropArea.querySelector('.photo-upload-icon').classList.add('hidden');
            photoDropArea.querySelector('.photo-upload-text').classList.add('hidden');
            showPhotoControls();
            saveDraft();
            updatePreview();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

btnRemovePhoto.addEventListener('click', () => {
    photoDataUrl = '';
    photoPreviewImg.src = '';
    photoPreviewImg.classList.add('hidden');
    photoDropArea.classList.remove('has-photo');
    btnRemovePhoto.classList.add('hidden');
    photoDropArea.querySelector('.photo-upload-icon').classList.remove('hidden');
    photoDropArea.querySelector('.photo-upload-text').classList.remove('hidden');
    photoInput.value = '';
    hidePhotoControls();
    saveDraft();
    updatePreview();
});

// ===========================================
//  AUTO-SAVE & DRAFT
// ===========================================
function bindAutoSave(container) {
    (container || document).querySelectorAll('input, textarea').forEach(el => {
        el.addEventListener('input', debounceSave);
    });
}

function debounceSave() {
    clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(() => {
        saveDraft();
        updatePreview();
    }, 800);
}

function saveDraft() {
    collectAllFormData();
    localStorage.setItem('artex_resume_draft', JSON.stringify(resumeData));
    showAutoSave();
}

function loadDraft() {
    const saved = localStorage.getItem('artex_resume_draft');
    if (saved) {
        try {
            resumeData = JSON.parse(saved);
            populateForm();
        } catch (e) {
            console.error('Load draft error:', e);
        }
    }
}

function showAutoSave() {
    autoSaveBadge.classList.remove('hidden');
    // Remove and re-add to restart animation
    autoSaveBadge.style.animation = 'none';
    autoSaveBadge.offsetHeight; // trigger reflow
    autoSaveBadge.style.animation = '';
    setTimeout(() => autoSaveBadge.classList.add('hidden'), 2000);
}

// ===========================================
//  FORM DATA COLLECTION
// ===========================================
function collectAllFormData() {
    resumeData.personalInfo = {
        fullName: val('fullName'),
        email: val('email'),
        phone: val('phone'),
        location: val('location'),
        linkedin: val('linkedin'),
        website: val('website'),
        photoUrl: photoDataUrl || ''
    };
    resumeData.summary = val('summary');

    // Experience
    resumeData.experience = [];
    document.querySelectorAll('#experience-list > .entry-card').forEach(card => {
        resumeData.experience.push({
            title: card.querySelector('.exp-title')?.value || '',
            company: card.querySelector('.exp-company')?.value || '',
            startDate: card.querySelector('.exp-start')?.value || '',
            endDate: card.querySelector('.exp-end')?.value || '',
            description: card.querySelector('.exp-desc')?.value || ''
        });
    });

    // Education
    resumeData.education = [];
    document.querySelectorAll('#education-list > .entry-card').forEach(card => {
        resumeData.education.push({
            degree: card.querySelector('.edu-degree')?.value || '',
            school: card.querySelector('.edu-school')?.value || '',
            startDate: card.querySelector('.edu-start')?.value || '',
            endDate: card.querySelector('.edu-end')?.value || '',
            gpa: card.querySelector('.edu-gpa')?.value || ''
        });
    });

    // Skills
    resumeData.skills = [];
    document.querySelectorAll('#skills-list > .entry-card').forEach(card => {
        const name = card.querySelector('.skill-name')?.value || '';
        if (name.trim()) resumeData.skills.push({ name: name.trim() });
    });

    // Projects
    resumeData.projects = [];
    document.querySelectorAll('#projects-list > .entry-card').forEach(card => {
        resumeData.projects.push({
            name: card.querySelector('.proj-name')?.value || '',
            description: card.querySelector('.proj-desc')?.value || ''
        });
    });

    resumeData.templateType = selectedTemplate;
    resumeData.colorTheme = selectedColorTheme;
    resumeData.photoSize = photoSize;
    resumeData.photoShape = photoShape;
}

function populateForm() {
    const p = resumeData.personalInfo || {};
    setVal('fullName', p.fullName);
    setVal('email', p.email);
    setVal('phone', p.phone);
    setVal('location', p.location);
    setVal('linkedin', p.linkedin);
    setVal('website', p.website);
    setVal('summary', resumeData.summary);

    if (p.photoUrl) {
        photoDataUrl = p.photoUrl;
        photoPreviewImg.src = p.photoUrl;
        photoPreviewImg.classList.remove('hidden');
        photoDropArea.classList.add('has-photo');
        btnRemovePhoto.classList.remove('hidden');
        photoDropArea.querySelector('.photo-upload-icon').classList.add('hidden');
        photoDropArea.querySelector('.photo-upload-text').classList.add('hidden');
        showPhotoControls();
    }

    // Clear and re-populate dynamic entries
    document.getElementById('experience-list').innerHTML = '';
    document.getElementById('education-list').innerHTML = '';
    document.getElementById('skills-list').innerHTML = '';
    document.getElementById('projects-list').innerHTML = '';

    (resumeData.experience || []).forEach(e => addExperienceEntry(e));
    (resumeData.education || []).forEach(e => addEducationEntry(e));
    (resumeData.skills || []).forEach(e => addSkillEntry(e));
    (resumeData.projects || []).forEach(e => addProjectEntry(e));

    // Restore template
    if (resumeData.templateType) {
        selectedTemplate = resumeData.templateType;
        document.querySelectorAll('.tpl-card').forEach(c => {
            c.classList.toggle('selected', c.dataset.template === selectedTemplate);
        });
    }

    // Restore color theme
    if (resumeData.colorTheme) {
        selectedColorTheme = resumeData.colorTheme;
        document.querySelectorAll('.color-swatch').forEach(s => {
            s.classList.toggle('selected', s.dataset.theme === selectedColorTheme);
        });
    }

    // Restore photo size/shape
    if (resumeData.photoSize) {
        photoSize = resumeData.photoSize;
        if (photoSizeSlider) photoSizeSlider.value = photoSize;
        if (photoSizeValue) photoSizeValue.textContent = `${photoSize}px`;
    }
    if (resumeData.photoShape) {
        photoShape = resumeData.photoShape;
        document.querySelectorAll('.shape-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.shape === photoShape);
        });
    }
}

// ===========================================
//  LIVE PREVIEW
// ===========================================
function updatePreview() {
    collectAllFormData();
    const html = ResumeTemplates.render(selectedTemplate, resumeData);

    // Side preview (desktop)
    const sideInner = document.getElementById('side-preview-inner');
    if (sideInner) {
        sideInner.innerHTML = html;
        scaleSidePreview();
    }
}

function scaleSidePreview() {
    const container = document.querySelector('.preview-scale-container');
    const inner = document.getElementById('side-preview-inner');
    if (!container || !inner) return;
    const containerWidth = container.clientWidth;
    const scale = containerWidth / 794;
    inner.style.transform = `scale(${scale})`;
}

function renderFullPreview() {
    collectAllFormData();
    const html = ResumeTemplates.render(selectedTemplate, resumeData);
    const inner = document.getElementById('full-preview-inner');
    inner.innerHTML = html;

    // Scale to fit
    requestAnimationFrame(() => {
        const container = document.getElementById('full-preview');
        const containerWidth = container.clientWidth;
        const scale = containerWidth / 794;
        inner.style.transform = `scale(${scale})`;
    });
}

// Observe resize for side preview scaling
const resizeObserver = new ResizeObserver(() => scaleSidePreview());
const sideContainer = document.querySelector('.preview-scale-container');
if (sideContainer) resizeObserver.observe(sideContainer);

// ===========================================
//  MOBILE PREVIEW
// ===========================================
const btnMobilePreview = document.getElementById('btn-mobile-preview');
const mobileOverlay = document.getElementById('mobile-preview-overlay');
const btnCloseMobile = document.getElementById('btn-close-mobile-preview');

btnMobilePreview.addEventListener('click', () => {
    collectAllFormData();
    const html = ResumeTemplates.render(selectedTemplate, resumeData);
    const inner = document.getElementById('mobile-preview-inner');
    inner.innerHTML = `<div style="transform-origin:top left;width:794px;">${html}</div>`;

    // Scale to fit mobile overlay
    requestAnimationFrame(() => {
        const content = document.querySelector('.mobile-preview-content');
        const contentWidth = content.clientWidth;
        const scale = contentWidth / 794;
        inner.querySelector('div').style.transform = `scale(${scale})`;
        inner.style.height = `${1123 * scale}px`;
    });

    mobileOverlay.classList.remove('hidden');
});

btnCloseMobile.addEventListener('click', () => {
    mobileOverlay.classList.add('hidden');
});

mobileOverlay.addEventListener('click', (e) => {
    if (e.target === mobileOverlay) mobileOverlay.classList.add('hidden');
});

// ===========================================
//  AI RESUME SCAN
// ===========================================
const aiScanModal = document.getElementById('ai-scan-modal');
const btnAiScan = document.getElementById('btn-ai-scan');
const btnCloseAiScan = document.getElementById('btn-close-ai-scan');
const aiScanDrop = document.getElementById('ai-scan-drop');
const aiScanInput = document.getElementById('ai-scan-input');
const aiScanPreview = document.getElementById('ai-scan-preview');
const aiScanUploadInner = document.getElementById('ai-scan-upload-inner');
const aiScanStatus = document.getElementById('ai-scan-status');
const aiScanError = document.getElementById('ai-scan-error');
const btnStartScan = document.getElementById('btn-start-scan');

if (btnAiScan) {
    btnAiScan.addEventListener('click', () => {
        aiScanModal.classList.remove('hidden');
        resetAiScanModal();
    });
}

if (btnCloseAiScan) {
    btnCloseAiScan.addEventListener('click', () => {
        aiScanModal.classList.add('hidden');
    });
}

if (aiScanModal) {
    aiScanModal.addEventListener('click', (e) => {
        if (e.target === aiScanModal) aiScanModal.classList.add('hidden');
    });
}

if (aiScanDrop) {
    aiScanDrop.addEventListener('click', () => aiScanInput.click());

    aiScanDrop.addEventListener('dragover', (e) => {
        e.preventDefault();
        aiScanDrop.style.borderColor = 'var(--primary)';
    });

    aiScanDrop.addEventListener('dragleave', () => {
        aiScanDrop.style.borderColor = '';
    });

    aiScanDrop.addEventListener('drop', (e) => {
        e.preventDefault();
        aiScanDrop.style.borderColor = '';
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) handleAiScanFile(file);
    });
}

if (aiScanInput) {
    aiScanInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleAiScanFile(file);
    });
}

function resetAiScanModal() {
    aiScanImageBase64 = '';
    aiScanPreview.classList.add('hidden');
    aiScanPreview.src = '';
    aiScanUploadInner.classList.remove('hidden');
    aiScanStatus.classList.add('hidden');
    aiScanError.classList.add('hidden');
    btnStartScan.disabled = true;
    btnStartScan.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Extract Data';
    aiScanInput.value = '';
}

function handleAiScanFile(file) {
    if (file.size > 10 * 1024 * 1024) {
        showToast('File must be under 10 MB.', 'error');
        return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
        const dataUrl = e.target.result;
        aiScanMimeType = file.type || 'image/jpeg';
        // Extract base64 portion
        aiScanImageBase64 = dataUrl.split(',')[1];

        aiScanPreview.src = dataUrl;
        aiScanPreview.classList.remove('hidden');
        aiScanUploadInner.classList.add('hidden');
        btnStartScan.disabled = false;
    };
    reader.readAsDataURL(file);
}

if (btnStartScan) {
    btnStartScan.addEventListener('click', async () => {
        if (!aiScanImageBase64) return;

        btnStartScan.disabled = true;
        btnStartScan.innerHTML = '<div class="ai-scan-spinner" style="width:16px;height:16px;border-width:2px;display:inline-block;"></div> Processing...';
        aiScanStatus.classList.remove('hidden');
        aiScanError.classList.add('hidden');

        try {
            const response = await fetch('/api/gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'extractResume',
                    imageBase64: aiScanImageBase64,
                    mimeType: aiScanMimeType
                })
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || result.message || 'Failed to extract resume data');
            }

            // Populate the form with extracted data
            const extracted = result.data;
            if (extracted.personalInfo) {
                resumeData.personalInfo = { ...resumeData.personalInfo, ...extracted.personalInfo };
            }
            if (extracted.summary) resumeData.summary = extracted.summary;
            if (extracted.experience) resumeData.experience = extracted.experience;
            if (extracted.education) resumeData.education = extracted.education;
            if (extracted.skills) resumeData.skills = extracted.skills;
            if (extracted.projects) resumeData.projects = extracted.projects;

            populateForm();
            saveDraft();
            updatePreview();

            aiScanModal.classList.add('hidden');
            showToast('Resume data extracted successfully! Review and edit the fields.', 'success');

        } catch (error) {
            console.error('AI scan error:', error);
            aiScanError.textContent = error.message || 'Failed to extract data. Please try again.';
            aiScanError.classList.remove('hidden');
        }

        aiScanStatus.classList.add('hidden');
        btnStartScan.disabled = false;
        btnStartScan.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Extract Data';
    });
}

// ===========================================
//  RATE LIMITING
// ===========================================
function getRateLimitData() {
    try {
        const data = JSON.parse(localStorage.getItem('artex_rate_limit') || '{"timestamps":[]}');
        // Clean old timestamps
        const now = Date.now();
        data.timestamps = (data.timestamps || []).filter(t => now - t < RATE_LIMIT_WINDOW_MS);
        return data;
    } catch {
        return { timestamps: [] };
    }
}

function isRateLimited() {
    const data = getRateLimitData();
    return data.timestamps.length >= RATE_LIMIT_MAX;
}

function recordOrder() {
    const data = getRateLimitData();
    data.timestamps.push(Date.now());
    localStorage.setItem('artex_rate_limit', JSON.stringify(data));
}

function checkRateLimit() {
    const limited = isRateLimited();
    rateLimitBanner.classList.toggle('hidden', !limited);
    btnGenerate.disabled = limited;
}

// ===========================================
//  REF ID GENERATION
// ===========================================
function generateRefId() {
    const chars = '0123456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `REF-${code}`;
}

// ===========================================
//  ORDER SUBMISSION
// ===========================================
async function generateOrder() {
    // Honeypot check
    if (document.getElementById('hp-field').value) {
        showToast('Order submitted!', 'success'); // silent fake success
        return;
    }

    // Rate limit check
    if (isRateLimited()) {
        showToast('Order limit reached. Please try again later.', 'warning');
        return;
    }

    // Collect and validate
    collectAllFormData();

    if (!resumeData.personalInfo.fullName?.trim()) {
        showToast('Please enter your full name.', 'error');
        return;
    }
    if (!resumeData.personalInfo.email?.trim()) {
        showToast('Please enter your email address.', 'error');
        return;
    }
    if (!resumeData.personalInfo.phone?.trim()) {
        showToast('Please enter your phone number.', 'error');
        return;
    }

    // Disable button during submission
    btnGenerate.disabled = true;
    btnGenerate.innerHTML = '<div class="spinner"></div> Generating...';

    try {
        // Generate unique Ref ID
        let refId = generateRefId();
        let attempts = 0;

        // Check uniqueness (try up to 10 times)
        while (attempts < 10) {
            const existing = await db.collection('orders').doc(refId).get();
            if (!existing.exists) break;
            refId = generateRefId();
            attempts++;
        }

        // Prepare order data
        const orderData = {
            refId: refId,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            userId: currentUser.uid,
            userEmail: currentUser.email,
            userDisplayName: currentUser.displayName || '',
            templateType: selectedTemplate,
            colorTheme: selectedColorTheme,
            photoSize: photoSize,
            photoShape: photoShape,
            resumeData: {
                personalInfo: {
                    ...resumeData.personalInfo,
                    photoUrl: photoDataUrl // Now compressed and safe to store
                },
                summary: resumeData.summary,
                experience: resumeData.experience,
                education: resumeData.education,
                skills: resumeData.skills,
                projects: resumeData.projects,
                colorTheme: selectedColorTheme,
                photoSize: photoSize,
                photoShape: photoShape
            },
            hasPhoto: !!photoDataUrl
        };

        // Save to Firestore
        await db.collection('orders').doc(refId).set(orderData);

        // Record for rate limiting
        recordOrder();

        // Redirect to success page
        window.location.href = `success.html?ref=${refId}`;

    } catch (error) {
        console.error('Order submission error:', error);
        showToast('Failed to generate order. Please try again.', 'error');
    }

    btnGenerate.disabled = false;
    btnGenerate.innerHTML = '<i class="fa-solid fa-bullseye"></i> Generate Order';
    checkRateLimit();
}

// ===========================================
//  COOLDOWN TIMER
// ===========================================
function startCooldown() {
    let remaining = COOLDOWN_SECONDS;
    btnGenerate.disabled = true;

    cooldownTimer = setInterval(() => {
        remaining--;
        if (remaining <= 0) {
            clearInterval(cooldownTimer);
            btnGenerate.disabled = isRateLimited();
            btnGenerate.innerHTML = '<i class="fa-solid fa-bullseye"></i> Generate Order';
        } else {
            btnGenerate.innerHTML = `<i class="fa-solid fa-clock"></i> Wait ${remaining}s`;
        }
    }, 1000);
}

// ===========================================
//  REF MODAL
// ===========================================
btnCopyRef.addEventListener('click', () => {
    const text = refIdDisplay.textContent;
    navigator.clipboard.writeText(text).then(() => {
        btnCopyRef.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
        setTimeout(() => { btnCopyRef.innerHTML = '<i class="fa-regular fa-clipboard"></i> Copy Code'; }, 2000);
    }).catch(() => {
        showToast('Failed to copy. Please copy manually.', 'warning');
    });
});

btnCloseRef.addEventListener('click', () => {
    refModal.classList.add('hidden');
});

refModal.addEventListener('click', (e) => {
    if (e.target === refModal) refModal.classList.add('hidden');
});

// ===========================================
//  PDF DOWNLOAD (Customer)
// ===========================================
const btnDownloadPdfCustomer = document.getElementById('btn-download-pdf-customer');
if (btnDownloadPdfCustomer) {
    btnDownloadPdfCustomer.addEventListener('click', () => {
        const element = document.getElementById('full-preview-inner');
        if (!element || !element.innerHTML.trim()) {
            showToast('No resume to download.', 'warning');
            return;
        }

        const opt = {
            margin:       0,
            filename:     `${resumeData.personalInfo.fullName || 'Resume'}_Artex.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true },
            jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
        };
        
        const originalText = btnDownloadPdfCustomer.innerHTML;
        btnDownloadPdfCustomer.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating...';
        btnDownloadPdfCustomer.disabled = true;

        html2pdf().set(opt).from(element).save().then(() => {
            btnDownloadPdfCustomer.innerHTML = originalText;
            btnDownloadPdfCustomer.disabled = false;
        }).catch(err => {
            console.error('PDF generation error:', err);
            showToast('Failed to generate PDF.', 'error');
            btnDownloadPdfCustomer.innerHTML = originalText;
            btnDownloadPdfCustomer.disabled = false;
        });
    });
}

// ===========================================
//  TOAST NOTIFICATIONS
// ===========================================
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = '0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ===========================================
//  UTILITY HELPERS
// ===========================================
function val(id) {
    const el = document.getElementById(id);
    return el ? el.value : '';
}

function setVal(id, value) {
    const el = document.getElementById(id);
    if (el && value) el.value = value;
}

function escHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escAttr(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ===========================================
//  INITIALIZATION
// ===========================================
// Bind auto-save to initial form fields
bindAutoSave(document);

// Initial preview update (will run after auth too)
updatePreview();
