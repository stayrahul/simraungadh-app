import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to add total page counts and running headers/footers
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        
        # Don't draw running header on page 1
        if self._pageNumber > 1:
            self.setStrokeColor(colors.HexColor('#E2E8F0'))
            self.setLineWidth(0.75)
            self.line(54, 11 * inch - 36, 8.5 * inch - 54, 11 * inch - 36)
            
            self.setFont('Helvetica-Bold', 8)
            self.setFillColor(colors.HexColor('#4F46E5'))
            self.drawString(54, 11 * inch - 30, "SIMRAUNGADH CIVIC HUB")
            
            self.setFont('Helvetica', 8)
            self.setFillColor(colors.HexColor('#64748B'))
            self.drawRightString(8.5 * inch - 54, 11 * inch - 30, "User Experience & Citizen Benefits Guide")

        # Footer
        self.setStrokeColor(colors.HexColor('#E2E8F0'))
        self.setLineWidth(0.75)
        self.line(54, 45, 8.5 * inch - 54, 45)
        
        self.setFont('Helvetica-Bold', 8)
        self.setFillColor(colors.HexColor('#0F172A'))
        self.drawString(54, 30, "Simraungadh Municipality (सिम्रौनगढ नगरपालिका)")
        
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.setFont('Helvetica', 8)
        self.setFillColor(colors.HexColor('#64748B'))
        self.drawRightString(8.5 * inch - 54, 30, page_str)
        
        self.restoreState()


def create_user_experience_pdf(output_filename):
    doc = SimpleDocTemplate(
        output_filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    # Custom Palette
    PRIMARY = colors.HexColor('#4F46E5')       # Indigo Primary
    PRIMARY_DARK = colors.HexColor('#3730A3')  # Deep Indigo
    EMERALD = colors.HexColor('#059669')       # Success Green
    AMBER = colors.HexColor('#D97706')         # Warning Amber
    CRIMSON = colors.HexColor('#DC2626')       # Emergency Crimson
    DARK_TEXT = colors.HexColor('#0F172A')     # Slate 900
    MUTED_TEXT = colors.HexColor('#475569')    # Slate 600
    BG_LIGHT = colors.HexColor('#F8FAFC')      # Card Background
    CARD_BORDER = colors.HexColor('#E2E8F0')   # Border

    style_cover_title = ParagraphStyle(
        'CoverTitle', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=24, leading=28,
        textColor=colors.white, spaceAfter=4
    )
    
    style_cover_sub = ParagraphStyle(
        'CoverSub', parent=styles['Normal'],
        fontName='Helvetica', fontSize=11, leading=15,
        textColor=colors.HexColor('#E0E7FF'), spaceAfter=10
    )

    style_h1 = ParagraphStyle(
        'H1Custom', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=15, leading=19,
        textColor=PRIMARY_DARK, spaceBefore=14, spaceAfter=6
    )

    style_body = ParagraphStyle(
        'BodyCustom', parent=styles['Normal'],
        fontName='Helvetica', fontSize=9.5, leading=14,
        textColor=DARK_TEXT, spaceAfter=5
    )

    style_help = ParagraphStyle(
        'HelpCustom', parent=styles['Normal'],
        fontName='Helvetica-Oblique', fontSize=9, leading=13,
        textColor=EMERALD, spaceAfter=4
    )

    story = []

    # =========================================================================
    # BANNER
    # =========================================================================
    banner_data = [
        [Paragraph("SIMRAUNGADH CIVIC HUB", style_cover_title)],
        [Paragraph("User Experience & Citizen Benefits Overview — What Users Experience & How It Helps", style_cover_sub)],
        [Paragraph("<b>Target Audience:</b> Citizens of Simraungadh Municipality (Wards 1–12)<br/>"
                   "<b>Core Purpose:</b> Instant 1-Tap Civic Problem Reporting, Emergency Help, Official Notices & Ward Services",
                   ParagraphStyle('BText', parent=styles['Normal'], fontName='Helvetica', fontSize=8.5, leading=12, textColor=colors.HexColor('#C7D2FE')))]
    ]
    t_banner = Table(banner_data, colWidths=[7.0 * inch])
    t_banner.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), PRIMARY),
        ('TOPPADDING', (0, 0), (-1, -1), 14),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 14),
        ('LEFTPADDING', (0, 0), (-1, -1), 16),
        ('RIGHTPADDING', (0, 0), (-1, -1), 16),
    ]))
    story.append(t_banner)
    story.append(Spacer(1, 12))

    # =========================================================================
    # SECTION 1: WHAT USERS EXPERIENCE STEP-BY-STEP
    # =========================================================================
    story.append(Paragraph("1. Daily User Experience — Step-by-Step", style_h1))
    story.append(HRFlowable(width="100%", thickness=1.5, color=PRIMARY, spaceBefore=0, spaceAfter=8))

    ux_steps = [
        ("📱 1. Easy 1-Tap Google Sign-In & Ward Setup",
         "<b>What User Experiences:</b> Open the app → Tap 'Continue with Google' → Pick your Ward number (1 to 12) on a big 12-button grid.",
         "<b>How It Helps:</b> Elderly citizens don't need to remember passwords or type long email addresses. Onboarding takes under 15 seconds."),

        ("📷 2. Report Any Local Problem in 30 Seconds",
         "<b>What User Experiences:</b> Tap '+ Report Issue' → Snap a photo of a pothole, broken pipe, garbage buildup, or streetlight → Select Category → Tap Submit.",
         "<b>How It Helps:</b> No more taking time off work to visit the ward office or waiting in long government queues to submit complaints."),

        ("🔔 3. Live Phone Alerts as Your Problem Gets Fixed",
         "<b>What User Experiences:</b> Receive real-time push notifications when the ward office reviews your complaint: <i>Pending ⏳ → Under Investigation 🛠️ → Resolved ✅</i>.",
         "<b>How It Helps:</b> Complete transparency! Citizens know exactly when municipal workers are on site and when the issue is fixed."),

        ("🚨 4. Instant 1-Tap Emergency Calling & Direct Help",
         "<b>What User Experiences:</b> Open Directory → Tap 1-click call button for Police, Ambulance, Fire Brigade, Ward Offices, or Mayor's Office.",
         "<b>How It Helps:</b> Saves critical lives during medical emergencies, fires, floods, or crime by providing immediate access to verified contacts."),

        ("📢 5. Verified Official News & Emergency Warnings",
         "<b>What User Experiences:</b> View urgent flood alerts, municipal notices, budget decisions, and download official PDF notices inside the app.",
         "<b>How It Helps:</b> Protects citizens from false rumors and keeps families safe during natural disasters or health advisories."),

        ("☀️ 6. Local Simraungadh Weather & Farming Tips",
         "<b>What User Experiences:</b> Open home screen to view live temperature, rainfall predictions, and local agricultural advice for Simraungadh.",
         "<b>How It Helps:</b> Helps local farmers decide when to plant crops, irrigate fields, or protect harvests from unexpected rain."),

        ("📜 7. Municipal Service Guides & Tax Info",
         "<b>What User Experiences:</b> Browse complete requirements for Birth/Death Certificates, Marriage Certificates, Ward Recommendations (सिफारिश), and Taxes.",
         "<b>How It Helps:</b> Citizens bring the right documents on their first visit, saving multiple unnecessary trips to government offices.")
    ]

    for title, exp, hlp in ux_steps:
        box_content = [
            [Paragraph(f"<b>{title}</b>", ParagraphStyle('THead', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=11, leading=14, textColor=PRIMARY_DARK))],
            [Paragraph(exp, style_body)],
            [Paragraph(f"💡 {hlp}", style_help)]
        ]
        tb = Table(box_content, colWidths=[7.0 * inch])
        tb.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), BG_LIGHT),
            ('BOX', (0, 0), (-1, -1), 0.75, CARD_BORDER),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(tb)
        story.append(Spacer(1, 6))

    story.append(Spacer(1, 10))

    # =========================================================================
    # SECTION 2: HOW THE APP HELPS DIFFERENT CITIZENS
    # =========================================================================
    story.append(Paragraph("2. How This App Helps Every Citizen Group", style_h1))
    story.append(HRFlowable(width="100%", thickness=1.5, color=PRIMARY, spaceBefore=0, spaceAfter=8))

    personas = [
        [
            Paragraph("<b>👴 Elderly Citizens & Grandparents</b>", ParagraphStyle('P1', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=10.5, leading=13, textColor=PRIMARY)),
            Paragraph("• No passwords to remember (1-tap Google login)<br/>"
                      "• Large, easy-to-tap 12-Ward buttons<br/>"
                      "• Full Nepali language support for easy reading", style_body)
        ],
        [
            Paragraph("<b>👨‍🌾 Local Farmers & Laborers</b>", ParagraphStyle('P2', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=10.5, leading=13, textColor=EMERALD)),
            Paragraph("• Real-time local weather & rain forecasts<br/>"
                      "• Agriculture advisories for crops & livestock<br/>"
                      "• Direct contact numbers for agricultural officers", style_body)
        ],
        [
            Paragraph("<b>👩‍💼 Working Parents & Youth</b>", ParagraphStyle('P3', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=10.5, leading=13, textColor=AMBER)),
            Paragraph("• Submit neighborhood reports in 30 seconds from home<br/>"
                      "• Track complaint progress without missing work<br/>"
                      "• Earn Civic Points and community badges", style_body)
        ]
    ]
    t_pers = Table(personas, colWidths=[2.6 * inch, 4.4 * inch])
    t_pers.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), BG_LIGHT),
        ('BOX', (0, 0), (-1, -1), 0.75, CARD_BORDER),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, CARD_BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(t_pers)
    story.append(Spacer(1, 14))

    # =========================================================================
    # CLOSING SUMMARY
    # =========================================================================
    closing_box = [
        [
            Paragraph("<b>Simraungadh Civic Hub — Bringing Government Right to Your Fingertips</b><br/>"
                      "<font size=8.5 color='#64748B'>Empowering citizens, improving Ward infrastructure, and building a cleaner, safer Simraungadh together.</font>", 
                      ParagraphStyle('CloseText', parent=styles['Normal'], fontName='Helvetica', fontSize=9.5, leading=13, alignment=1, textColor=PRIMARY_DARK))
        ]
    ]
    t_close = Table(closing_box, colWidths=[7.0 * inch])
    t_close.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#EEF2FF')),
        ('BOX', (0, 0), (-1, -1), 1, PRIMARY),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
    ]))
    story.append(t_close)

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"User Experience PDF successfully generated at: {output_filename}")


if __name__ == '__main__':
    out_pdf = "/Users/rahul/Downloads/simraungadh-app/simraungadh/Simraungadh_App_Presentation.pdf"
    create_user_experience_pdf(out_pdf)
