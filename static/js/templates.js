/* ===========================================
   RESUME TEMPLATE RENDERERS
   Each function returns an HTML string for a
   self-contained A4 resume page.
   =========================================== */

const ResumeTemplates = {

  // ---------- Color Theme Presets ----------
  _colorThemes: {
    indigo:  { primary: '#312E81', primaryRgb: '49,46,129',  light: '#EDE9FE', accent: '#4F46E5', accentLight: '#E0E7FF', text: '#312E81', pillBg: '#EDE9FE', pillText: '#4F46E5', gradientFrom: '#312E81', gradientTo: '#4F46E5' },
    blue:    { primary: '#1E40AF', primaryRgb: '30,64,175',  light: '#DBEAFE', accent: '#2563EB', accentLight: '#BFDBFE', text: '#1E40AF', pillBg: '#DBEAFE', pillText: '#2563EB', gradientFrom: '#1E40AF', gradientTo: '#3B82F6' },
    emerald: { primary: '#065F46', primaryRgb: '6,95,70',    light: '#D1FAE5', accent: '#059669', accentLight: '#A7F3D0', text: '#065F46', pillBg: '#D1FAE5', pillText: '#059669', gradientFrom: '#065F46', gradientTo: '#10B981' },
    rose:    { primary: '#9F1239', primaryRgb: '159,18,57',   light: '#FFE4E6', accent: '#E11D48', accentLight: '#FECDD3', text: '#9F1239', pillBg: '#FFE4E6', pillText: '#E11D48', gradientFrom: '#9F1239', gradientTo: '#F43F5E' },
    amber:   { primary: '#92400E', primaryRgb: '146,64,14',   light: '#FEF3C7', accent: '#D97706', accentLight: '#FDE68A', text: '#92400E', pillBg: '#FEF3C7', pillText: '#D97706', gradientFrom: '#92400E', gradientTo: '#F59E0B' },
    teal:    { primary: '#115E59', primaryRgb: '17,94,89',    light: '#CCFBF1', accent: '#0D9488', accentLight: '#99F6E4', text: '#115E59', pillBg: '#CCFBF1', pillText: '#0D9488', gradientFrom: '#115E59', gradientTo: '#14B8A6' },
    slate:   { primary: '#1E293B', primaryRgb: '30,41,59',    light: '#F1F5F9', accent: '#475569', accentLight: '#E2E8F0', text: '#1E293B', pillBg: '#F1F5F9', pillText: '#475569', gradientFrom: '#1E293B', gradientTo: '#475569' },
    purple:  { primary: '#7C3AED', primaryRgb: '124,58,237',  light: '#EDE9FE', accent: '#8B5CF6', accentLight: '#DDD6FE', text: '#7C3AED', pillBg: '#F3E8FF', pillText: '#7C3AED', gradientFrom: '#7C3AED', gradientTo: '#A78BFA' }
  },

  _getTheme(data) {
    const key = data.colorTheme || 'indigo';
    return this._colorThemes[key] || this._colorThemes.indigo;
  },

  // ---------- Photo Helper ----------
  _photoStyle(data, defaults = {}) {
    const size = data.photoSize || defaults.size || 90;
    const shape = data.photoShape || 'circle';
    const borderRadius = shape === 'circle' ? '50%' : '8px';
    return { size, borderRadius };
  },

  // ---------- Escape Helpers ----------
  _escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  },

  _nl2br(str) {
    if (!str) return '';
    return this._escapeHtml(str).replace(/\n/g, '<br>');
  },

  _bulletize(str) {
    if (!str) return '';
    return str.split('\n').filter(l => l.trim()).map(l => {
      const clean = l.replace(/^[\-•*]\s*/, '').trim();
      return `<li style="margin-bottom:3px;">${this._escapeHtml(clean)}</li>`;
    }).join('');
  },

  // ===========================================
  //  1. ATS CLASSIC — Clean single-column
  // ===========================================
  ats_classic(data) {
    const p = data.personalInfo || {};
    const t = this._getTheme(data);
    const contactParts = [p.email, p.phone, p.location, p.linkedin, p.website].filter(Boolean);
    return `
    <div style="width:794px;min-height:1123px;padding:50px 56px;font-family:'Inter',Arial,sans-serif;color:#1a1a1a;line-height:1.55;background:white;box-sizing:border-box;">
      <!-- Name -->
      <h1 style="font-size:28px;font-weight:800;margin:0 0 6px;letter-spacing:-0.5px;">${this._escapeHtml(p.fullName || 'Your Name')}</h1>
      <!-- Contact -->
      ${contactParts.length ? `<p style="font-size:11px;color:#6B7280;margin:0 0 18px;word-break:break-all;">${contactParts.map(c => this._escapeHtml(c)).join('  •  ')}</p>` : ''}

      <!-- Summary -->
      ${data.summary ? `
      <div style="margin-bottom:18px;">
        <h2 style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${t.text};border-bottom:2px solid ${t.light};padding-bottom:4px;margin:0 0 8px;">Professional Summary</h2>
        <p style="font-size:12px;color:#4B5563;margin:0;line-height:1.6;">${this._nl2br(data.summary)}</p>
      </div>` : ''}

      <!-- Experience -->
      ${data.experience && data.experience.length ? `
      <div style="margin-bottom:18px;">
        <h2 style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${t.text};border-bottom:2px solid ${t.light};padding-bottom:4px;margin:0 0 10px;">Work Experience</h2>
        ${data.experience.map(exp => `
        <div style="margin-bottom:12px;">
          <div style="display:flex;justify-content:space-between;align-items:baseline;">
            <strong style="font-size:13px;">${this._escapeHtml(exp.title || '')}</strong>
            <span style="font-size:11px;color:#6B7280;">${this._escapeHtml(exp.startDate || '')} – ${this._escapeHtml(exp.endDate || '')}</span>
          </div>
          <div style="font-size:12px;color:#6B7280;margin-bottom:4px;">${this._escapeHtml(exp.company || '')}</div>
          ${exp.description ? `<ul style="font-size:11.5px;color:#4B5563;margin:0;padding-left:18px;list-style:disc;">${this._bulletize(exp.description)}</ul>` : ''}
        </div>`).join('')}
      </div>` : ''}

      <!-- Education -->
      ${data.education && data.education.length ? `
      <div style="margin-bottom:18px;">
        <h2 style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${t.text};border-bottom:2px solid ${t.light};padding-bottom:4px;margin:0 0 10px;">Education</h2>
        ${data.education.map(edu => `
        <div style="margin-bottom:8px;">
          <div style="display:flex;justify-content:space-between;align-items:baseline;">
            <strong style="font-size:13px;">${this._escapeHtml(edu.degree || '')} — ${this._escapeHtml(edu.school || '')}</strong>
            <span style="font-size:11px;color:#6B7280;">${this._escapeHtml(edu.startDate || '')} – ${this._escapeHtml(edu.endDate || '')}</span>
          </div>
          ${edu.gpa ? `<div style="font-size:11px;color:#6B7280;">GPA: ${this._escapeHtml(edu.gpa)}</div>` : ''}
        </div>`).join('')}
      </div>` : ''}

      <!-- Skills -->
      ${data.skills && data.skills.length ? `
      <div style="margin-bottom:18px;">
        <h2 style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${t.text};border-bottom:2px solid ${t.light};padding-bottom:4px;margin:0 0 8px;">Skills</h2>
        <p style="font-size:12px;color:#4B5563;margin:0;">${data.skills.map(s => this._escapeHtml(s.name)).join('  •  ')}</p>
      </div>` : ''}

      <!-- Projects -->
      ${data.projects && data.projects.length ? `
      <div style="margin-bottom:18px;">
        <h2 style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${t.text};border-bottom:2px solid ${t.light};padding-bottom:4px;margin:0 0 10px;">Projects</h2>
        ${data.projects.map(proj => `
        <div style="margin-bottom:8px;">
          <strong style="font-size:13px;">${this._escapeHtml(proj.name || '')}</strong>
          ${proj.description ? `<p style="font-size:11.5px;color:#4B5563;margin:4px 0 0;">${this._nl2br(proj.description)}</p>` : ''}
        </div>`).join('')}
      </div>` : ''}
    </div>`;
  },

  // ===========================================
  //  2. MODERN TWO-COLUMN
  // ===========================================
  canva_modern_1(data) {
    const p = data.personalInfo || {};
    const t = this._getTheme(data);
    const ps = this._photoStyle(data, { size: 90 });
    const photoHtml = p.photoUrl ? `<img src="${p.photoUrl}" style="width:${ps.size}px;height:${ps.size}px;border-radius:${ps.borderRadius};object-fit:cover;border:3px solid rgba(255,255,255,0.3);margin-bottom:16px;">` : '';

    return `
    <div style="width:794px;min-height:1123px;display:flex;font-family:'Inter',Arial,sans-serif;color:#1a1a1a;line-height:1.5;background:white;box-sizing:border-box;">
      <!-- Sidebar -->
      <div style="width:260px;background:${t.primary};color:white;padding:40px 24px;flex-shrink:0;">
        <div style="text-align:center;margin-bottom:24px;">
          ${photoHtml}
          <h1 style="font-size:20px;font-weight:800;margin:0 0 4px;line-height:1.2;">${this._escapeHtml(p.fullName || 'Your Name')}</h1>
        </div>

        <!-- Contact -->
        <div style="margin-bottom:24px;">
          <h3 style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,0.6);margin:0 0 10px;border-bottom:1px solid rgba(255,255,255,0.15);padding-bottom:6px;">Contact</h3>
          ${p.email ? `<p style="font-size:11px;margin:0 0 6px;word-break:break-all;">✉ ${this._escapeHtml(p.email)}</p>` : ''}
          ${p.phone ? `<p style="font-size:11px;margin:0 0 6px;">☎ ${this._escapeHtml(p.phone)}</p>` : ''}
          ${p.location ? `<p style="font-size:11px;margin:0 0 6px;">📍 ${this._escapeHtml(p.location)}</p>` : ''}
          ${p.linkedin ? `<p style="font-size:11px;margin:0 0 6px;word-break:break-all;">🔗 ${this._escapeHtml(p.linkedin)}</p>` : ''}
          ${p.website ? `<p style="font-size:11px;margin:0 0 6px;word-break:break-all;">🌐 ${this._escapeHtml(p.website)}</p>` : ''}
        </div>

        <!-- Skills -->
        ${data.skills && data.skills.length ? `
        <div style="margin-bottom:24px;">
          <h3 style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,0.6);margin:0 0 10px;border-bottom:1px solid rgba(255,255,255,0.15);padding-bottom:6px;">Skills</h3>
          ${data.skills.map(s => `<div style="font-size:11px;margin-bottom:5px;padding:4px 8px;background:rgba(255,255,255,0.1);border-radius:4px;">${this._escapeHtml(s.name)}</div>`).join('')}
        </div>` : ''}

        <!-- Education -->
        ${data.education && data.education.length ? `
        <div>
          <h3 style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,0.6);margin:0 0 10px;border-bottom:1px solid rgba(255,255,255,0.15);padding-bottom:6px;">Education</h3>
          ${data.education.map(edu => `
          <div style="margin-bottom:10px;">
            <div style="font-size:11.5px;font-weight:600;">${this._escapeHtml(edu.degree || '')}</div>
            <div style="font-size:10.5px;color:rgba(255,255,255,0.7);">${this._escapeHtml(edu.school || '')}</div>
            <div style="font-size:10px;color:rgba(255,255,255,0.5);">${this._escapeHtml(edu.startDate || '')} – ${this._escapeHtml(edu.endDate || '')}</div>
          </div>`).join('')}
        </div>` : ''}
      </div>

      <!-- Main Content -->
      <div style="flex:1;padding:40px 36px;">
        <!-- Summary -->
        ${data.summary ? `
        <div style="margin-bottom:24px;">
          <h2 style="font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${t.text};margin:0 0 8px;border-bottom:2px solid ${t.light};padding-bottom:4px;">About Me</h2>
          <p style="font-size:12px;color:#4B5563;margin:0;line-height:1.6;">${this._nl2br(data.summary)}</p>
        </div>` : ''}

        <!-- Experience -->
        ${data.experience && data.experience.length ? `
        <div style="margin-bottom:24px;">
          <h2 style="font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${t.text};margin:0 0 10px;border-bottom:2px solid ${t.light};padding-bottom:4px;">Experience</h2>
          ${data.experience.map(exp => `
          <div style="margin-bottom:14px;">
            <strong style="font-size:13px;">${this._escapeHtml(exp.title || '')}</strong>
            <span style="font-size:11px;color:#6B7280;"> — ${this._escapeHtml(exp.company || '')}</span>
            <div style="font-size:10.5px;color:#9CA3AF;margin-bottom:4px;">${this._escapeHtml(exp.startDate || '')} – ${this._escapeHtml(exp.endDate || '')}</div>
            ${exp.description ? `<ul style="font-size:11.5px;color:#4B5563;margin:0;padding-left:16px;list-style:disc;">${this._bulletize(exp.description)}</ul>` : ''}
          </div>`).join('')}
        </div>` : ''}

        <!-- Projects -->
        ${data.projects && data.projects.length ? `
        <div>
          <h2 style="font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${t.text};margin:0 0 10px;border-bottom:2px solid ${t.light};padding-bottom:4px;">Projects</h2>
          ${data.projects.map(proj => `
          <div style="margin-bottom:10px;">
            <strong style="font-size:12.5px;">${this._escapeHtml(proj.name || '')}</strong>
            ${proj.description ? `<p style="font-size:11px;color:#4B5563;margin:3px 0 0;">${this._nl2br(proj.description)}</p>` : ''}
          </div>`).join('')}
        </div>` : ''}
      </div>
    </div>`;
  },

  // ===========================================
  //  3. CREATIVE BANNER
  // ===========================================
  canva_creative_2(data) {
    const p = data.personalInfo || {};
    const t = this._getTheme(data);
    const ps = this._photoStyle(data, { size: 80 });
    const contactParts = [p.email, p.phone, p.location].filter(Boolean);
    const photoHtml = p.photoUrl ? `<img src="${p.photoUrl}" style="width:${ps.size}px;height:${ps.size}px;border-radius:${ps.borderRadius};object-fit:cover;border:3px solid rgba(255,255,255,0.4);">` : '';

    return `
    <div style="width:794px;min-height:1123px;font-family:'Inter',Arial,sans-serif;color:#1a1a1a;line-height:1.5;background:white;box-sizing:border-box;">
      <!-- Banner -->
      <div style="background:linear-gradient(135deg,${t.gradientFrom},${t.gradientTo});color:white;padding:36px 50px;display:flex;align-items:center;gap:24px;">
        ${photoHtml}
        <div>
          <h1 style="font-size:28px;font-weight:800;margin:0 0 4px;letter-spacing:-0.5px;">${this._escapeHtml(p.fullName || 'Your Name')}</h1>
          ${contactParts.length ? `<p style="font-size:11.5px;margin:0;opacity:0.85;">${contactParts.map(c => this._escapeHtml(c)).join('  |  ')}</p>` : ''}
          ${p.linkedin || p.website ? `<p style="font-size:11px;margin:4px 0 0;opacity:0.7;">${[p.linkedin, p.website].filter(Boolean).map(c => this._escapeHtml(c)).join('  |  ')}</p>` : ''}
        </div>
      </div>

      <div style="padding:30px 50px;">
        <!-- Summary -->
        ${data.summary ? `
        <div style="margin-bottom:22px;">
          <h2 style="font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${t.accent};margin:0 0 8px;">Profile</h2>
          <p style="font-size:12px;color:#4B5563;margin:0;line-height:1.6;">${this._nl2br(data.summary)}</p>
        </div>` : ''}

        <div style="display:flex;gap:30px;">
          <!-- Left Column -->
          <div style="flex:1.2;">
            <!-- Experience -->
            ${data.experience && data.experience.length ? `
            <div style="margin-bottom:22px;">
              <h2 style="font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${t.accent};margin:0 0 10px;">Experience</h2>
              ${data.experience.map(exp => `
              <div style="margin-bottom:14px;padding-left:12px;border-left:3px solid ${t.light};">
                <strong style="font-size:13px;">${this._escapeHtml(exp.title || '')}</strong>
                <div style="font-size:11.5px;color:#6B7280;">${this._escapeHtml(exp.company || '')} • ${this._escapeHtml(exp.startDate || '')} – ${this._escapeHtml(exp.endDate || '')}</div>
                ${exp.description ? `<ul style="font-size:11px;color:#4B5563;margin:4px 0 0;padding-left:14px;list-style:disc;">${this._bulletize(exp.description)}</ul>` : ''}
              </div>`).join('')}
            </div>` : ''}

            <!-- Projects -->
            ${data.projects && data.projects.length ? `
            <div>
              <h2 style="font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${t.accent};margin:0 0 10px;">Projects</h2>
              ${data.projects.map(proj => `
              <div style="margin-bottom:10px;padding-left:12px;border-left:3px solid ${t.light};">
                <strong style="font-size:12px;">${this._escapeHtml(proj.name || '')}</strong>
                ${proj.description ? `<p style="font-size:11px;color:#4B5563;margin:3px 0 0;">${this._nl2br(proj.description)}</p>` : ''}
              </div>`).join('')}
            </div>` : ''}
          </div>

          <!-- Right Column -->
          <div style="width:220px;flex-shrink:0;">
            <!-- Education -->
            ${data.education && data.education.length ? `
            <div style="margin-bottom:22px;">
              <h2 style="font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${t.accent};margin:0 0 10px;">Education</h2>
              ${data.education.map(edu => `
              <div style="margin-bottom:10px;">
                <strong style="font-size:12px;">${this._escapeHtml(edu.degree || '')}</strong>
                <div style="font-size:11px;color:#6B7280;">${this._escapeHtml(edu.school || '')}</div>
                <div style="font-size:10px;color:#9CA3AF;">${this._escapeHtml(edu.startDate || '')} – ${this._escapeHtml(edu.endDate || '')}</div>
              </div>`).join('')}
            </div>` : ''}

            <!-- Skills -->
            ${data.skills && data.skills.length ? `
            <div>
              <h2 style="font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${t.accent};margin:0 0 10px;">Skills</h2>
              <div style="display:flex;flex-wrap:wrap;gap:5px;">
                ${data.skills.map(s => `<span style="font-size:10.5px;padding:3px 10px;background:${t.pillBg};color:${t.pillText};border-radius:12px;font-weight:500;">${this._escapeHtml(s.name)}</span>`).join('')}
              </div>
            </div>` : ''}
          </div>
        </div>
      </div>
    </div>`;
  },

  // ===========================================
  //  4. MINIMAL ELEGANT
  // ===========================================
  canva_minimal_3(data) {
    const p = data.personalInfo || {};
    const t = this._getTheme(data);
    const contactParts = [p.email, p.phone, p.location, p.linkedin].filter(Boolean);

    return `
    <div style="width:794px;min-height:1123px;padding:60px 64px;font-family:'Inter',Arial,sans-serif;color:#1a1a1a;line-height:1.55;background:white;box-sizing:border-box;">
      <!-- Header -->
      <div style="text-align:center;margin-bottom:28px;padding-bottom:20px;border-bottom:1px solid ${t.light};">
        <h1 style="font-size:32px;font-weight:300;margin:0 0 8px;letter-spacing:3px;text-transform:uppercase;color:#111;">${this._escapeHtml(p.fullName || 'Your Name')}</h1>
        ${contactParts.length ? `<p style="font-size:11px;color:#9CA3AF;margin:0;letter-spacing:0.5px;">${contactParts.map(c => this._escapeHtml(c)).join('   ·   ')}</p>` : ''}
        ${p.website ? `<p style="font-size:11px;color:#9CA3AF;margin:4px 0 0;">${this._escapeHtml(p.website)}</p>` : ''}
      </div>

      <!-- Summary -->
      ${data.summary ? `
      <div style="margin-bottom:24px;">
        <h2 style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:2px;color:${t.accent};margin:0 0 10px;">About</h2>
        <p style="font-size:12px;color:#4B5563;margin:0;line-height:1.7;">${this._nl2br(data.summary)}</p>
      </div>` : ''}

      <!-- Experience -->
      ${data.experience && data.experience.length ? `
      <div style="margin-bottom:24px;">
        <h2 style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:2px;color:${t.accent};margin:0 0 12px;">Experience</h2>
        ${data.experience.map(exp => `
        <div style="margin-bottom:16px;">
          <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2px;">
            <span style="font-size:14px;font-weight:600;">${this._escapeHtml(exp.title || '')}</span>
            <span style="font-size:11px;color:#9CA3AF;font-style:italic;">${this._escapeHtml(exp.startDate || '')} – ${this._escapeHtml(exp.endDate || '')}</span>
          </div>
          <div style="font-size:12px;color:#6B7280;margin-bottom:6px;">${this._escapeHtml(exp.company || '')}</div>
          ${exp.description ? `<ul style="font-size:11.5px;color:#4B5563;margin:0;padding-left:16px;list-style:none;">${exp.description.split('\n').filter(l => l.trim()).map(l => `<li style="margin-bottom:3px;position:relative;padding-left:10px;"><span style="position:absolute;left:0;color:#D1D5DB;">—</span>${this._escapeHtml(l.replace(/^[\-•*]\s*/, '').trim())}</li>`).join('')}</ul>` : ''}
        </div>`).join('')}
      </div>` : ''}

      <!-- Education -->
      ${data.education && data.education.length ? `
      <div style="margin-bottom:24px;">
        <h2 style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:2px;color:${t.accent};margin:0 0 12px;">Education</h2>
        ${data.education.map(edu => `
        <div style="margin-bottom:10px;display:flex;justify-content:space-between;align-items:baseline;">
          <div>
            <span style="font-size:13px;font-weight:600;">${this._escapeHtml(edu.degree || '')}</span>
            <span style="font-size:12px;color:#6B7280;"> · ${this._escapeHtml(edu.school || '')}</span>
            ${edu.gpa ? `<span style="font-size:11px;color:#9CA3AF;"> · GPA ${this._escapeHtml(edu.gpa)}</span>` : ''}
          </div>
          <span style="font-size:11px;color:#9CA3AF;font-style:italic;">${this._escapeHtml(edu.startDate || '')} – ${this._escapeHtml(edu.endDate || '')}</span>
        </div>`).join('')}
      </div>` : ''}

      <!-- Skills -->
      ${data.skills && data.skills.length ? `
      <div style="margin-bottom:24px;">
        <h2 style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:2px;color:${t.accent};margin:0 0 10px;">Skills</h2>
        <p style="font-size:12px;color:#4B5563;margin:0;">${data.skills.map(s => this._escapeHtml(s.name)).join('   ·   ')}</p>
      </div>` : ''}

      <!-- Projects -->
      ${data.projects && data.projects.length ? `
      <div>
        <h2 style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:2px;color:${t.accent};margin:0 0 12px;">Projects</h2>
        ${data.projects.map(proj => `
        <div style="margin-bottom:10px;">
          <strong style="font-size:13px;">${this._escapeHtml(proj.name || '')}</strong>
          ${proj.description ? `<p style="font-size:11.5px;color:#4B5563;margin:3px 0 0;">${this._nl2br(proj.description)}</p>` : ''}
        </div>`).join('')}
      </div>` : ''}
    </div>`;
  },

  // ===========================================
  //  5. EXECUTIVE DARK HEADER
  // ===========================================
  canva_executive_4(data) {
    const p = data.personalInfo || {};
    const t = this._getTheme(data);
    const ps = this._photoStyle(data, { size: 70 });
    const contactParts = [p.email, p.phone, p.location].filter(Boolean);
    // Executive uses a gold accent by default but adapts to theme
    const headerBg = t.primary === '#1E293B' ? '#0F172A' : t.primary;
    const accentLine = t.primary === '#92400E' ? 'linear-gradient(90deg,#D4AF37,#F4D03F,#D4AF37)' : `linear-gradient(90deg,${t.gradientFrom},${t.gradientTo},${t.gradientFrom})`;
    const photoHtml = p.photoUrl ? `<img src="${p.photoUrl}" style="width:${ps.size}px;height:${ps.size}px;border-radius:${ps.borderRadius};object-fit:cover;border:3px solid rgba(255,255,255,0.3);">` : '';

    return `
    <div style="width:794px;min-height:1123px;font-family:'Inter',Arial,sans-serif;color:#1a1a1a;line-height:1.5;background:white;box-sizing:border-box;">
      <!-- Dark Header -->
      <div style="background:${headerBg};color:white;padding:36px 50px;display:flex;align-items:center;gap:20px;">
        ${photoHtml}
        <div style="flex:1;">
          <h1 style="font-size:26px;font-weight:800;margin:0 0 4px;letter-spacing:-0.3px;">${this._escapeHtml(p.fullName || 'Your Name')}</h1>
          ${contactParts.length ? `<p style="font-size:11px;margin:0;color:rgba(255,255,255,0.7);">${contactParts.map(c => this._escapeHtml(c)).join('   |   ')}</p>` : ''}
          ${p.linkedin || p.website ? `<p style="font-size:10.5px;margin:4px 0 0;color:rgba(255,255,255,0.5);">${[p.linkedin, p.website].filter(Boolean).map(c => this._escapeHtml(c)).join('  |  ')}</p>` : ''}
        </div>
      </div>

      <!-- Accent line -->
      <div style="height:3px;background:${accentLine};"></div>

      <div style="padding:30px 50px;">
        <!-- Summary -->
        ${data.summary ? `
        <div style="margin-bottom:22px;">
          <h2 style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:${t.text};margin:0 0 8px;padding-bottom:4px;border-bottom:1px solid ${t.light};">Summary</h2>
          <p style="font-size:12px;color:#475569;margin:0;line-height:1.6;">${this._nl2br(data.summary)}</p>
        </div>` : ''}

        <!-- Experience -->
        ${data.experience && data.experience.length ? `
        <div style="margin-bottom:22px;">
          <h2 style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:${t.text};margin:0 0 10px;padding-bottom:4px;border-bottom:1px solid ${t.light};">Professional Experience</h2>
          ${data.experience.map(exp => `
          <div style="margin-bottom:14px;">
            <div style="display:flex;justify-content:space-between;align-items:baseline;">
              <strong style="font-size:13px;color:${t.text};">${this._escapeHtml(exp.title || '')}</strong>
              <span style="font-size:10.5px;color:#94A3B8;font-weight:500;">${this._escapeHtml(exp.startDate || '')} – ${this._escapeHtml(exp.endDate || '')}</span>
            </div>
            <div style="font-size:12px;color:#64748B;margin-bottom:4px;font-style:italic;">${this._escapeHtml(exp.company || '')}</div>
            ${exp.description ? `<ul style="font-size:11px;color:#475569;margin:0;padding-left:16px;list-style:disc;">${this._bulletize(exp.description)}</ul>` : ''}
          </div>`).join('')}
        </div>` : ''}

        <div style="display:flex;gap:36px;">
          <!-- Education -->
          <div style="flex:1;">
            ${data.education && data.education.length ? `
            <div style="margin-bottom:22px;">
              <h2 style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:${t.text};margin:0 0 10px;padding-bottom:4px;border-bottom:1px solid ${t.light};">Education</h2>
              ${data.education.map(edu => `
              <div style="margin-bottom:8px;">
                <strong style="font-size:12px;">${this._escapeHtml(edu.degree || '')}</strong>
                <div style="font-size:11px;color:#64748B;">${this._escapeHtml(edu.school || '')} · ${this._escapeHtml(edu.startDate || '')} – ${this._escapeHtml(edu.endDate || '')}</div>
              </div>`).join('')}
            </div>` : ''}

            <!-- Projects -->
            ${data.projects && data.projects.length ? `
            <div>
              <h2 style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:${t.text};margin:0 0 10px;padding-bottom:4px;border-bottom:1px solid ${t.light};">Projects</h2>
              ${data.projects.map(proj => `
              <div style="margin-bottom:8px;">
                <strong style="font-size:12px;">${this._escapeHtml(proj.name || '')}</strong>
                ${proj.description ? `<p style="font-size:11px;color:#475569;margin:3px 0 0;">${this._nl2br(proj.description)}</p>` : ''}
              </div>`).join('')}
            </div>` : ''}
          </div>

          <!-- Skills -->
          ${data.skills && data.skills.length ? `
          <div style="width:200px;flex-shrink:0;">
            <h2 style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:${t.text};margin:0 0 10px;padding-bottom:4px;border-bottom:1px solid ${t.light};">Expertise</h2>
            ${data.skills.map(s => `<div style="font-size:11px;padding:5px 0;border-bottom:1px solid #F1F5F9;color:#475569;">${this._escapeHtml(s.name)}</div>`).join('')}
          </div>` : ''}
        </div>
      </div>
    </div>`;
  },

  // ===========================================
  //  Render by template key
  // ===========================================
  render(templateKey, data) {
    const fn = this[templateKey];
    if (fn && typeof fn === 'function') {
      return fn.call(this, data);
    }
    return this.ats_classic(data);
  }
};
