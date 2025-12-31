import React from 'react';
import { act, render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useFileUpload } from './useFileUpload';
import * as services from '../services';

jest.mock('../services');

const mockedServices = services as jest.Mocked<typeof services>;

const createHarness = (deps?: Partial<ReturnType<typeof useFileUpload>>) => {
  const state: { current: ReturnType<typeof useFileUpload> | null } = { current: null };

  const handleFetchData = jest.fn().mockResolvedValue(undefined);
  const setError = jest.fn();
  const setIsLoading = jest.fn();

  const Harness = () => {
    state.current = useFileUpload(handleFetchData, setError as any, setIsLoading as any);
    return null;
  };

  render(<Harness />);
  return { state, handleFetchData, setError, setIsLoading, ...deps };
};

describe('useFileUpload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ignores empty file selection', () => {
    const { state, setError } = createHarness();
    const inputEvent = { target: { files: null, value: 'abc' } } as any;

    act(() => {
      state.current?.handleFileUpload(inputEvent);
    });

    expect(setError).toHaveBeenCalledWith(null);
    expect(state.current?.isPopupOpen).toBe(false);
  });

  it('opens popup when files selected', () => {
    const { state } = createHarness();
    const file = new File(['content'], 'file.csv');
    const inputEvent = { target: { files: [file], value: 'abc' } } as any;

    act(() => {
      state.current?.handleFileUpload(inputEvent);
    });

    expect(state.current?.isPopupOpen).toBe(true);
    expect(state.current?.selectedFiles).toHaveLength(1);
    expect(inputEvent.target.value).toBe('');
  });

  it('handlePopupComplete sets error on processing failure', async () => {
    mockedServices.sendProcessedTimeSeriesData.mockImplementation(async (_data, cb) => {
      if (cb) cb(false);
    });
    const { state, setError, setIsLoading } = createHarness();

    await act(async () => {
      await state.current?.handlePopupComplete({ some: 'data' } as any);
    });

    expect(setError).toHaveBeenCalledWith(null);
    expect(setError).toHaveBeenCalledWith('Data processing or server upload failed.');
    expect(setIsLoading).toHaveBeenCalledWith(true);
    expect(setIsLoading).toHaveBeenCalledWith(false);
  });

  it('handlePopupComplete triggers fetch on success', async () => {
    mockedServices.sendProcessedTimeSeriesData.mockImplementation(async (_data, cb) => {
      if (cb) cb(true);
    });
    const { state, handleFetchData } = createHarness();

    await act(async () => {
      await state.current?.handlePopupComplete({ some: 'data' } as any);
    });

    expect(handleFetchData).toHaveBeenCalled();
  });

  it('resetFileUpload closes popup and clears files', () => {
    const { state } = createHarness();
    act(() => {
      state.current?.handlePopupClose();
      state.current?.resetFileUpload();
    });

    expect(state.current?.isPopupOpen).toBe(false);
    expect(state.current?.selectedFiles).toHaveLength(0);
  });
});