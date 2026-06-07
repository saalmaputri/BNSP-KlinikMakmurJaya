from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Spacer, Table, TableStyle
from reportlab.platypus.paragraph import Paragraph
from reportlab.lib.styles import getSampleStyleSheet


class PDFReportGenerator:
    def __init__(self, output_dir: str = "reports") -> None:
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def sales_report(self, filename: str, rows: list[dict]) -> str:
        path = self.output_dir / filename
        styles = getSampleStyleSheet()
        doc = SimpleDocTemplate(str(path), pagesize=A4)
        data = [["Periode", "Order", "Total Penjualan", "Terbayar"]]
        for row in rows:
            data.append([str(row.get("period")), str(row.get("total_orders")), str(row.get("gross_sales")), str(row.get("paid_sales"))])
        table = Table(data)
        table.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), colors.lightblue), ("GRID", (0, 0), (-1, -1), 0.5, colors.grey)]))
        doc.build([Paragraph("Klinik Makmur Jaya - Laporan Penjualan", styles["Title"]), Spacer(1, 12), table])
        return f"/generated-reports/{path.name}"
