import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import Select from '../Select/Select';

interface MetricData {
    label: string;
    description: string;
    category: string;
    file?: File;
}

interface MetricModalProps {
    show: boolean;
    onHide: () => void;
    onSave: (data: MetricData) => void;
    editingMetric: { label: string; description: string; category: string; fileName?: string; file?: File } | null;
    categories: string[];
    existingLabels: string[];
}

const MetricModal: React.FC<MetricModalProps> = ({
    show,
    onHide,
    onSave,
    editingMetric,
    categories,
    existingLabels
}) => {
    const [label, setLabel] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState(categories[0] || '');
    const [file, setFile] = useState<File | undefined>(undefined);
    const [titleError, setTitleError] = useState<string | null>(null);
    const [fileError, setFileError] = useState<string | null>(null);
    const isEditing = !!editingMetric;

    // Reset form only when modal opens (show changes to true) or editingMetric changes
    useEffect(() => {
        if (show) {
            if (editingMetric) {
                setLabel(editingMetric.label);
                setDescription(editingMetric.description);
                setCategory(editingMetric.category);
            } else {
                setLabel('');
                setDescription('');
                setCategory(categories.length > 0 ? categories[0] : '');
            }
            setFile(undefined);
            setTitleError(null);
            setFileError(null);
        }
    }, [show, editingMetric]); // eslint-disable-line react-hooks/exhaustive-deps
    // Intentionally not including categories to avoid resetting form on category changes

    // Sync category state if categories prop changes and current category becomes invalid
    useEffect(() => {
        if (categories.length > 0 && !categories.includes(category)) {
            setCategory(categories[0]);
        }
    }, [categories, category]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        let hasError = false;
        const trimmedLabel = label.trim();

        if (!trimmedLabel) {
            setTitleError('Title is required.');
            hasError = true;
        } else {
            // Check for duplicate title (case-insensitive, trimmed)
            const isDuplicate = existingLabels.some(
                existingLabel => existingLabel.toLowerCase() === trimmedLabel.toLowerCase()
            );
            if (isDuplicate) {
                setTitleError(`A metric with the title "${trimmedLabel}" already exists. Please choose a different title.`);
                hasError = true;
            } else {
                setTitleError(null);
            }
        }

        if (!isEditing && !file) {
            setFileError('File is required for new metrics.');
            hasError = true;
        } else {
            setFileError(null);
        }

        // Also check for duplicate title error from parent
        if (hasError) {
            return;
        }

        onSave({ label: trimmedLabel, description, category, file });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setFileError(null);
        }
    };

    const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLabel(e.target.value);
        if (e.target.value.trim()) {
            setTitleError(null);
        }
    };

    const fileUploadTooltip = (
        <Tooltip id="file-upload-tooltip">
            Once uploaded, the metric file cannot be changed. You will need to delete and re-create the metric to use a different file.
        </Tooltip>
    );

    return (
        <Modal show={show} onHide={onHide} centered>
            <Modal.Header closeButton>
                <Modal.Title>{isEditing ? 'Edit Metric' : 'Add Your Custom Metric'}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form onSubmit={handleSubmit} noValidate>
                    {!isEditing && (
                        <Form.Group className="mb-3">
                            <Form.Label>
                                File <span className="text-danger">*</span>
                            </Form.Label>
                            <OverlayTrigger placement="right" overlay={fileUploadTooltip}>
                                <Form.Control
                                    type="file"
                                    onChange={handleFileChange}
                                    isInvalid={!!fileError}
                                />
                            </OverlayTrigger>
                            {fileError && (
                                <Form.Text className="text-danger">
                                    {fileError}
                                </Form.Text>
                            )}
                        </Form.Group>
                    )}
                    {isEditing && editingMetric?.fileName && (
                        <p className="text-muted">
                            <strong>Current file:</strong> {editingMetric.fileName}
                            <br />
                            <small className="text-secondary">Note: The file cannot be changed after creation.</small>
                        </p>
                    )}
                    <Form.Group className="mb-3">
                        <Form.Label>
                            Title <span className="text-danger">*</span>
                        </Form.Label>
                        <Form.Control
                            type="text"
                            value={label}
                            onChange={handleLabelChange}
                            isInvalid={!!titleError}
                        />
                        {titleError && (
                            <Form.Text className="text-danger">
                                {titleError}
                            </Form.Text>
                        )}
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Description</Form.Label>
                        <Form.Control
                            as="textarea"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Category</Form.Label>
                        <Select
                            id="metric-category-select"
                            selected={category}
                            categories={categories}
                            onChange={(e) => setCategory(e.target.value)}
                        />
                    </Form.Group>
                </Form>
            </Modal.Body>
            <Modal.Footer className="justify-content-end">
                <Button variant="primary" onClick={handleSubmit}>
                    Save
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default MetricModal;