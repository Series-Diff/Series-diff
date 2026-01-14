import { act, render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useDataFetching } from './useDataFetching';
import * as services from '../services';

jest.mock('../services');

const mockedServices = services as jest.Mocked<typeof services>;

type HookResult = ReturnType<typeof useDataFetching>;

const createHookHarness = () => {
  const state: { current: HookResult | null } = { current: null };

  const Harness = () => {
    state.current = useDataFetching();
    return null;
  };

  render(<Harness />);
  return state;
};

const sampleSeries = {
  categoryA: [{ timestamp: '2024-01-01', value: 1 }],
};

describe('useDataFetching', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    global.fetch = jest.fn();
    mockedServices.fetchTimeSeriesData.mockResolvedValue(sampleSeries as any);
    mockedServices.extractFilenamesPerCategory.mockReturnValue({ categoryA: ['file.csv'] });
  });

  it('restores state from localStorage when valid', async () => {
    const storedData = { categoryA: [{ timestamp: 't', value: 2 }] };
    const storedNames = { categoryA: ['f1'] };
    localStorage.setItem('chartData', JSON.stringify(storedData));
    localStorage.setItem('filenamesPerCategory', JSON.stringify(storedNames));

    const hook = createHookHarness();

    await waitFor(() => expect(hook.current?.chartData).toEqual(storedData));
    expect(mockedServices.fetchTimeSeriesData).not.toHaveBeenCalled();
    expect(hook.current?.filenamesPerCategory).toEqual(storedNames);
  });

  it('handles corrupted localStorage by clearing it without auto-fetch', async () => {
    localStorage.setItem('chartData', '{bad-json');
    localStorage.setItem('filenamesPerCategory', '{bad-json');

    const hook = createHookHarness();

    // Wait for initial render and effect to run
    await waitFor(() => expect(hook.current).not.toBeNull());
    
    // Hook should NOT auto-fetch when localStorage is corrupted (by design - waits for user action)
    expect(mockedServices.fetchTimeSeriesData).not.toHaveBeenCalled();
    
    // Corrupted data should be cleared from localStorage
    expect(localStorage.getItem('chartData')).toBeNull();
    expect(localStorage.getItem('filenamesPerCategory')).toBeNull();
    
    // State remains empty until user triggers fetch
    expect(hook.current?.chartData).toEqual({});
  });

  it('handleFetchData sets error on failure and clears chartData', async () => {
    const hook = createHookHarness();
    
    // Wait for initial render
    await waitFor(() => expect(hook.current).not.toBeNull());

    mockedServices.fetchTimeSeriesData.mockRejectedValueOnce(new Error('boom'));

    await act(async () => {
      await hook.current?.handleFetchData(false);
    });

    await waitFor(() => {
      expect(hook.current?.error).toBe('boom');
      expect(hook.current?.chartData).toEqual({});
    });
  });

  it('handleReset clears storage and reports backend failure', async () => {
    localStorage.setItem('chartData', '1');
    localStorage.setItem('filenamesPerCategory', '1');
    localStorage.setItem('selectedCategory', 'x');
    localStorage.setItem('secondaryCategory', 'y');
    const token = 'tok';
    localStorage.setItem('session_token', token);

    const resp = {
      ok: false,
      text: jest.fn().mockResolvedValue('Not Found'),
      headers: { get: () => null },
    } as any;
    (global.fetch as jest.Mock).mockResolvedValue(resp);

    const hook = createHookHarness();

    await act(async () => {
      await hook.current?.handleReset();
    });

    await waitFor(() => {
      expect(hook.current?.isLoading).toBe(false);
    });

    expect(resp.text).toHaveBeenCalled();
    expect(hook.current?.error).toContain('Failed to clear data on server');
    expect(localStorage.getItem('chartData')).toBeNull();
    expect(localStorage.getItem('filenamesPerCategory')).toBeNull();
    expect(localStorage.getItem('selectedCategory')).toBeNull();
    expect(localStorage.getItem('secondaryCategory')).toBeNull();
  });

  it('handleReset stores new session token when returned', async () => {
    const resp = {
      ok: true,
      text: jest.fn(),
      headers: { get: (k: string) => (k === 'X-Session-ID' ? 'new-token' : null) },
    } as any;
    (global.fetch as jest.Mock).mockResolvedValue(resp);

    const hook = createHookHarness();

    await act(async () => {
      await hook.current?.handleReset();
    });

    expect(localStorage.getItem('session_token')).toBe('new-token');
  });
});