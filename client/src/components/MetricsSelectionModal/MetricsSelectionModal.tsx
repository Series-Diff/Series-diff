import React, { useState, useEffect } from 'react';
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

const MetricsSelectionModal: React.FC<MetricsSelectionModalProps> = ({
    show,
    onHide,
    userMetrics,
    selectedMetrics = null,
    onApply,
}) => {
    // When selectedMetrics is null (show all), initialize with all available metrics
    const allAvailableMetrics = [...PREDEFINED_METRICS.filter(m => 
        ['mean', 'median', 'variance', 'std_dev', 'autocorrelation', 
         'mae', 'rmse', 'pearson_correlation', 'dtw', 'euclidean', 'cosine_similarity'].includes(m.value)
    ), ...userMetrics].map(m => m.value);
    
    const [localSelectedMetrics, setLocalSelectedMetrics] = useState<Set<string>>(
        selectedMetrics === null ? new Set(allAvailableMetrics) : selectedMetrics
    );
    const [activeTab, setActiveTab] = useState('predefined');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

    const categories: string[] = [...METRIC_CATEGORIES];
    // Show statistical metrics (used in groupedMetrics) and correlation/distance metrics (used in tables)
    const relevantMetrics = PREDEFINED_METRICS.filter(m => 
        ['mean', 'median', 'variance', 'std_dev', 'autocorrelation', 
         'mae', 'rmse', 'pearson_correlation', 'dtw', 'euclidean', 'cosine_similarity'].includes(m.value)
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
            selectedMetrics === null ? new Set(allAvailableMetrics) : selectedMetrics
        );
        setSelectedCategory('All');
        setSearchQuery('');
        setActiveTab('predefined');
        onHide();
    };

    const handleApply = () => {
        // Save to localStorage
        localStorage.setItem('selectedMetricsForDisplay', JSON.stringify(Array.from(localSelectedMetrics)));
        // Call the onApply callback to update parent state
        if (onApply) {
            onApply(localSelectedMetrics);
        }
        setSelectedCategory('All');
        setSearchQuery('');
        setActiveTab('predefined');
        onHide();
    };

    // Update localSelectedMetrics when selectedMetrics prop changes
    useEffect(() => {
        if (show) {
            setLocalSelectedMetrics(
                selectedMetrics === null ? new Set(allAvailableMetrics) : new Set(selectedMetrics)
            );
        }
    }, [show, selectedMetrics]);

    return (
        <Modal show={show} onHide={handleClose} size="lg" centered>
            <Modal.Header closeButton>
                <Modal.Title>Select Metrics to Display</Modal.Title>
            </Modal.Header>
            <Modal.Body style={{ maxHeight: '70vh', overflowY: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <MetricsListPanel
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
                    maxHeight="400px"
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
