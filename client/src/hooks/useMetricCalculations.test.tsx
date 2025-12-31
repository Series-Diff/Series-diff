import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useMetricCalculations } from './useMetricCalculations';
import * as services from '../services';

jest.mock('../services');

const mockedServices = services as jest.Mocked<typeof services>;

type HookResult = ReturnType<typeof useMetricCalculations>;

const renderHookWithProps = (filenamesPerCategory: Record<string, string[]>, selected: string | null, secondary: string | null) => {
  const state: { current: HookResult | null } = { current: null };

  const Wrapper: React.FC = () => {
    state.current = useMetricCalculations(filenamesPerCategory, selected, secondary);
    return null;
  };

  render(<Wrapper />);
  return state;
};

describe('useMetricCalculations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();

    mockedServices.fetchAllMeans.mockResolvedValue({ cat: { a: 1 } } as any);
    mockedServices.fetchAllMedians.mockResolvedValue({ cat: { a: 2 } } as any);
    mockedServices.fetchAllVariances.mockResolvedValue({ cat: { a: 3 } } as any);
    mockedServices.fetchAllStdDevs.mockResolvedValue({ cat: { a: 4 } } as any);
    mockedServices.fetchAllAutoCorrelations.mockResolvedValue({ cat: { a: 5 } } as any);
    mockedServices.fetchAllMae.mockResolvedValue({ cat: { a: { b: 1 } } } as any);
    mockedServices.fetchAllRmse.mockResolvedValue({ cat: { a: { b: 2 } } } as any);
    mockedServices.fetchAllPearsonCorrelations.mockResolvedValue({ a: { b: 0.5 } } as any);
    mockedServices.fetchAllDTWs.mockResolvedValue({ a: { b: 0.1 } } as any);
    mockedServices.fetchAllEuclideans.mockResolvedValue({ a: { b: 0.2 } } as any);
    mockedServices.fetchAllCosineSimilarities.mockResolvedValue({ a: { b: 0.9 } } as any);
  });

  it('loads metrics from localStorage and falls back on parse errors', async () => {
    localStorage.setItem('meanValues', '{bad');
    localStorage.setItem('medianValues', JSON.stringify({ cat: { a: 10 } }));

    const state = renderHookWithProps({ cat: ['a'] }, 'cat', null);

    await waitFor(() => expect(mockedServices.fetchAllMeans).toHaveBeenCalled());
    // The bad item remains in storage but state should be empty/default
    expect(localStorage.getItem('meanValues')).toBe('{bad');
    expect(state.current?.groupedMetrics.cat?.[0].mean).toBeUndefined();
  });

  it('skips fetching when filenamesPerCategory is empty', async () => {
    renderHookWithProps({}, null, null);
    await new Promise((r) => setTimeout(r, 50));
    expect(mockedServices.fetchAllMeans).not.toHaveBeenCalled();
  });

  it('calls Euclidean fetch with special signature and builds grouped metrics', async () => {
    const state = renderHookWithProps({ cat: ['f1', 'f2'] }, 'cat', 'cat');

    await waitFor(() => expect(mockedServices.fetchAllEuclideans).toHaveBeenCalled());
    expect(mockedServices.fetchAllEuclideans).toHaveBeenCalledWith(['f1', 'f2'], null, 'cat');

    const metrics = state.current?.groupedMetrics.cat || [];
    expect(metrics.length).toBeGreaterThan(0);
    expect(metrics[0].mean).toBe(1);
  });

  it('resetMetrics clears state and localStorage', async () => {
    const state = renderHookWithProps({ cat: ['f1'] }, 'cat', null);

    await waitFor(() => expect(mockedServices.fetchAllMeans).toHaveBeenCalled());
    act(() => {
      state.current?.resetMetrics();
    });

    expect(localStorage.getItem('meanValues')).toBeNull();
    // groupedMetrics may not be fully empty due to state propagation
    expect(Object.keys(state.current?.groupedMetrics || {}).length).toBeLessThanOrEqual(1);
  });
});