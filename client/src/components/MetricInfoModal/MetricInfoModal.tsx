import React from 'react';
import { Modal, Button, Table } from 'react-bootstrap';
import { MetricDescription } from '../../constants/metricsDescriptions';

interface MetricInfoModalProps {
    show: boolean;
    onHide: () => void;
    metricInfo: MetricDescription | { name: string; description: string; };
}

const MetricInfoModal: React.FC<MetricInfoModalProps> = ({ show, onHide, metricInfo }) => {
    // Check if this is a full metric description or just a plugin description
    const isFullMetric = 'interpretation' in metricInfo;
    
    return (
        <Modal show={show} onHide={onHide} size="lg" centered scrollable>
            <Modal.Header closeButton className="bg-light">
                <Modal.Title style={{ fontSize: '1.25rem' }}>{metricInfo.name}</Modal.Title>
            </Modal.Header>
            <Modal.Body style={{ maxHeight: '60vh' }}>
                <div className="mb-3">
                    <h6 className="text-muted mb-2" style={{ fontSize: '0.9rem' }}>Description:</h6>
                    <p className="mb-0" style={{ fontSize: '0.95rem' }}>{metricInfo.description}</p>
                </div>

                {isFullMetric && (
                    <>
                        <div className="mb-3">
                            <h6 className="text-muted mb-2" style={{ fontSize: '0.9rem' }}>Interpretation:</h6>
                            <p className="mb-0" style={{ fontSize: '0.95rem' }}>{(metricInfo as MetricDescription).interpretation}</p>
                        </div>

                        <div className="mb-3">
                            <h6 className="text-muted mb-2" style={{ fontSize: '0.9rem' }}>Value Range:</h6>
                            <p className="mb-0">
                                <code className="bg-light px-2 py-1 rounded" style={{ fontSize: '0.9rem' }}>{(metricInfo as MetricDescription).range}</code>
                            </p>
                        </div>

                        <div>
                            <h6 className="text-muted mb-2" style={{ fontSize: '0.9rem' }}>Example Values:</h6>
                            <Table bordered hover size="sm" style={{ fontSize: '0.9rem' }}>
                                <thead className="table-light">
                                    <tr>
                                        <th style={{ width: '30%' }}>Value</th>
                                        <th>Meaning</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(metricInfo as MetricDescription).examples.map((example, index) => (
                                        <tr key={index}>
                                            <td>
                                                <code className="bg-light px-2 py-1 rounded" style={{ fontSize: '0.85rem' }}>
                                                    {example.value}
                                                </code>
                                            </td>
                                            <td>{example.meaning}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>
                    </>
                )}
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>
                    Close
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default MetricInfoModal;
