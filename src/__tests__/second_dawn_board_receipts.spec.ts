import { expect, it } from 'vitest';
import { boardReceiptAcknowledges } from '../second-dawn-game/board/boardReceipt';
import type { AcceptedBoardReceipt } from '../second-dawn-game/board/useBoardCommands';
const pending = {
  scope: 'match:a',
  receipt: undefined as AcceptedBoardReceipt | undefined,
  type: 'build' as const,
};
it('waits for authoritative view after a receipt, including receipt-first delivery', () => {
  const receipt = { revision: 11, type: 'build' as const };
  expect(boardReceiptAcknowledges(pending, receipt, 10, 'match:a')).toBe(false);
  expect(boardReceiptAcknowledges(pending, receipt, 11, 'match:a')).toBe(true);
});
it('allows view-first delivery only when the matching receipt arrives', () => {
  expect(boardReceiptAcknowledges(pending, undefined, 11, 'match:a')).toBe(false);
  expect(boardReceiptAcknowledges(pending, { revision: 11, type: 'move' }, 11, 'match:a')).toBe(
    false,
  );
  expect(boardReceiptAcknowledges(pending, { revision: 11, type: 'build' }, 11, 'match:a')).toBe(
    true,
  );
});
it('ignores the already observed receipt for a later same-type submission', () => {
  const previousReceipt: AcceptedBoardReceipt = { revision: 11, type: 'build' };
  const later = { ...pending, receipt: previousReceipt };
  expect(boardReceiptAcknowledges(later, previousReceipt, 12, 'match:a')).toBe(false);
  expect(boardReceiptAcknowledges(later, { revision: 12, type: 'build' }, 12, 'match:a')).toBe(
    true,
  );
});
it('accepts a recovered response after its authoritative view has already advanced', () => {
  expect(boardReceiptAcknowledges(pending, { revision: 11, type: 'build' }, 11, 'match:a')).toBe(
    true,
  );
  expect(boardReceiptAcknowledges(pending, { revision: 11, type: 'build' }, 12, 'match:a')).toBe(
    true,
  );
});
it('does not acknowledge a request after changing matches or viewing seats', () => {
  expect(boardReceiptAcknowledges(pending, { revision: 11, type: 'build' }, 11, 'other:a')).toBe(
    false,
  );
  expect(boardReceiptAcknowledges(pending, { revision: 11, type: 'build' }, 11, 'match:b')).toBe(
    false,
  );
});
