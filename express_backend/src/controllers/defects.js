'use strict';

const defectsService = require('../services/defects');
const { parsePagination, badRequest, notFound } = require('../utils/http');

class DefectsController {
  async create(req, res) {
    try {
      const defect = await defectsService.createDefect({ input: req.body || {}, actor: req.user });
      return res.status(201).json({ status: 'ok', defect });
    } catch (err) {
      if (err.code === 'VALIDATION') return badRequest(res, err.message);
      return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
  }

  async list(req, res) {
    try {
      const pagination = parsePagination(req.query || {});
      const result = await defectsService.listDefects({ query: req.query || {}, pagination });
      return res.status(200).json({ status: 'ok', ...result });
    } catch (err) {
      return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
  }

  async getById(req, res) {
    const defect = await defectsService.getDefectById(req.params.id);
    if (!defect) return notFound(res, 'Defect not found');
    return res.status(200).json({ status: 'ok', defect });
  }

  async update(req, res) {
    try {
      const defect = await defectsService.updateDefect({
        defectId: req.params.id,
        input: req.body || {},
        actor: req.user,
      });
      if (!defect) return notFound(res, 'Defect not found');
      return res.status(200).json({ status: 'ok', defect });
    } catch (err) {
      if (err.code === 'VALIDATION') return badRequest(res, err.message);
      return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
  }

  async changeStatus(req, res) {
    try {
      const defect = await defectsService.changeDefectStatus({
        defectId: req.params.id,
        toStatus: (req.body || {}).status,
        note: (req.body || {}).note,
        actor: req.user,
      });
      if (!defect) return notFound(res, 'Defect not found');
      return res.status(200).json({ status: 'ok', defect });
    } catch (err) {
      if (err.code === 'INVALID_TRANSITION') return badRequest(res, err.message);
      if (err.code === 'VALIDATION') return badRequest(res, err.message);
      return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
  }

  async remove(req, res) {
    const ok = await defectsService.deleteDefect({ defectId: req.params.id, actor: req.user });
    if (!ok) return notFound(res, 'Defect not found');
    return res.status(204).send();
  }
}

module.exports = new DefectsController();
