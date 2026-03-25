'use strict';

const authService = require('../services/auth');
const { badRequest } = require('../utils/http');

class AuthController {
  async login(req, res) {
    try {
      const { email, password } = req.body || {};
      const result = await authService.login({ email, password });
      return res.status(200).json({ status: 'ok', ...result });
    } catch (err) {
      if (err.code === 'AUTH') {
        return res.status(401).json({ status: 'error', message: 'Invalid credentials' });
      }
      if (err.code === 'VALIDATION') {
        return badRequest(res, err.message);
      }
      return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
  }

  async register(req, res) {
    try {
      const { email, password, role, name } = req.body || {};
      const user = await authService.registerUser({ email, password, role, name });
      return res.status(201).json({ status: 'ok', user });
    } catch (err) {
      if (err.code === 'VALIDATION') {
        return badRequest(res, err.message);
      }
      if (String(err.message || '').includes('E11000')) {
        return res.status(409).json({ status: 'error', message: 'Email already exists' });
      }
      return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
  }

  async me(req, res) {
    return res.status(200).json({ status: 'ok', user: req.user });
  }
}

module.exports = new AuthController();
