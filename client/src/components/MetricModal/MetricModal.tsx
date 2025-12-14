// src/components/MetricModal/MetricModal.tsx
import React, { useState, useEffect } from 'react';
import { Modal, Form, Button } from 'react-bootstrap';
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
}

const MetricModal: React.FC<MetricModalProps> = ({ show, onHide, onSave, editingMetric, categories }) => {
    const [label, setLabel] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState(categories[0] || '');
    const [file, setFile] = useState<File | undefined>(undefined);
    const isEditing = !!editingMetric;

    useEffect(() => {
        if (editingMetric) {
            setLabel(editingMetric.label);
            setDescription(editingMetric.description);
            setCategory(editingMetric.category);
            setFile(undefined); // Do not set file for editing, as file cannot be changed
        } else {
            setLabel('');
            setDescription('');
            setCategory(categories[0] || '');
            setFile(undefined);
        }
    }, [editingMetric, categories]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!label.trim()) {
            alert('Title is required.');
            return;
        }
        if (!isEditing && !file) {
            alert('File is required for new metrics.');
            return;
        }
        onSave({ label, description, category, file });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    return (
        <Modal show={show} onHide={onHide} centered>
            <Modal.Header closeButton>
                <Modal.Title>{isEditing ? 'Edit Metric' : 'Add Your Custom Metric'}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form onSubmit={handleSubmit}>
                    {!isEditing && (
                        <Form.Group className="mb-3">
                            <Form.Label>File</Form.Label>
                            <Form.Control type="file" onChange={handleFileChange} required />
                        </Form.Group>
                    )}
                    {isEditing && editingMetric?.fileName && <p>Current file: {editingMetric.fileName}</p>}
                    <Form.Group className="mb-3">
                        <Form.Label>Title</Form.Label>
                        <Form.Control
                            type="text"
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            required
                        />
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