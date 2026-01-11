// services/extractFilenamesPerCategory.ts
export function extractFilenamesPerCategory(allSeries: Record<string, any>): Record<string, string[]> {
  const filenamesPerCategory: Record<string, string[]> = {};

  for (const fullKey of Object.keys(allSeries)) {
    const match = fullKey.match(/^([^.]*)\.(.*)$/);
    if (!match) continue;

    const category = match[1];
    const filename = match[2];

    if (!filenamesPerCategory[category]) {
      filenamesPerCategory[category] = [];
    }

    filenamesPerCategory[category].push(filename);
  }

  return filenamesPerCategory;
}
