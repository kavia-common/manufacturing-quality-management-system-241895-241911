'use strict';

jest.mock('./src/db/mongo', () => {
  return {
    getDb: jest.fn(),
  };
});

const { getDb } = require('./src/db/mongo');
const { recordStatusChange } = require('./src/services/statusHistory');

describe('services/statusHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('allows a valid defect transition and writes to status_history', async () => {
    const insertOne = jest.fn().mockResolvedValue({ acknowledged: true });
    getDb.mockReturnValue({
      collection: () => ({ insertOne }),
    });

    await expect(
      recordStatusChange({
        entityType: 'defect',
        entityId: '64b7f0f5f0f5f0f5f0f5f0f5',
        fromStatus: 'OPEN',
        toStatus: 'IN_REVIEW',
        changedByUserId: '64b7f0f5f0f5f0f5f0f5f0f6',
        changedByRole: 'QUALITY_ENGINEER',
        note: 'Review started',
      })
    ).resolves.toBeUndefined();

    expect(insertOne).toHaveBeenCalledTimes(1);
    const doc = insertOne.mock.calls[0][0];
    expect(doc.entityType).toBe('defect');
    expect(doc.fromStatus).toBe('OPEN');
    expect(doc.toStatus).toBe('IN_REVIEW');
    expect(doc.note).toBe('Review started');
    expect(doc.changedAt).toBeInstanceOf(Date);
  });

  test('blocks an invalid defect transition', async () => {
    const insertOne = jest.fn().mockResolvedValue({ acknowledged: true });
    getDb.mockReturnValue({
      collection: () => ({ insertOne }),
    });

    await expect(
      recordStatusChange({
        entityType: 'defect',
        entityId: '64b7f0f5f0f5f0f5f0f5f0f5',
        fromStatus: 'OPEN',
        toStatus: 'VERIFICATION', // invalid from OPEN
        changedByUserId: '64b7f0f5f0f5f0f5f0f5f0f6',
        changedByRole: 'QUALITY_ENGINEER',
        note: '',
      })
    ).rejects.toMatchObject({ code: 'INVALID_TRANSITION' });

    expect(insertOne).not.toHaveBeenCalled();
  });

  test('does not block unknown entity types', async () => {
    const insertOne = jest.fn().mockResolvedValue({ acknowledged: true });
    getDb.mockReturnValue({
      collection: () => ({ insertOne }),
    });

    await expect(
      recordStatusChange({
        entityType: 'some_new_entity',
        entityId: '64b7f0f5f0f5f0f5f0f5f0f5',
        fromStatus: 'A',
        toStatus: 'B',
        changedByUserId: null,
        changedByRole: null,
        note: null,
      })
    ).resolves.toBeUndefined();

    expect(insertOne).toHaveBeenCalledTimes(1);
  });
});
