'use strict';

const caService = require('../services/correctiveActions');
const { badRequest, notFound } = require('../utils/http');

class CorrectiveActionsController {
  async create(req, res) {
    try {
      const action = await caService.createCorrectiveAction({
        defectId: req.params.defectId,
        input: req.body || {},
        actor: req.user,
      });
      return res.status(201).json({ status: 'ok', action });
    } catch (err) {
      if (err.code === 'NOT_FOUND') return res.status(404).json({ status: 'error', message: 'Defect not found' });
      if (err.code === 'VALIDATION') return badRequest(res, err.message);
      return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
  }

  async getById(req, res) {
    const action = await caService.getCorrectiveActionById(req.params.id);
    if (!action) return notFound(res, 'Corrective action not found');
    return res.status(200).json({ status: 'ok', action });
  }

  async update(req, res) {
    try {
      const action = await caService.updateCorrectiveAction({
        actionId: req.params.id,
        input: req.body || {},
        actor: req.user,
      });
      if (!action) return notFound(res, 'Corrective action not found');
      return res.status(200).json({ status: 'ok', action });
    } catch (err) {
      if (err.code === 'VALIDATION') return badRequest(res, err.message);
      return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
  }

  async changeStatus(req, res) {
    try {
      const action = await caService.changeCorrectiveActionStatus({
        actionId: req.params.id,
        toStatus: (req.body || {}).status,
        note: (req.body || {}).note,
        actor: req.user,
      });
      if (!action) return notFound(res, 'Corrective action not found');
      return res.status(200).json({ status: 'ok', action });
    } catch (err) {
      if (err.code === 'INVALID_TRANSITION') return badRequest(res, err.message);
      if (err.code === 'VALIDATION') return badRequest(res, err.message);
      return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
  }

  async remove(req, res) {
    const ok = await caService.deleteCorrectiveAction({ actionId: req.params.id, actor: req.user });
    if (!ok) return notFound(res, 'Corrective action not found');
    return res.status(204).send();
  }
}

module.exports = new CorrectiveActionsController();
