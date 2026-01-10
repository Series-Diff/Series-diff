import React from 'react';
import StandardMatrix from './MetricMatrix/StandardMatrix';

interface Props {
  visiblePlugins: Array<any>;
  pluginResults: Record<string, any>;
  pluginErrors: Record<string, any>;
  selectedCategory?: string | null;
  secondaryCategory?: string | null;
  tertiaryCategory?: string | null;
  isLoadingPlugins?: boolean;
  refreshPluginResults?: () => void;
  totalFilesLoaded: number;
}

const PluginResultsSection: React.FC<Props> = ({
  visiblePlugins,
  pluginResults,
  pluginErrors,
  selectedCategory,
  secondaryCategory,
  tertiaryCategory,
  isLoadingPlugins = false,
  refreshPluginResults,
  totalFilesLoaded,
}) => {
  if (!selectedCategory) return null;
  if (totalFilesLoaded < 2) return null;
  if (!visiblePlugins || visiblePlugins.length === 0) return null;

  // Build list of visible categories
  const categories = [selectedCategory, secondaryCategory, tertiaryCategory].filter(Boolean) as string[];

  return (
    // Gap-based layout between plugin tables, avoid external margins
    <div className="section-container d-flex flex-column gap-3 p-3" data-component="Custom-Metric-Matrix-Wrapper">
      <div className="d-flex justify-content-between align-items-center">
        <h3 className="mb-0">Plugins</h3>
        <div className="d-flex align-items-center gap-2">
          {/* During loading, show spinners inside each table instead of here */}
        </div>
      </div>

      {/* Render plugin tables in order: plugin first, then categories
          This matches the ordering of other metrics (metric -> categories) */}
      {visiblePlugins.map((plugin) => (
        <React.Fragment key={plugin.id}>
          {categories.map((category, categoryIndex) => {
            const categoryData = pluginResults[plugin.id]?.[category];
            const categoryError = pluginErrors[plugin.id]?.[category];
            const isLoadingPlugin = isLoadingPlugins && !categoryError && (!categoryData || Object.keys(categoryData).length === 0);
            
            // Show info icon only on the first table for each plugin (categoryIndex === 0)
            const showInfoIcon = categoryIndex === 0;

            return (
              <StandardMatrix
                key={`${plugin.id}-${category}`}
                data={categoryData || {}}
                category={category}
                metric={plugin.name}
                customInfo={showInfoIcon ? { name: plugin.name, description: plugin.description } : undefined}
                isLoading={isLoadingPlugin}
                error={categoryError}
                onRetry={refreshPluginResults}
              />
            );
          })}
        </React.Fragment>
      ))}
    </div>
  );
};

export default PluginResultsSection;
