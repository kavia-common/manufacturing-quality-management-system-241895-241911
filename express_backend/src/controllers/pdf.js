'use strict';

const { generateDefectAuditPdf } = require('../services/pdfReport');

class PdfController {
  async defectAuditReport(req, res) {
    const buffer = await generateDefectAuditPdf({ defectId: req.params.defectId, actor: req.user });
    if (!buffer) {
      return res.status(404).json({ status: 'error', message: 'Defect not found' });
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="defect-audit-${req.params.defectId}.pdf"`);
    return res.status(200).send(buffer);
  }
}

module.exports = new PdfController();
