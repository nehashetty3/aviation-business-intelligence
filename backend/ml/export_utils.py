"""PDF and Excel export utilities."""
import pandas as pd
import io
from typing import Any

def to_excel(sheets: dict[str, pd.DataFrame]) -> bytes:
    """sheets: {sheet_name: dataframe}. Returns xlsx bytes."""
    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as writer:
        for name, df in sheets.items():
            df.to_excel(writer, sheet_name=name[:31], index=False)
            ws = writer.sheets[name[:31]]
            # Auto-width columns
            for col in ws.columns:
                max_len = max((len(str(c.value or "")) for c in col), default=8)
                ws.column_dimensions[col[0].column_letter].width = min(max_len + 2, 40)
    return buf.getvalue()

def to_pdf(title: str, rows: list[dict], subtitle: str = "") -> bytes:
    """Render a simple table PDF using reportlab."""
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=landscape(A4),
                            leftMargin=1.5*cm, rightMargin=1.5*cm,
                            topMargin=1.5*cm, bottomMargin=1.5*cm)
    styles = getSampleStyleSheet()
    story = []

    # Title
    story.append(Paragraph(title, ParagraphStyle("T", parent=styles["Heading1"],
                                                  fontSize=16, spaceAfter=4)))
    if subtitle:
        story.append(Paragraph(subtitle, styles["Normal"]))
    story.append(Spacer(1, 0.4*cm))

    if not rows:
        story.append(Paragraph("No data.", styles["Normal"]))
    else:
        cols = list(rows[0].keys())
        data = [cols] + [[str(round(r[c],2)) if isinstance(r[c],float) else str(r[c]) for c in cols] for r in rows]

        t = Table(data, repeatRows=1)
        t.setStyle(TableStyle([
            ("BACKGROUND",  (0,0),(-1,0),  colors.HexColor("#0D0D0D")),
            ("TEXTCOLOR",   (0,0),(-1,0),  colors.white),
            ("FONTNAME",    (0,0),(-1,0),  "Helvetica-Bold"),
            ("FONTSIZE",    (0,0),(-1,-1), 8),
            ("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.white, colors.HexColor("#F9FAFB")]),
            ("GRID",        (0,0),(-1,-1), 0.3, colors.HexColor("#E5E7EB")),
            ("TOPPADDING",  (0,0),(-1,-1), 4),
            ("BOTTOMPADDING",(0,0),(-1,-1),4),
            ("LEFTPADDING", (0,0),(-1,-1), 6),
            ("RIGHTPADDING",(0,0),(-1,-1), 6),
        ]))
        story.append(t)

    doc.build(story)
    return buf.getvalue()
