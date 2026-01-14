import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Spinner } from 'react-bootstrap';
import Select from '../Select/Select';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs';
import 'prismjs/components/prism-python';
import 'prismjs/themes/prism.css';
import { validatePluginCode } from '../../services/pluginService';

const PLUGIN_TEMPLATE = `def calculate(series1, series2) -> float:
    # Align series by timestamp (returns DataFrame with 'value1', 'value2' columns)
    aligned = get_aligned_data(series1, series2)
    
    # Calculate your metric
    diff = aligned['value1'] - aligned['value2']
    return float(np.mean(np.abs(diff)))
`;

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
    // Changed the type of editingMetric to explicitly include code (which is optional in the Metric interface but needed here)
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
    const [isValidating, setIsValidating] = useState(false);
    const isEditing = !!editingMetric;

    useEffect(() => {
        if (show) {
            if (editingMetric) {
                setLabel(editingMetric.label);
                setDescription(editingMetric.description);
                setCategory(editingMetric.category);
                // Prefill code if it exists
                setCode(editingMetric.code || '');
            } else {
                setLabel('');
                setCode('');
                setDescription('');
                setCategory(categories.length > 0 ? categories[0] : '');
            }
            setTitleError(null);
            setCodeError(null);
            setIsValidating(false);
        }
    }, [show, editingMetric, categories]);

    useEffect(() => {
        if (categories.length > 0 && !categories.includes(category)) {
            setCategory(categories[0]);
        }
    }, [categories, category]);

    const handleSubmit = async (e: React.FormEvent) => {
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

        // Code validation - code is always required, even when editing, for the plugin to work
        if (!code.trim()) {
            setCodeError('Code is required.');
            hasError = true;
        } else {
            setCodeError(null);
        }

        if (hasError) {
            return;
        }

        // Backend validation for security and syntax
        setIsValidating(true);
        try {
            const validationResult = await validatePluginCode(code);
            if (!validationResult.valid) {
                setCodeError(validationResult.error || 'Invalid plugin code');
                setIsValidating(false);
                return;
            }
        } catch (err: any) {
            setCodeError('Failed to validate code. Please try again.');
            setIsValidating(false);
            return;
        }
        setIsValidating(false);

        onSave({ label: trimmedLabel, description, category, code });
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
                        <div className="d-flex justify-content-between align-items-center mb-1">
                            <Form.Label className="mb-0">Python code <span className="text-danger">*</span></Form.Label>
                            <Button
                                variant="outline-secondary"
                                size="sm"
                                onClick={() => setCode(PLUGIN_TEMPLATE)}
                                disabled={isValidating}
                            >
                                Insert Template
                            </Button>
                        </div>
                        <div className={`form-control p-0 ${!!codeError ? 'is-invalid' : ''}`} style={{ overflow: 'hidden' }}>
                            <Editor
                                value={code}
                                onValueChange={(code) => {
                                    setCode(code);
                                    if (code.trim()) setCodeError(null);
                                }}
                                highlight={code => highlight(code, languages.python, 'python')}
                                padding={10}
                                style={{
                                    fontFamily: 'monospace',
                                    fontSize: '0.85em',
                                    minHeight: '300px',
                                }}
                                textareaClassName="focus-ring"
                            />
                        </div>

                        {codeError && (
                            <Form.Text className="text-danger d-block">
                                {codeError}
                            </Form.Text>
                        )}
                        <Form.Text className="text-muted">
                            Plugin needs to implement function <br /> <code>calculate(series1, series2)
                                -&gt; float</code>
                        </Form.Text>
                        <Form.Text className="text-muted">
                            <br />Helper function:
                            <br /><code>get_aligned_data(series1, series2, tolerance=None)</code>
                            <br /><small>Aligns two series by timestamp. Returns a DataFrame with both time series aligned by timestamp with columns 'value1' and 'value2'.</small>
                        </Form.Text>
                        <Form.Text className="text-muted">
                            <br />Available libraries:
                            <br /><code>pd (pandas), np (numpy), scipy, scipy.stats, scipy.signal,
                                <br />sklearn.metrics, statsmodels.api (sm), statsmodels.tsa.api (tsa)</code>
                        </Form.Text>
                    </Form.Group>

                </Form>
            </Modal.Body>
            <Modal.Footer className="justify-content-end">
                <Button variant="secondary" onClick={onHide} className="me-2" disabled={isValidating}>
                    Cancel
                </Button>
                <Button variant="primary" onClick={handleSubmit} disabled={isValidating}>
                    {isValidating ? (
                        <>
                            <Spinner animation="border" size="sm" className="me-2" />
                            Validating...
                        </>
                    ) : (
                        'Save'
                    )}
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default MetricModal;