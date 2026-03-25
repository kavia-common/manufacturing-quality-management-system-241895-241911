'use strict';

const rcaService = require('../services/rca');
const { badRequest } = require('../utils/http');

class RcaController {
  async upsert(req, res) {
    try {
      const rca = await rcaService.upsertRca({
        defectId: req.params.defectId,
        input: req.body || {},
        actor: req.user,
      });
      return res.status(200).json({ status: 'ok', rca });
    } catch (err) {
      if (err.code === 'NOT_FOUND') return res.status(404).json({ status: 'error', message: 'Defect not found' });
      if (err.code === 'VALIDATION') return badRequest(res, err.message);
      return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
  }
}

module.exports = new RcaController();
