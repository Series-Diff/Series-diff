import React, {useState, useEffect} from 'react';
import {Modal, Form, Button} from 'react-bootstrap';
import Select from '../Select/Select';

interface MetricData {
    label: string;
    description: string;
    category: string;
    code?: string;
}

interface MetricModalProps {
    show: boolean;
    onHide: () => void;
    onSave: (data: MetricData) => void;
    // Zmieniono typ editingMetric, aby wyraźnie uwzględniał kod (który jest opcjonalny w interfejsie Metric, ale potrzebny tutaj)
    editingMetric: { label: string; description: string; category: string; code?: string; value?: string } | null;
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
    const [code, setCode] = useState('');
    const [titleError, setTitleError] = useState<string | null>(null);
    const [codeError, setCodeError] = useState<string | null>(null);
    const isEditing = !!editingMetric;

    useEffect(() => {
        if (show) {
            if (editingMetric) {
                setLabel(editingMetric.label);
                setDescription(editingMetric.description);
                setCategory(editingMetric.category);
                // Wypełniamy kod, jeśli istnieje
                setCode(editingMetric.code || '');
            } else {
                setLabel('');
                setCode('');
                setDescription('');
                setCategory(categories.length > 0 ? categories[0] : '');
            }
            setTitleError(null);
            setCodeError(null);
        }
    }, [show, editingMetric, categories]);

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
            const isDuplicate = existingLabels.some(
                existingLabel => existingLabel.toLowerCase() === trimmedLabel.toLowerCase()
            );
            if (isDuplicate) {
                setTitleError(`A metric with the title "${trimmedLabel}" already exists.`);
                hasError = true;
            } else {
                setTitleError(null);
            }
        }

        // Walidacja kodu - kod jest wymagany zawsze, nawet przy edycji, aby plugin działał
        if (!code.trim()) {
            setCodeError('Code is required.');
            hasError = true;
        } else {
            setCodeError(null);
        }

        if (hasError) {
            return;
        }

        onSave({label: trimmedLabel, description, category, code});
    };

    const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLabel(e.target.value);
        if (e.target.value.trim()) {
            setTitleError(null);
        }
    };

    return (
        <Modal show={show} onHide={onHide} centered size="lg">
            <Modal.Header closeButton>
                <Modal.Title>{isEditing ? 'Edit Metric' : 'Add Your Custom Metric'}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form onSubmit={handleSubmit} noValidate>
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

                    <Form.Group className="mb-3">
                        <Form.Label>Python code <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={15}
                            value={code}
                            onChange={(e) => {
                                setCode(e.target.value);
                                if (e.target.value.trim()) setCodeError(null);
                            }}
                            isInvalid={!!codeError}
                            style={{fontFamily: 'monospace', fontSize: '0.85em'}}
                        />
                        {codeError && (
                             <Form.Text className="text-danger d-block">
                                {codeError}
                            </Form.Text>
                        )}
                        <Form.Text className="text-muted">
                            Plugin needs to implement function <br/> <code>calculate(series1, series2) -&gt; float</code>
                        </Form.Text>
                    </Form.Group>

                </Form>
            </Modal.Body>
            <Modal.Footer className="justify-content-end">
                <Button variant="secondary" onClick={onHide} className="me-2">
                    Cancel
                </Button>
                <Button variant="primary" onClick={handleSubmit}>
                    Save
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default MetricModal;