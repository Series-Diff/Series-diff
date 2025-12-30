import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Tabs, Tab } from 'react-bootstrap';
import { METRIC_CATEGORIES, PREDEFINED_METRICS, Metric } from '../../constants/metricsConfig';

interface MetricsSelectionModalProps {
    show: boolean;
    onHide: () => void;
    userMetrics: Metric[];
    selectedMetrics?: Set<string>;
    onApply?: React.Dispatch<React.SetStateAction<Set<string>>>;
}

const MetricsSelectionModal: React.FC<MetricsSelectionModalProps> = ({
    show,
    onHide,
    userMetrics,
    selectedMetrics = new Set(),
    onApply,
}) => {
    const [localSelectedMetrics, setLocalSelectedMetrics] = useState<Set<string>>(selectedMetrics);
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
        setLocalSelectedMetrics(selectedMetrics);
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
            setLocalSelectedMetrics(new Set(selectedMetrics));
        }
    }, [show, selectedMetrics]);

    return (
        <Modal show={show} onHide={handleClose} size="lg" centered>
            <Modal.Header closeButton>
                <Modal.Title>Select Metrics to Display</Modal.Title>
            </Modal.Header>
            <Modal.Body style={{ maxHeight: '60vh', overflowY: 'hidden' }}>
                <div className="mb-3">
                    <Form.Control
                        type="text"
                        placeholder="Search metrics..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="mb-3">
                    <Form.Select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                        {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </Form.Select>
                </div>

                <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k || 'predefined')} className="mb-3">
                    <Tab eventKey="predefined" title="Available Metrics">
                        <div className="d-flex gap-2 mb-3 mt-3">
                            <Button
                                size="sm"
                                variant="outline-secondary"
                                onClick={handleSelectAll}
                            >
                                Select All
                            </Button>
                            <Button
                                size="sm"
                                variant="outline-secondary"
                                onClick={handleDeselectAll}
                            >
                                Deselect All
                            </Button>
                        </div>
                        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                            {predefinedFiltered.length > 0 ? (
                                predefinedFiltered.map(metric => (
                                    <div key={metric.value} className="metric-checkbox-item p-2 border-bottom">
                                        <div className="d-flex align-items-start">
                                            <Form.Check
                                                type="checkbox"
                                                id={`metric-${metric.value}`}
                                                checked={localSelectedMetrics.has(metric.value)}
                                                onChange={() => handleMetricToggle(metric.value)}
                                                className="mt-1"
                                            />
                                            <div className="flex-grow-1 ms-2">
                                                <div className="fw-bold">{metric.label}</div>
                                                <div className="small text-muted">{metric.description}</div>
                                                <div className="small">
                                                    <span className="badge bg-secondary">{metric.category}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-muted text-center mt-3">No metrics found</p>
                            )}
                        </div>
                    </Tab>
                    <Tab eventKey="user" title="Custom Metrics">
                        <div className="d-flex gap-2 mb-3 mt-3">
                            <Button
                                size="sm"
                                variant="outline-secondary"
                                onClick={handleSelectAll}
                            >
                                Select All
                            </Button>
                            <Button
                                size="sm"
                                variant="outline-secondary"
                                onClick={handleDeselectAll}
                            >
                                Deselect All
                            </Button>
                        </div>
                        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                            {userFiltered.length > 0 ? (
                                userFiltered.map(metric => (
                                    <div key={metric.value} className="metric-checkbox-item p-2 border-bottom">
                                        <div className="d-flex align-items-start">
                                            <Form.Check
                                                type="checkbox"
                                                id={`metric-${metric.value}`}
                                                checked={localSelectedMetrics.has(metric.value)}
                                                onChange={() => handleMetricToggle(metric.value)}
                                                className="mt-1"
                                            />
                                            <div className="flex-grow-1 ms-2">
                                                <div className="fw-bold">{metric.label}</div>
                                                <div className="small text-muted">{metric.description}</div>
                                                <div className="small">
                                                    <span className="badge bg-secondary">{metric.category}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-muted text-center mt-3">No custom metrics found</p>
                            )}
                        </div>
                    </Tab>
                </Tabs>
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
