import React from 'react';
import { Form, Tabs, Tab, Button } from "react-bootstrap";
import { Select, MetricRow } from '../index';
import { Metric, METRIC_CATEGORIES } from '../../constants/metricsConfig';
import './MetricsListPanel.css';

interface MetricsListPanelProps {
    // Common props
    activeTab: string;
    onTabChange: (tab: string) => void;
    searchQuery: string;
    onSearchChange: (value: string) => void;
    selectedCategory: string;
    onCategoryChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
    categories?: string[];
    predefinedMetrics: Metric[];
    userMetrics: Metric[];
    
    // Tab titles
    predefinedTabTitle?: string;
    userTabTitle?: string;
    
    // Conditional features
    showAddMetricButton?: boolean;
    onAddMetric?: () => void;
    showSelectButtons?: boolean;
    onSelectAll?: () => void;
    onDeselectAll?: () => void;
    
    // MetricRow conditional props
    showCheckbox?: boolean;
    selectedMetricValues?: Set<string>;
    onMetricToggle?: (metricValue: string) => void;
    showEditDelete?: boolean;
    onEdit?: (metric: Metric) => void;
    onDelete?: (metric: Metric) => void;
    onShowInfo?: (metricKey: string) => void;
    
    // For user metrics tab - separate search and category
    userSearchQuery?: string;
    onUserSearchChange?: (value: string) => void;
    userSelectedCategory?: string;
    onUserCategoryChange?: (event: React.ChangeEvent<HTMLSelectElement>) => void;
    
    // Empty state messages
    emptyStatePredefined?: string;
    emptyStateUser?: string;
    
    // Styling
    maxHeight?: string;
    containerClassName?: string;
}

export const MetricsListPanel: React.FC<MetricsListPanelProps> = ({
    activeTab,
    onTabChange,
    searchQuery,
    onSearchChange,
    selectedCategory,
    onCategoryChange,
    categories = [...METRIC_CATEGORIES],
    predefinedMetrics,
    userMetrics,
    showAddMetricButton = false,
    onAddMetric,
    showSelectButtons = false,
    onSelectAll,
    onDeselectAll,
    showCheckbox = false,
    selectedMetricValues = new Set(),
    onMetricToggle,
    showEditDelete = false,
    onEdit,
    onDelete,
    onShowInfo,
    userSearchQuery,
    onUserSearchChange,
    userSelectedCategory,
    onUserCategoryChange,
    emptyStatePredefined = "No metrics found matching your search criteria.",
    emptyStateUser = "No custom metrics found",
    maxHeight = 'auto',
    containerClassName = '',
    predefinedTabTitle = "Predefined Metrics",
    userTabTitle = "User Metrics",
}) => {
    const effectiveUserSearchQuery = userSearchQuery !== undefined ? userSearchQuery : searchQuery;
    const effectiveUserCategory = userSelectedCategory !== undefined ? userSelectedCategory : selectedCategory;

    return (
        <Tabs
            activeKey={activeTab}
            onSelect={(k) => onTabChange(k || "predefined")}
            className="tabs-top nav nav-tabs"
            fill={true}
        >
            <Tab eventKey="predefined" title={predefinedTabTitle} className="tab-group d-flex flex-column flex-grow-1">
                <div className={`metrics-content-container d-flex flex-column gap-3 flex-grow-1 ${containerClassName}`}>
                    <div className="header d-flex align-items-end justify-content-between p-1">
                        <Form.Control
                            type="search"
                            placeholder="Search metrics..."
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className="search-box-instance"
                        />
                        <div className="d-flex flex-column align-items-start">
                            <Select
                                id="category-select"
                                selected={selectedCategory}
                                categories={categories}
                                onChange={onCategoryChange}
                            />
                        </div>
                    </div>

                    {showSelectButtons && (
                        <div className="d-flex gap-2 mb-2">
                            <Button
                                size="sm"
                                variant="outline-secondary"
                                onClick={onSelectAll}
                            >
                                Select All
                            </Button>
                            <Button
                                size="sm"
                                variant="outline-secondary"
                                onClick={onDeselectAll}
                            >
                                Deselect All
                            </Button>
                        </div>
                    )}

                    <div className="container-installed d-flex flex-column gap-3 overflow-auto pb-2" style={{ maxHeight }}>
                        {predefinedMetrics.length === 0 ? (
                            <div className="empty-state-message text-muted text-center mt-3">
                                {emptyStatePredefined}
                            </div>
                        ) : (
                            predefinedMetrics.map(metric => (
                                <MetricRow
                                    key={metric.value}
                                    checkbox={selectedMetricValues.has(metric.value)}
                                    currentlyActiveBadge={false}
                                    className="metric-row-instance w-100"
                                    text={metric.label}
                                    description={metric.description}
                                    category={metric.category}
                                    showCheckbox={showCheckbox}
                                    onShowChange={onMetricToggle ? () => onMetricToggle(metric.value) : undefined}
                                    metricKey={metric.value}
                                    onShowInfo={onShowInfo}
                                />
                            ))
                        )}
                    </div>
                </div>
            </Tab>
            <Tab eventKey="user" title={userTabTitle} className="tab-group d-flex flex-column flex-grow-1">
                <div className={`metrics-content-container d-flex flex-column gap-3 flex-grow-1 ${containerClassName}`}>
                    <div className="header d-flex align-items-end justify-content-between p-1">
                        <Form.Control
                            type="search"
                            placeholder="Search metrics..."
                            value={effectiveUserSearchQuery}
                            onChange={(e) => onUserSearchChange ? onUserSearchChange(e.target.value) : onSearchChange(e.target.value)}
                            className="search-box-instance"
                        />
                        <div className="d-flex align-items-end gap-3">
                            {showAddMetricButton && (
                                <Button variant="secondary" onClick={onAddMetric}>
                                    Add Your Custom Metric
                                </Button>
                            )}
                            <Select
                                id="user-category-select"
                                selected={effectiveUserCategory}
                                categories={categories}
                                onChange={onUserCategoryChange || onCategoryChange}
                            />
                        </div>
                    </div>

                    {showSelectButtons && (
                        <div className="d-flex gap-2 mb-2">
                            <Button
                                size="sm"
                                variant="outline-secondary"
                                onClick={onSelectAll}
                            >
                                Select All
                            </Button>
                            <Button
                                size="sm"
                                variant="outline-secondary"
                                onClick={onDeselectAll}
                            >
                                Deselect All
                            </Button>
                        </div>
                    )}

                    <div className="container-installed d-flex flex-column gap-3 overflow-auto pb-2" style={{ maxHeight }}>
                        {userMetrics.length === 0 ? (
                            <div className="empty-state-message text-muted text-center mt-3">
                                {emptyStateUser}
                            </div>
                        ) : (
                            userMetrics.map(metric => (
                                <MetricRow
                                    key={metric.value}
                                    checkbox={selectedMetricValues.has(metric.value)}
                                    currentlyActiveBadge={false}
                                    className="metric-row-instance w-100"
                                    text={metric.label}
                                    description={metric.description}
                                    category={metric.category}
                                    showCheckbox={showCheckbox}
                                    onShowChange={onMetricToggle ? () => onMetricToggle(metric.value) : undefined}
                                    isUser={showEditDelete}
                                    onEdit={onEdit ? () => onEdit(metric) : undefined}
                                    onDelete={onDelete ? () => onDelete(metric) : undefined}
                                />
                            ))
                        )}
                    </div>
                </div>
            </Tab>
        </Tabs>
    );
};

export default MetricsListPanel;
