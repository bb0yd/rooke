import { render } from '@testing-library/react';
import { Chess } from 'chess.js';
import { beforeAll, describe, expect, it } from 'vitest';
import ChessBoard from '../ChessBoard';
import styles from '../ChessBoard.module.css';

class ResizeObserverMock {
  observe() {}
  disconnect() {}
}

describe('ChessBoard', () => {
  beforeAll(() => {
    Object.defineProperty(globalThis, 'ResizeObserver', {
      configurable: true,
      writable: true,
      value: ResizeObserverMock,
    });
  });

  it('updates orientation when initialFlipped changes', () => {
    const game = new Chess();
    const { container, rerender } = render(
      <ChessBoard externalGame={game} initialFlipped={false} hideControls />
    );

    const getRanks = () =>
      Array.from(container.querySelectorAll(`.${styles.rankLabel}`)).map(node => node.textContent);

    expect(getRanks()).toEqual(['8', '7', '6', '5', '4', '3', '2', '1']);

    rerender(<ChessBoard externalGame={game} initialFlipped hideControls />);

    expect(getRanks()).toEqual(['1', '2', '3', '4', '5', '6', '7', '8']);
  });
});
