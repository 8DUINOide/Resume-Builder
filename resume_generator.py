from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.platypus.flowables import KeepTogether
from PIL import Image as PILImage
import os
import io
import requests

class ResumeGenerator:
    def __init__(self):
        self.page_size = letter
        self.margin = 0.5 * inch
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
    
    def _setup_custom_styles(self):
        """Setup custom paragraph styles"""
        # Header styles
        self.styles.add(ParagraphStyle(
            name='CustomHeader',
            parent=self.styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#2C3E50'),
            spaceAfter=12,
            spaceBefore=12,
            alignment=1  # Center
        ))
        
        self.styles.add(ParagraphStyle(
            name='SectionHeader',
            parent=self.styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#2C3E50'),
            spaceAfter=6,
            spaceBefore=12,
            fontName='Helvetica-Bold'
        ))
        
        # Body styles
        self.styles.add(ParagraphStyle(
            name='CustomBody',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#34495E'),
            spaceAfter=6,
            leading=14
        ))
        
        self.styles.add(ParagraphStyle(
            name='ContactInfo',
            parent=self.styles['Normal'],
            fontSize=9,
            textColor=colors.HexColor('#7F8C8D'),
            spaceAfter=3,
            alignment=1
        ))
        
        # Canva-specific styles
        self.styles.add(ParagraphStyle(
            name='CanvaHeader',
            parent=self.styles['Heading1'],
            fontSize=28,
            textColor=colors.white,
            spaceAfter=12,
            fontName='Helvetica-Bold'
        ))
        
        self.styles.add(ParagraphStyle(
            name='CanvaSection',
            parent=self.styles['Heading2'],
            fontSize=12,
            textColor=colors.HexColor('#E74C3C'),
            spaceAfter=8,
            spaceBefore=16,
            fontName='Helvetica-Bold'
        ))
    
    def _load_image(self, image_url_or_path, max_width=2*inch, max_height=2.5*inch):
        """Load image from URL or local path"""
        try:
            # Check if it's a URL
            if image_url_or_path.startswith(('http://', 'https://')):
                response = requests.get(image_url_or_path, timeout=10)
                img = PILImage.open(io.BytesIO(response.content))
            else:
                # Local path
                img = PILImage.open(image_url_or_path)
            
            # Convert to RGB if necessary
            if img.mode != 'RGB':
                img = img.convert('RGB')
            
            # Resize maintaining aspect ratio
            img.thumbnail((max_width, max_height), PILImage.Resampling.LANCZOS)
            
            # Save to bytes
            img_bytes = io.BytesIO()
            img.save(img_bytes, format='JPEG')
            img_bytes.seek(0)
            
            return Image(img_bytes, width=img.width, height=img.height)
        except Exception as e:
            print(f"Error loading image: {e}")
            return None
    
    def _get_personal_info(self, resume_data):
        """Extract personal info from resume data"""
        personal = resume_data.get('personalInfo', {})
        return {
            'fullName': personal.get('fullName', ''),
            'email': personal.get('email', ''),
            'phone': personal.get('phone', ''),
            'location': personal.get('location', ''),
            'photoUrl': personal.get('photoUrl', ''),
            'linkedin': personal.get('linkedin', ''),
            'website': personal.get('website', '')
        }
    
    def _format_contact_line(self, personal):
        """Format contact information line"""
        contact_parts = []
        if personal['email']:
            contact_parts.append(personal['email'])
        if personal['phone']:
            contact_parts.append(personal['phone'])
        if personal['location']:
            contact_parts.append(personal['location'])
        return ' | '.join(contact_parts)
    
    def build_ats_classic(self, resume_data, output_path):
        """Build ATS-friendly classic resume"""
        doc = SimpleDocTemplate(
            output_path,
            pagesize=self.page_size,
            leftMargin=self.margin,
            rightMargin=self.margin,
            topMargin=self.margin,
            bottomMargin=self.margin
        )
        
        story = []
        personal = self._get_personal_info(resume_data)
        
        # Header
        story.append(Paragraph(personal['fullName'], self.styles['CustomHeader']))
        story.append(Paragraph(self._format_contact_line(personal), self.styles['ContactInfo']))
        story.append(Spacer(1, 0.2*inch))
        
        # Summary
        summary = resume_data.get('summary', '')
        if summary:
            story.append(Paragraph('Professional Summary', self.styles['SectionHeader']))
            story.append(Paragraph(summary, self.styles['CustomBody']))
            story.append(Spacer(1, 0.15*inch))
        
        # Experience
        experience = resume_data.get('experience', [])
        if experience:
            story.append(Paragraph('Work Experience', self.styles['SectionHeader']))
            for exp in experience:
                story.append(Paragraph(
                    f"{exp.get('title', '')} - {exp.get('company', '')}",
                    self.styles['Heading3']
                ))
                story.append(Paragraph(
                    f"{exp.get('startDate', '')} - {exp.get('endDate', 'Present')}",
                    self.styles['Italic']
                ))
                story.append(Paragraph(exp.get('description', ''), self.styles['CustomBody']))
                story.append(Spacer(1, 0.1*inch))
            story.append(Spacer(1, 0.15*inch))
        
        # Education
        education = resume_data.get('education', [])
        if education:
            story.append(Paragraph('Education', self.styles['SectionHeader']))
            for edu in education:
                story.append(Paragraph(
                    f"{edu.get('degree', '')} - {edu.get('school', '')}",
                    self.styles['Heading3']
                ))
                story.append(Paragraph(
                    f"{edu.get('startDate', '')} - {edu.get('endDate', '')}",
                    self.styles['Italic']
                ))
                if edu.get('gpa'):
                    story.append(Paragraph(f"GPA: {edu['gpa']}", self.styles['CustomBody']))
                story.append(Spacer(1, 0.1*inch))
            story.append(Spacer(1, 0.15*inch))
        
        # Skills
        skills = resume_data.get('skills', [])
        if skills:
            story.append(Paragraph('Skills', self.styles['SectionHeader']))
            skills_text = ', '.join([skill.get('name', '') for skill in skills])
            story.append(Paragraph(skills_text, self.styles['CustomBody']))
            story.append(Spacer(1, 0.15*inch))
        
        # Projects
        projects = resume_data.get('projects', [])
        if projects:
            story.append(Paragraph('Projects', self.styles['SectionHeader']))
            for proj in projects:
                story.append(Paragraph(proj.get('name', ''), self.styles['Heading3']))
                story.append(Paragraph(proj.get('description', ''), self.styles['CustomBody']))
                story.append(Spacer(1, 0.1*inch))
        
        doc.build(story)
    
    def build_canva_modern_1(self, resume_data, output_path):
        """Build modern Canva design 1 - Two-column layout"""
        doc = SimpleDocTemplate(
            output_path,
            pagesize=self.page_size,
            leftMargin=self.margin,
            rightMargin=self.margin,
            topMargin=self.margin,
            bottomMargin=self.margin
        )
        
        story = []
        personal = self._get_personal_info(resume_data)
        
        # Create two-column layout
        left_col = []
        right_col = []
        
        # Left column - Photo and contact
        if personal['photoUrl']:
            img = self._load_image(personal['photoUrl'], 1.8*inch, 2.2*inch)
            if img:
                left_col.append(img)
                left_col.append(Spacer(1, 0.15*inch))
        
        left_col.append(Paragraph('Contact', self.styles['SectionHeader']))
        left_col.append(Paragraph(personal['email'], self.styles['CustomBody']))
        left_col.append(Paragraph(personal['phone'], self.styles['CustomBody']))
        left_col.append(Paragraph(personal['location'], self.styles['CustomBody']))
        left_col.append(Spacer(1, 0.2*inch))
        
        # Skills in left column
        skills = resume_data.get('skills', [])
        if skills:
            left_col.append(Paragraph('Skills', self.styles['SectionHeader']))
            for skill in skills:
                left_col.append(Paragraph(f"• {skill.get('name', '')}", self.styles['CustomBody']))
            left_col.append(Spacer(1, 0.2*inch))
        
        # Right column - Main content
        right_col.append(Paragraph(personal['fullName'], self.styles['CustomHeader']))
        right_col.append(Spacer(1, 0.2*inch))
        
        # Summary
        summary = resume_data.get('summary', '')
        if summary:
            right_col.append(Paragraph('Professional Summary', self.styles['SectionHeader']))
            right_col.append(Paragraph(summary, self.styles['CustomBody']))
            right_col.append(Spacer(1, 0.2*inch))
        
        # Experience
        experience = resume_data.get('experience', [])
        if experience:
            right_col.append(Paragraph('Work Experience', self.styles['SectionHeader']))
            for exp in experience:
                right_col.append(Paragraph(
                    f"{exp.get('title', '')} - {exp.get('company', '')}",
                    self.styles['Heading3']
                ))
                right_col.append(Paragraph(
                    f"{exp.get('startDate', '')} - {exp.get('endDate', 'Present')}",
                    self.styles['Italic']
                ))
                right_col.append(Paragraph(exp.get('description', ''), self.styles['CustomBody']))
                right_col.append(Spacer(1, 0.15*inch))
            right_col.append(Spacer(1, 0.2*inch))
        
        # Education
        education = resume_data.get('education', [])
        if education:
            right_col.append(Paragraph('Education', self.styles['SectionHeader']))
            for edu in education:
                right_col.append(Paragraph(
                    f"{edu.get('degree', '')} - {edu.get('school', '')}",
                    self.styles['Heading3']
                ))
                right_col.append(Paragraph(
                    f"{edu.get('startDate', '')} - {edu.get('endDate', '')}",
                    self.styles['Italic']
                ))
                right_col.append(Spacer(1, 0.1*inch))
        
        # Projects
        projects = resume_data.get('projects', [])
        if projects:
            right_col.append(Paragraph('Projects', self.styles['SectionHeader']))
            for proj in projects:
                right_col.append(Paragraph(proj.get('name', ''), self.styles['Heading3']))
                right_col.append(Paragraph(proj.get('description', ''), self.styles['CustomBody']))
                right_col.append(Spacer(1, 0.1*inch))
        
        # Combine columns
        col_width = [2.5*inch, 3.5*inch]
        data = []
        max_len = max(len(left_col), len(right_col))
        
        for i in range(max_len):
            row = []
            if i < len(left_col):
                row.append(left_col[i])
            else:
                row.append('')
            if i < len(right_col):
                row.append(right_col[i])
            else:
                row.append('')
            data.append(row)
        
        table = Table(data, colWidths=col_width)
        table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ]))
        
        story.append(table)
        doc.build(story)
    
    def build_canva_creative_2(self, resume_data, output_path):
        """Build creative Canva design 2 - Accent header banner"""
        doc = SimpleDocTemplate(
            output_path,
            pagesize=self.page_size,
            leftMargin=self.margin,
            rightMargin=self.margin,
            topMargin=self.margin,
            bottomMargin=self.margin
        )
        
        story = []
        personal = self._get_personal_info(resume_data)
        
        # Create accent header banner
        header_data = [
            [colors.HexColor('#E74C3C'), ''],
            ['', '']
        ]
        header_table = Table(header_data, colWidths=[letter[0]-2*self.margin, 0.8*inch], rowHeights=[1.2*inch, 0.3*inch])
        header_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, 0), colors.HexColor('#E74C3C')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        story.append(header_table)
        story.append(Spacer(1, -1.5*inch))
        
        # Name and title over banner
        story.append(Paragraph(personal['fullName'], self.styles['CanvaHeader']))
        story.append(Paragraph(self._format_contact_line(personal), self.styles['ContactInfo']))
        story.append(Spacer(1, 0.3*inch))
        
        # Summary
        summary = resume_data.get('summary', '')
        if summary:
            story.append(Paragraph('About Me', self.styles['CanvaSection']))
            story.append(Paragraph(summary, self.styles['CustomBody']))
            story.append(Spacer(1, 0.2*inch))
        
        # Experience
        experience = resume_data.get('experience', [])
        if experience:
            story.append(Paragraph('Experience', self.styles['CanvaSection']))
            for exp in experience:
                story.append(Paragraph(
                    f"{exp.get('title', '')} at {exp.get('company', '')}",
                    self.styles['Heading3']
                ))
                story.append(Paragraph(
                    f"{exp.get('startDate', '')} - {exp.get('endDate', 'Present')}",
                    self.styles['Italic']
                ))
                story.append(Paragraph(exp.get('description', ''), self.styles['CustomBody']))
                story.append(Spacer(1, 0.15*inch))
            story.append(Spacer(1, 0.2*inch))
        
        # Education
        education = resume_data.get('education', [])
        if education:
            story.append(Paragraph('Education', self.styles['CanvaSection']))
            for edu in education:
                story.append(Paragraph(
                    f"{edu.get('degree', '')} from {edu.get('school', '')}",
                    self.styles['Heading3']
                ))
                story.append(Paragraph(
                    f"{edu.get('startDate', '')} - {edu.get('endDate', '')}",
                    self.styles['Italic']
                ))
                story.append(Spacer(1, 0.1*inch))
        
        # Skills
        skills = resume_data.get('skills', [])
        if skills:
            story.append(Paragraph('Skills', self.styles['CanvaSection']))
            skills_text = ', '.join([skill.get('name', '') for skill in skills])
            story.append(Paragraph(skills_text, self.styles['CustomBody']))
        
        doc.build(story)
    
    def build_canva_minimal_3(self, resume_data, output_path):
        """Build minimalist Canva design 3 - Clean borders with pastel accents"""
        doc = SimpleDocTemplate(
            output_path,
            pagesize=self.page_size,
            leftMargin=self.margin,
            rightMargin=self.margin,
            topMargin=self.margin,
            bottomMargin=self.margin
        )
        
        story = []
        personal = self._get_personal_info(resume_data)
        
        # Minimal header
        story.append(Paragraph(personal['fullName'], self.styles['CustomHeader']))
        story.append(Paragraph(self._format_contact_line(personal), self.styles['ContactInfo']))
        story.append(Spacer(1, 0.3*inch))
        
        # Add subtle line separator
        story.append(Table([['']], colWidths=[letter[0]-2*self.margin], rowHeights=[2]))
        story[-1].setStyle(TableStyle([
            ('LINEABOVE', (0, 0), (-1, 0), 1, colors.HexColor('#BDC3C7')),
        ]))
        story.append(Spacer(1, 0.2*inch))
        
        # Summary with pastel accent
        summary = resume_data.get('summary', '')
        if summary:
            story.append(Paragraph('Summary', self.styles['SectionHeader']))
            story.append(Paragraph(summary, self.styles['CustomBody']))
            story.append(Spacer(1, 0.2*inch))
        
        # Experience
        experience = resume_data.get('experience', [])
        if experience:
            story.append(Paragraph('Experience', self.styles['SectionHeader']))
            for exp in experience:
                story.append(Paragraph(
                    f"{exp.get('title', '')} | {exp.get('company', '')}",
                    self.styles['Heading3']
                ))
                story.append(Paragraph(
                    f"{exp.get('startDate', '')} — {exp.get('endDate', 'Present')}",
                    self.styles['Italic']
                ))
                story.append(Paragraph(exp.get('description', ''), self.styles['CustomBody']))
                story.append(Spacer(1, 0.15*inch))
            story.append(Spacer(1, 0.2*inch))
        
        # Education
        education = resume_data.get('education', [])
        if education:
            story.append(Paragraph('Education', self.styles['SectionHeader']))
            for edu in education:
                story.append(Paragraph(
                    f"{edu.get('degree', '')} | {edu.get('school', '')}",
                    self.styles['Heading3']
                ))
                story.append(Paragraph(
                    f"{edu.get('startDate', '')} — {edu.get('endDate', '')}",
                    self.styles['Italic']
                ))
                story.append(Spacer(1, 0.1*inch))
        
        # Skills
        skills = resume_data.get('skills', [])
        if skills:
            story.append(Paragraph('Skills', self.styles['SectionHeader']))
            for skill in skills:
                story.append(Paragraph(f"• {skill.get('name', '')}", self.styles['CustomBody']))
        
        # Projects
        projects = resume_data.get('projects', [])
        if projects:
            story.append(Spacer(1, 0.2*inch))
            story.append(Paragraph('Projects', self.styles['SectionHeader']))
            for proj in projects:
                story.append(Paragraph(proj.get('name', ''), self.styles['Heading3']))
                story.append(Paragraph(proj.get('description', ''), self.styles['CustomBody']))
                story.append(Spacer(1, 0.1*inch))
        
        doc.build(story)
    
    def build_canva_executive_4(self, resume_data, output_path):
        """Build executive Canva design 4 - Formal dark accent header"""
        doc = SimpleDocTemplate(
            output_path,
            pagesize=self.page_size,
            leftMargin=self.margin,
            rightMargin=self.margin,
            topMargin=self.margin,
            bottomMargin=self.margin
        )
        
        story = []
        personal = self._get_personal_info(resume_data)
        
        # Create formal dark header
        header_data = [
            [colors.HexColor('#2C3E50'), ''],
            ['', '']
        ]
        header_table = Table(header_data, colWidths=[letter[0]-2*self.margin, 0.6*inch], rowHeights=[1.0*inch, 0.2*inch])
        header_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, 0), colors.HexColor('#2C3E50')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        story.append(header_table)
        story.append(Spacer(1, -1.3*inch))
        
        # Executive-style header
        story.append(Paragraph(personal['fullName'], self.styles['CanvaHeader']))
        story.append(Paragraph(self._format_contact_line(personal), self.styles['ContactInfo']))
        story.append(Spacer(1, 0.3*inch))
        
        # Executive Summary
        summary = resume_data.get('summary', '')
        if summary:
            story.append(Paragraph('Executive Summary', self.styles['SectionHeader']))
            story.append(Paragraph(summary, self.styles['CustomBody']))
            story.append(Spacer(1, 0.2*inch))
        
        # Professional Experience
        experience = resume_data.get('experience', [])
        if experience:
            story.append(Paragraph('Professional Experience', self.styles['SectionHeader']))
            for exp in experience:
                story.append(Paragraph(
                    f"{exp.get('title', '')} — {exp.get('company', '')}",
                    self.styles['Heading3']
                ))
                story.append(Paragraph(
                    f"{exp.get('startDate', '')} to {exp.get('endDate', 'Present')}",
                    self.styles['Italic']
                ))
                story.append(Paragraph(exp.get('description', ''), self.styles['CustomBody']))
                story.append(Spacer(1, 0.15*inch))
            story.append(Spacer(1, 0.2*inch))
        
        # Education
        education = resume_data.get('education', [])
        if education:
            story.append(Paragraph('Education', self.styles['SectionHeader']))
            for edu in education:
                story.append(Paragraph(
                    f"{edu.get('degree', '')} — {edu.get('school', '')}",
                    self.styles['Heading3']
                ))
                story.append(Paragraph(
                    f"{edu.get('startDate', '')} to {edu.get('endDate', '')}",
                    self.styles['Italic']
                ))
                if edu.get('gpa'):
                    story.append(Paragraph(f"GPA: {edu['gpa']}", self.styles['CustomBody']))
                story.append(Spacer(1, 0.1*inch))
        
        # Core Competencies (Skills)
        skills = resume_data.get('skills', [])
        if skills:
            story.append(Paragraph('Core Competencies', self.styles['SectionHeader']))
            skills_text = ', '.join([skill.get('name', '') for skill in skills])
            story.append(Paragraph(skills_text, self.styles['CustomBody']))
            story.append(Spacer(1, 0.2*inch))
        
        # Key Projects
        projects = resume_data.get('projects', [])
        if projects:
            story.append(Paragraph('Key Projects', self.styles['SectionHeader']))
            for proj in projects:
                story.append(Paragraph(proj.get('name', ''), self.styles['Heading3']))
                story.append(Paragraph(proj.get('description', ''), self.styles['CustomBody']))
                story.append(Spacer(1, 0.1*inch))
        
        doc.build(story)
