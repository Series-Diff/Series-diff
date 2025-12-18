import React, { useState, useEffect, useRef } from 'react';
import './MetricsPage.css';
import { Form, Tabs, Tab, Col, Button, Modal } from "react-bootstrap";
import { Select, MetricModal, MetricRow, Header } from '../components';
import { Metric, METRIC_CATEGORIES, PREDEFINED_METRICS } from '../constants/metricsConfig';
import { useLocalPlugins } from '../hooks/useLocalPlugins';

function MetricsPage() {
    const [selectedCategory, setSelectedCategory] = useState<string>("All");
    const [userSelectedCategory, setUserSelectedCategory] = useState<string>("All");
    const [activeTab, setActiveTab] = useState("predefined");
    const [searchQuery, setSearchQuery] = useState("");
    const [userSearchQuery, setUserSearchQuery] = useState("");
    const isInitialMount = useRef(true);
    const [userMetrics, setUserMetrics] = useState<Metric[]>(() => {
        const storedMetrics = localStorage.getItem('userMetrics');
        if (storedMetrics) {
            try {
                return JSON.parse(storedMetrics);
            } catch (error) {
                // Error parsing stored metrics - clearing corrupted data
                // Future enhancement: Show user notification about data loss and offer backup/recovery
                console.error('Failed to parse user metrics from localStorage:', error);
                localStorage.removeItem('userMetrics');
                return [];
            }
        }
        return [];
    });

    const {
        plugins,
        createPlugin,
        updatePlugin,
        deletePlugin
    } = useLocalPlugins();

    const [showModal, setShowModal] = useState(false);
    const [editingMetric, setEditingMetric] = useState<Metric | null>(null);
    const [metricToDelete, setMetricToDelete] = useState<Metric | null>(null);

    const categories: string[] = [...METRIC_CATEGORIES];

    useEffect(() => {
        // Skip saving on initial mount to prevent unnecessary write operation
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        localStorage.setItem('userMetrics', JSON.stringify(userMetrics));
    }, [userMetrics]);

    // Sync selectedCategory if it becomes invalid when categories change
    useEffect(() => {
        if (!categories.includes(selectedCategory)) {
            setSelectedCategory(categories[0] || 'All');
        }
        // categories is derived from METRIC_CATEGORIES constant, so the lint warning can be ommited
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCategory]);

    const handleCategoryChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedCategory(event.target.value);
    };

    const handleUserCategoryChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setUserSelectedCategory(event.target.value);
    };

    const handleOpenModal = (metric: Metric | null = null) => {
        setEditingMetric(metric);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingMetric(null);
    };

    const handleSaveMetric = (metricData: {
        label: string;
        description: string;
        category: string;
        code?: string;
    }) => {
        try {
            if (editingMetric) {
                // Edycja istniejącej metryki
                updatePlugin(editingMetric.value, {
                    name: metricData.label,
                    description: metricData.description,
                    category: metricData.category,
                    code: metricData.code || editingMetric.code // zachowaj stary kod jeśli nie podano nowego (choć formularz wymaga)
                });
            } else {
                // Tworzenie nowej metryki
                createPlugin(
                    metricData.label,
                    metricData.description,
                    metricData.category,
                    metricData.code || ''
                );
            }
            handleCloseModal();
        } catch (err: any) {
            console.error(err);
            alert(err.message || 'Failed to save metric locally');
        }
    };

    const handleDeleteMetric = (metric: Metric) => {
        setMetricToDelete(metric);
    };

    const confirmDeleteMetric = () => {
        if (metricToDelete) {
            setUserMetrics(prev => prev.filter(m => m.value !== metricToDelete.value));
            setMetricToDelete(null);
        }
    };

    const getPredefinedMetrics = (): Metric[] => {
        return PREDEFINED_METRICS
            .filter(metric => (selectedCategory === 'All' || metric.category === selectedCategory))
            .filter(metric => metric.label.toLowerCase().includes(searchQuery.toLowerCase()));
    };

    const getUserMetricsFiltered = (): Metric[] => {
        return userMetrics
            .filter(metric => (userSelectedCategory === 'All' || metric.category === userSelectedCategory))
            .filter(metric => metric.label.toLowerCase().includes(userSearchQuery.toLowerCase()));
    };

    const predefinedMetricsList = getPredefinedMetrics();
    const userMetricsList = getUserMetricsFiltered();

    return (
        <Col className="section-container d-flex flex-column p-5 gap-3 w-100 overflow-hidden" style={{ height: "calc(100vh - var(--nav-height) - 2 * var(--section-margin))" }}>
            <Header title="Metrics" subtitle="Manage and configure analysis metrics for your time series data" />

            <Tabs
                activeKey={activeTab}
                onSelect={(k) => setActiveTab(k || "predefined")}
                className="tabs-top nav nav-tabs"
                fill={true}
            >
                <Tab eventKey="predefined" title="Predefined Metrics" className="tab-group d-flex flex-column flex-grow-1">
                    <div className="metrics-content-container d-flex flex-column gap-3 flex-grow-1">
                        <div className="header d-flex align-items-end justify-content-between p-1">
                            <Form.Control
                                type="search"
                                placeholder="Search metrics..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="search-box-instance"
                            />
                            <div className="d-flex flex-column align-items-start">
                                <Select
                                    id="category-select"
                                    selected={selectedCategory}
                                    categories={categories}
                                    onChange={handleCategoryChange}
                                />
                            </div>
                        </div>

                        <div className="container-installed d-flex flex-column gap-3 overflow-auto flex-grow-1">
                            {predefinedMetricsList.length === 0 ? (
                                <div className="empty-state-message">
                                    No metrics found matching your search criteria.
                                </div>
                            ) : (
                                predefinedMetricsList.map(opt => (
                                    <MetricRow
                                        key={opt.value}
                                        checkbox={false}
                                        onShowChange={() => {}}
                                        currentlyActiveBadge={false}
                                        className="metric-row-instance w-100"
                                        text={opt.label}
                                        description={opt.description}
                                        category={opt.category}
                                        showCheckbox={false}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                </Tab>
                <Tab eventKey="user" title="User Metrics" className="tab-group d-flex flex-column flex-grow-1">
                    <div className="metrics-content-container d-flex flex-column gap-3 flex-grow-1">
                        <div className="header d-flex align-items-end justify-content-between p-1">
                            <Form.Control
                                type="search"
                                placeholder="Search metrics..."
                                value={userSearchQuery}
                                onChange={(e) => setUserSearchQuery(e.target.value)}
                                className="search-box-instance"
                            />
                            <div className="d-flex align-items-end gap-3">
                                <Button variant="secondary" onClick={() => handleOpenModal()}>
                                    Add Your Custom Metric
                                </Button>
                                <Select
                                    id="user-category-select"
                                    selected={userSelectedCategory}
                                    categories={categories}
                                    onChange={handleUserCategoryChange}
                                />
                            </div>
                        </div>

                        <div className="container-installed d-flex flex-column gap-3 overflow-auto flex-grow-1">
                            {userMetricsList.length === 0 ? (
                                <div className="empty-state-message">
                                    {userMetrics.length === 0
                                        ? "No custom metrics yet. Click 'Add Your Custom Metric' to get started."
                                        : "No metrics found matching your search criteria."}
                                </div>
                            ) : (
                                userMetricsList.map(opt => (
                                    <MetricRow
                                        key={opt.value}
                                        checkbox={false}
                                        onShowChange={() => {}}
                                        currentlyActiveBadge={false}
                                        className="metric-row-instance w-100"
                                        text={opt.label}
                                        description={opt.description}
                                        category={opt.category}
                                        showCheckbox={false}
                                        onEdit={() => handleOpenModal(opt)}
                                        onDelete={() => handleDeleteMetric(opt)}
                                        isUser={true}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                </Tab>
            </Tabs>

            <MetricModal
                show={showModal}
                onHide={handleCloseModal}
                onSave={handleSaveMetric}
                editingMetric={editingMetric}
                categories={categories.filter(c => c !== 'All')}
                existingLabels={userMetrics
                    .filter(m => !editingMetric || m.value !== editingMetric.value)
                    .map(m => m.label)
                }
            />

            <Modal show={!!metricToDelete} onHide={() => setMetricToDelete(null)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Confirm Delete</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    Are you sure you want to delete the metric <strong>"{metricToDelete?.label}"</strong>?
                    This action cannot be undone.
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setMetricToDelete(null)}>
                        Cancel
                    </Button>
                    <Button variant="danger" onClick={confirmDeleteMetric}>
                        Delete
                    </Button>
                </Modal.Footer>
            </Modal>
        </Col>
    );
}

export default MetricsPage;