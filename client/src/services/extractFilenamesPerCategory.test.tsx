import { extractFilenamesPerCategory } from './extractFilenamesPerCategory';

describe('extractFilenamesPerCategory', () => {
  it('should correctly extract filenames per category from valid series keys', () => {
    const allSeries = {
      'temperature.model1': [],
      'temperature.model2': [],
      'humidity.sensor_a': [],
      'pressure.file1': []
    };

    const result = extractFilenamesPerCategory(allSeries);

    expect(result).toEqual({
      temperature: ['model1', 'model2'],
      humidity: ['sensor_a'],
      pressure: ['file1']
    });
  });

  it('should skip keys that do not match the category.filename pattern', () => {
    const allSeries = {
      'invalid_key': [],
      'temp.model3': [],
      'no_dot': []
    };

    const result = extractFilenamesPerCategory(allSeries);

    expect(result).toEqual({
      temp: ['model3']
    });
  });

  it('should handle empty input and return empty object', () => {
    const result = extractFilenamesPerCategory({});
    expect(result).toEqual({});
  });

  it('should handle multiple files in the same category', () => {
    const allSeries = {
      'cat1.fileA': [],
      'cat1.fileB': [],
      'cat1.fileC': []
    };

    const result = extractFilenamesPerCategory(allSeries);
    expect(result.cat1).toHaveLength(3);
    expect(result.cat1).toEqual(expect.arrayContaining(['fileA', 'fileB', 'fileC']));
  });
});