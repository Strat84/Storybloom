import { jsPDF } from 'jspdf';
import { Story, StoryPage } from '../../shared/schema';

export class PDFService {
  async generateStoryPDF(story: Story, pages: StoryPage[]): Promise<Buffer> {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Set up fonts and colors
    pdf.setFont('helvetica');
    
    // Add cover page
    this.addCoverPage(pdf, story);
    
    // Add story pages
    pages.sort((a, b) => a.pageNumber - b.pageNumber);
    for (const page of pages) {
      pdf.addPage();
      this.addStoryPage(pdf, page);
    }

    // Convert to buffer
    const pdfBuffer = Buffer.from(pdf.output('arraybuffer'));
    return pdfBuffer;
  }

  private addCoverPage(pdf: jsPDF, story: Story) {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    // Add decorative border
    pdf.setDrawColor(139, 69, 19); // Brown border
    pdf.setLineWidth(2);
    pdf.rect(10, 10, pageWidth - 20, pageHeight - 20);
    
    // Add inner decorative border
    pdf.setDrawColor(255, 165, 0); // Orange accent
    pdf.setLineWidth(1);
    pdf.rect(15, 15, pageWidth - 30, pageHeight - 30);
    
    // Add title
    pdf.setFontSize(28);
    pdf.setTextColor(128, 0, 128); // Purple
    pdf.setFont('helvetica', 'bold');
    
    // Center the title
    const titleLines = pdf.splitTextToSize(story.title, pageWidth - 40);
    const titleHeight = titleLines.length * 10;
    const titleY = (pageHeight / 2) - titleHeight - 20;
    
    titleLines.forEach((line: string, index: number) => {
      const textWidth = pdf.getTextWidth(line);
      const x = (pageWidth - textWidth) / 2;
      pdf.text(line, x, titleY + (index * 10));
    });
    
    // Add author
    pdf.setFontSize(16);
    pdf.setTextColor(100, 100, 100);
    pdf.setFont('helvetica', 'normal');
    const authorText = `By ${story.author}`;
    const authorWidth = pdf.getTextWidth(authorText);
    const authorX = (pageWidth - authorWidth) / 2;
    pdf.text(authorText, authorX, titleY + titleHeight + 20);
    
    // Add decorative elements
    pdf.setFillColor(255, 165, 0); // Orange
    const starSize = 3;
    const stars = [
      { x: pageWidth / 2 - 30, y: titleY - 20 },
      { x: pageWidth / 2 + 30, y: titleY - 20 },
      { x: pageWidth / 2, y: titleY + titleHeight + 40 }
    ];
    
    stars.forEach(star => {
      this.drawStar(pdf, star.x, star.y, starSize);
    });
  }

  private addStoryPage(pdf: jsPDF, page: StoryPage) {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (2 * margin);
    
    // Add page number
    pdf.setFontSize(12);
    pdf.setTextColor(128, 0, 128); // Purple
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Page ${page.pageNumber}`, margin, margin);
    
    // Add image placeholder (if imageUrl exists, we could potentially fetch and include)
    const imageHeight = 100;
    const imageY = margin + 15;
    
    if (page.imageUrl) {
      // Draw image placeholder with description
      pdf.setFillColor(240, 240, 240);
      pdf.rect(margin, imageY, contentWidth, imageHeight, 'F');
      
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.setFont('helvetica', 'italic');
      const placeholderText = '[Generated Image]';
      const placeholderWidth = pdf.getTextWidth(placeholderText);
      const placeholderX = margin + (contentWidth - placeholderWidth) / 2;
      pdf.text(placeholderText, placeholderX, imageY + imageHeight / 2);
      
      // Add image prompt as caption
      pdf.setFontSize(8);
      const promptLines = pdf.splitTextToSize(page.imagePrompt, contentWidth);
      promptLines.forEach((line: string, index: number) => {
        pdf.text(line, margin, imageY + imageHeight + 10 + (index * 3));
      });
    } else {
      // Draw decorative placeholder
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(1);
      pdf.rect(margin, imageY, contentWidth, imageHeight);
      
      pdf.setFontSize(10);
      pdf.setTextColor(150, 150, 150);
      pdf.setFont('helvetica', 'italic');
      const placeholderText = '[Image will be here]';
      const placeholderWidth = pdf.getTextWidth(placeholderText);
      const placeholderX = margin + (contentWidth - placeholderWidth) / 2;
      pdf.text(placeholderText, placeholderX, imageY + imageHeight / 2);
    }
    
    // Add story text
    const textY = imageY + imageHeight + 30;
    pdf.setFontSize(14);
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'normal');
    
    const textLines = pdf.splitTextToSize(page.text, contentWidth);
    const lineHeight = 7;
    
    textLines.forEach((line: string, index: number) => {
      const currentY = textY + (index * lineHeight);
      if (currentY < pageHeight - margin) {
        pdf.text(line, margin, currentY);
      }
    });
    
    // Add decorative footer
    const footerY = pageHeight - 15;
    pdf.setDrawColor(255, 165, 0); // Orange
    pdf.setLineWidth(0.5);
    pdf.line(margin, footerY, pageWidth - margin, footerY);
  }

  private drawStar(pdf: jsPDF, x: number, y: number, size: number) {
    pdf.setFillColor(255, 165, 0); // Orange
    
    // Simple star shape using lines
    const points = 5;
    const outerRadius = size;
    const innerRadius = size * 0.4;
    
    const coords: number[] = [];
    
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * Math.PI) / points;
      coords.push(x + radius * Math.cos(angle - Math.PI / 2));
      coords.push(y + radius * Math.sin(angle - Math.PI / 2));
    }
    
    // Draw the star
    pdf.setDrawColor(255, 165, 0);
    pdf.setFillColor(255, 165, 0);
    
    for (let i = 0; i < coords.length; i += 2) {
      const nextIndex = (i + 2) % coords.length;
      pdf.line(coords[i], coords[i + 1], coords[nextIndex], coords[nextIndex + 1]);
    }
  }
}

export const pdfService = new PDFService();