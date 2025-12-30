import React, { useState, useEffect } from 'react';
import './MetricsPage.css';
import { Form, Tabs, Tab, Col, Button, Modal } from "react-bootstrap";
import { Select, MetricModal, MetricRow, Header, MetricInfoModal } from '../components';
import { Metric, METRIC_CATEGORIES, PREDEFINED_METRICS } from '../constants/metricsConfig';
import { useLocalPlugins } from '../hooks/useLocalPlugins';
import { getMetricDescription, hasMetricDescription } from '../constants/metricsDescriptions';

function MetricsPage() {
    const [selectedCategory, setSelectedCategory] = useState<string>("All");
    const [userSelectedCategory, setUserSelectedCategory] = useState<string>("All");
    const [activeTab, setActiveTab] = useState("predefined");
    const [searchQuery, setSearchQuery] = useState("");
    const [userSearchQuery, setUserSearchQuery] = useState("");

    const {
        plugins,
        createPlugin,
        updatePlugin,
        deletePlugin
    } = useLocalPlugins();

    const [showModal, setShowModal] = useState(false);
    const [editingMetric, setEditingMetric] = useState<Metric | null>(null);
    const [metricToDelete, setMetricToDelete] = useState<Metric | null>(null);
    const [showInfoModal, setShowInfoModal] = useState(false);
    const [selectedMetricKey, setSelectedMetricKey] = useState<string | null>(null);

    const categories: string[] = [...METRIC_CATEGORIES];

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
                // Editing an existing metric
                updatePlugin(editingMetric.value, {
                    name: metricData.label,
                    description: metricData.description,
                    category: metricData.category,
                    code: metricData.code
                });
            } else {
                // Creating a new metric
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

    const handleShowInfo = (metricKey: string) => {
        if (hasMetricDescription(metricKey)) {
            setSelectedMetricKey(metricKey);
            setShowInfoModal(true);
        }
    };

    const confirmDeleteMetric = () => {
        if (metricToDelete) {
            // metric.value is the plugin ID (from the mapping in getUserMetricsFiltered)
            deletePlugin(metricToDelete.value);
            setMetricToDelete(null);
        }
    };

    const getPredefinedMetrics = (): Metric[] => {
        return PREDEFINED_METRICS
            .filter(metric => (selectedCategory === 'All' || metric.category === selectedCategory))
            .filter(metric => metric.label.toLowerCase().includes(searchQuery.toLowerCase()));
    };


    const getUserMetricsFiltered = (): Metric[] => {
        const metricsFromPlugins: Metric[] = plugins.map(p => ({
            value: p.id,
            label: p.name,
            description: p.description,
            category: p.category,
            code: p.code // Przekazujemy kod, aby można go było edytować
        }));

        return metricsFromPlugins
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
                                        onShowChange={() => { }}
                                        currentlyActiveBadge={false}
                                        className="metric-row-instance w-100"
                                        text={opt.label}
                                        description={opt.description}
                                        category={opt.category}
                                        showCheckbox={false}
                                        metricKey={opt.value}
                                        onShowInfo={handleShowInfo}
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
                                    {plugins.length === 0
                                        ? "No custom metrics yet. Click 'Add Your Custom Metric' to get started."
                                        : "No metrics found matching your search criteria."}
                                </div>
                            ) : (
                                userMetricsList.map(opt => (
                                    <MetricRow
                                        key={opt.value}
                                        checkbox={false}
                                        onShowChange={() => { }}
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
                existingLabels={plugins
                    .filter(p => !editingMetric || p.id !== editingMetric.value)
                    .map(p => p.name)
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

            {selectedMetricKey && getMetricDescription(selectedMetricKey) && (
                <MetricInfoModal
                    show={showInfoModal}
                    onHide={() => setShowInfoModal(false)}
                    metricInfo={getMetricDescription(selectedMetricKey)!}
                />
            )}
        </Col>
    );
}

export default MetricsPage;
