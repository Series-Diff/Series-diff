import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { METRIC_CATEGORIES, PREDEFINED_METRICS, Metric } from '../../constants/metricsConfig';
import { MetricsListPanel } from '../MetricsListPanel/MetricsListPanel';

interface MetricsSelectionModalProps {
    show: boolean;
    onHide: () => void;
    userMetrics: Metric[];
    selectedMetrics?: Set<string> | null;
    onApply?: React.Dispatch<React.SetStateAction<Set<string> | null>>;
}

// Available metric values for display in the dashboard
const AVAILABLE_METRIC_VALUES = [
    'mean', 'median', 'variance', 'std_dev', 'autocorrelation',
    'mae', 'rmse', 'pearson_correlation', 'dtw', 'euclidean', 'cosine_similarity',
    'difference_chart', 'moving_average'
] as const;

// Computationally expensive metrics - disabled by default
// Ranking: DTW (O(n²)) > Autocorrelation (O(n log n))
// Moving Average (O(n·w)) is enabled by default due to acceptable performance
const EXPENSIVE_METRICS = new Set(['dtw', 'autocorrelation']);

const MetricsSelectionModal: React.FC<MetricsSelectionModalProps> = ({
    show,
    onHide,
    userMetrics,
    selectedMetrics = null,
    onApply,
}) => {
    // When selectedMetrics is null (show all), initialize with all available metrics EXCEPT expensive ones
    const allAvailableMetrics = useMemo(() => 
        [...PREDEFINED_METRICS.filter(m => 
            AVAILABLE_METRIC_VALUES.includes(m.value as any)
        ), ...userMetrics].map(m => m.value),
        [userMetrics]
    );

    // Default selection: all metrics EXCEPT expensive ones
    const defaultSelectedMetrics = useMemo(() => 
        new Set(allAvailableMetrics.filter(m => !EXPENSIVE_METRICS.has(m))),
        [allAvailableMetrics]
    );
    
    const [localSelectedMetrics, setLocalSelectedMetrics] = useState<Set<string>>(
        selectedMetrics === null ? defaultSelectedMetrics : selectedMetrics
    );
    const [activeTab, setActiveTab] = useState('predefined');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

    const categories: string[] = [...METRIC_CATEGORIES];
    // Show statistical metrics (used in groupedMetrics) and correlation/distance metrics (used in tables)
    const relevantMetrics = PREDEFINED_METRICS.filter(m => 
        AVAILABLE_METRIC_VALUES.includes(m.value as any)
    );
    const allMetrics = [...relevantMetrics, ...userMetrics];

    // Filter metrics based on category and search
    const filteredMetrics = allMetrics.filter(metric => {
        const matchesCategory = selectedCategory === 'All' || metric.category === selectedCategory;
        const matchesSearch = metric.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
            metric.description.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const predefinedFiltered = filteredMetrics.filter(m => relevantMetrics.some(pm => pm.value === m.value));
    const userFiltered = filteredMetrics.filter(m => userMetrics.some(um => um.value === m.value));

    const handleMetricToggle = (metricValue: string) => {
        const newSelected = new Set(localSelectedMetrics);
        if (newSelected.has(metricValue)) {
            newSelected.delete(metricValue);
        } else {
            newSelected.add(metricValue);
        }
        setLocalSelectedMetrics(newSelected);
    };

    const handleSelectAll = () => {
        if (activeTab === 'predefined') {
            const allPredefinedValues = new Set(localSelectedMetrics);
            predefinedFiltered.forEach(m => allPredefinedValues.add(m.value));
            setLocalSelectedMetrics(allPredefinedValues);
        } else {
            const allUserValues = new Set(localSelectedMetrics);
            userFiltered.forEach(m => allUserValues.add(m.value));
            setLocalSelectedMetrics(allUserValues);
        }
    };

    const handleDeselectAll = () => {
        if (activeTab === 'predefined') {
            const newSelected = new Set(localSelectedMetrics);
            predefinedFiltered.forEach(m => newSelected.delete(m.value));
            setLocalSelectedMetrics(newSelected);
        } else {
            const newSelected = new Set(localSelectedMetrics);
            userFiltered.forEach(m => newSelected.delete(m.value));
            setLocalSelectedMetrics(newSelected);
        }
    };

    const handleClose = () => {
        setLocalSelectedMetrics(
            selectedMetrics === null ? defaultSelectedMetrics : selectedMetrics
        );
        onHide();
    };

    const handleApply = () => {
        // Validate selected metrics against the currently available metrics
        const availableMetricSet = new Set(allAvailableMetrics);
        const validSelectedMetrics = Array.from(localSelectedMetrics).filter((metric) =>
            availableMetricSet.has(metric)
        );
        
        // Save validated metrics to localStorage
        localStorage.setItem('selectedMetricsForDisplay', JSON.stringify(validSelectedMetrics));
        // Dispatch custom event to notify other components in the same tab
        window.dispatchEvent(
            new CustomEvent('localStorageChange', {
                detail: { key: 'selectedMetricsForDisplay', value: validSelectedMetrics }
            })
        );
        // Call the onApply callback to update parent state with validated metrics
        if (onApply) {
            onApply(new Set(validSelectedMetrics));
        }
        onHide();
    };

    // Update localSelectedMetrics when modal opens
    // When selectedMetrics is null (first load), use defaultSelectedMetrics (expensive ones excluded)
    // Otherwise use the passed selectedMetrics
    useEffect(() => {
        if (show) {
            const metricsToSet = selectedMetrics === null 
                ? defaultSelectedMetrics 
                : new Set(selectedMetrics);
            setLocalSelectedMetrics(metricsToSet);
        }
    }, [show, selectedMetrics, defaultSelectedMetrics]);

        // Reset filters and tab after the modal fully closes to avoid interfering with the closing lifecycle
        useEffect(() => {
            if (!show) {
                setSelectedCategory('All');
                setSearchQuery('');
                setActiveTab('predefined');
            }
        }, [show]);

    return (
        <Modal show={show} onHide={handleClose} size="lg" centered data-component="MetricsSelectionModal">
            <Modal.Header closeButton>
                <Modal.Title>Select Metrics to Display</Modal.Title>
            </Modal.Header>
            <Modal.Body style={{ maxHeight: '70vh', overflowY: 'hidden', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <MetricsListPanel
                    containerClassName="modal-metrics-panel"
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    selectedCategory={selectedCategory}
                    onCategoryChange={(e) => setSelectedCategory(e.target.value)}
                    categories={categories}
                    predefinedMetrics={predefinedFiltered}
                    userMetrics={userFiltered}
                    showSelectButtons={true}
                    onSelectAll={handleSelectAll}
                    onDeselectAll={handleDeselectAll}
                    showCheckbox={true}
                    selectedMetricValues={localSelectedMetrics}
                    onMetricToggle={handleMetricToggle}
                    emptyStatePredefined="No metrics found"
                    emptyStateUser="No custom metrics found"
                    maxHeight="40vh"
                />
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={handleClose}>
                    Cancel
                </Button>
                <Button variant="primary" onClick={handleApply}>
                    Apply Selection
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default MetricsSelectionModal;
