'use strict';

const uploadsService = require('../services/uploads');

class UploadsController {
  async uploadDefectAttachments(req, res) {
    const attachments = await uploadsService.attachFilesToDefect({
      defectId: req.params.defectId,
      files: req.files || [],
      actor: req.user,
      req,
    });
    return res.status(201).json({ status: 'ok', attachments });
  }
}

module.exports = new UploadsController();
