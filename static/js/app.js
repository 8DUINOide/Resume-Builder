// Global state
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

// DOM Elements
const loginPrompt = document.getElementById('login-prompt');
const builderSection = document.getElementById('builder-section');
const mainLoginBtn = document.getElementById('main-login-btn');

// Simple state management - show builder on button click
mainLoginBtn.addEventListener('click', () => {
    loginPrompt.classList.add('hidden');
    builderSection.classList.remove('hidden');
});


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

function saveDraft() {
    collectFormData();
    localStorage.setItem('resumeDraft', JSON.stringify(resumeData));
    showAutoSaveIndicator();
}

function loadDraft() {
    const savedDraft = localStorage.getItem('resumeDraft');
    if (savedDraft) {
        try {
            resumeData = JSON.parse(savedDraft);
            populateFormData();
        } catch (error) {
            console.error('Load draft error:', error);
        }
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
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('photo-preview-img').src = e.target.result;
            document.getElementById('photo-preview').classList.remove('hidden');
            resumeData.personalInfo.photoUrl = e.target.result;
            saveDraft();
        };
        reader.readAsDataURL(file);
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

// Submit Order - Generate PDF
async function submitOrder() {
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
        await generatePDF();
        alert('Resume PDF generated successfully!');
    } catch (error) {
        console.error('PDF generation error:', error);
        alert('PDF generation failed. Please try again.');
    }
}

// PDF Generation Function
async function generatePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    const data = resumeData;
    let y = 20;
    
    // Title
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text(data.personalInfo.fullName || 'Your Name', 20, y);
    y += 10;
    
    // Contact Info
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    const contactInfo = [
        data.personalInfo.email || '',
        data.personalInfo.phone || '',
        data.personalInfo.location || '',
        data.personalInfo.linkedin || '',
        data.personalInfo.website || ''
    ].filter(Boolean).join(' | ');
    
    if (contactInfo) {
        doc.text(contactInfo, 20, y);
        y += 15;
    }
    
    // Summary
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Professional Summary', 20, y);
    y += 8;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const summaryLines = doc.splitTextToSize(data.summary || '', 170);
    doc.text(summaryLines, 20, y);
    y += Math.max(15, summaryLines.length * 5);
    
    // Experience
    if (data.experience.length > 0) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Work Experience', 20, y);
        y += 8;
        
        data.experience.forEach(exp => {
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text(`${exp.title} - ${exp.company}`, 20, y);
            y += 5;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`${exp.startDate} - ${exp.endDate}`, 20, y);
            y += 5;
            const descLines = doc.splitTextToSize(exp.description || '', 170);
            doc.setFontSize(10);
            doc.text(descLines, 20, y);
            y += Math.max(10, descLines.length * 4);
        });
    }
    
    // Education
    if (data.education.length > 0) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Education', 20, y);
        y += 8;
        
        data.education.forEach(edu => {
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text(`${edu.degree} - ${edu.school}`, 20, y);
            y += 5;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`${edu.startDate} - ${edu.endDate}`, 20, y);
            y += 8;
        });
    }
    
    // Skills
    if (data.skills.length > 0) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Skills', 20, y);
        y += 8;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        const skillsText = data.skills.map(s => s.name).join(', ');
        const skillsLines = doc.splitTextToSize(skillsText, 170);
        doc.text(skillsLines, 20, y);
    }
    
    // Save PDF
    doc.save('resume.pdf');
}

// Initialize
setupAutoSave();
