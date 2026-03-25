'use strict';

const { parsePagination, toIsoOrNull } = require('./src/utils/http');

describe('utils/http', () => {
  describe('parsePagination', () => {
    test('defaults to page=1, limit=20', () => {
      expect(parsePagination({})).toEqual({ page: 1, limit: 20, skip: 0 });
    });

    test('enforces min page=1 and min limit=1', () => {
      expect(parsePagination({ page: 0, limit: 0 })).toEqual({ page: 1, limit: 1, skip: 0 });
    });

    test('caps limit at 100 and computes skip', () => {
      expect(parsePagination({ page: 3, limit: 200 })).toEqual({ page: 3, limit: 100, skip: 200 });
    });

    test('parses numeric strings', () => {
      expect(parsePagination({ page: '2', limit: '10' })).toEqual({ page: 2, limit: 10, skip: 10 });
    });
  });

  describe('toIsoOrNull', () => {
    test('returns null for null/undefined/empty', () => {
      expect(toIsoOrNull(null)).toBeNull();
      expect(toIsoOrNull(undefined)).toBeNull();
      expect(toIsoOrNull('')).toBeNull();
    });

    test('returns ISO string for Date', () => {
      const d = new Date('2024-01-02T03:04:05.000Z');
      expect(toIsoOrNull(d)).toBe('2024-01-02T03:04:05.000Z');
    });

    test('returns null for invalid date input', () => {
      expect(toIsoOrNull('not-a-date')).toBeNull();
    });
  });
});
