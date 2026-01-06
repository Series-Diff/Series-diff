import React from 'react';
import { Modal, Button, Accordion } from 'react-bootstrap';

interface StatisticsInfoModalProps {
    show: boolean;
    onHide: () => void;
}

const StatisticsInfoModal: React.FC<StatisticsInfoModalProps> = ({ show, onHide }) => {
    const statistics = [
        {
            name: 'Mean',
            description: 'Sum of all values divided by their count. Shows typical value in data.',
            interpretation: 'Higher value = higher values in series.'
        },
        {
            name: 'Median',
            description: 'Middle value in sorted dataset. Robust to outliers.',
            interpretation: 'If median ≈ mean, data is symmetric.'
        },
        {
            name: 'Variance',
            description: 'Average of squared deviations from mean. Measures data dispersion.',
            interpretation: 'Higher value = greater data variability.'
        },
        {
            name: 'Standard Deviation',
            description: 'Square root of variance. Measures typical deviation from mean.',
            interpretation: 'Higher value = more dispersed and variable data.'
        },
        {
            name: 'Autocorrelation',
            description: 'Correlation of series with its lagged version. Shows temporal dependency.',
            interpretation: 'Close to 1 = strong trend, close to 0 = random data.'
        }
    ];

    return (
        <Modal show={show} onHide={onHide} size="lg" centered scrollable>
            <Modal.Header closeButton className="bg-light">
                <Modal.Title style={{ fontSize: '1.25rem' }}>Statistics Information</Modal.Title>
            </Modal.Header>
            <Modal.Body style={{ maxHeight: '60vh' }}>
                <p className="text-muted mb-3" style={{ fontSize: '0.9rem' }}>
                    Below you will find brief descriptions of each statistic displayed for time series.
                </p>
                <Accordion>
                    {statistics.map((stat, index) => (
                        <Accordion.Item eventKey={String(index)} key={index}>
                            <Accordion.Header style={{ fontSize: '0.95rem' }}>
                                <strong>{stat.name}</strong>
                            </Accordion.Header>
                            <Accordion.Body style={{ fontSize: '0.9rem', padding: '0.75rem 1rem' }}>
                                <p className="mb-2"><strong>Description:</strong> {stat.description}</p>
                                <p className="mb-0"><strong>Interpretation:</strong> {stat.interpretation}</p>
                            </Accordion.Body>
                        </Accordion.Item>
                    ))}
                </Accordion>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide} size="sm">
                    Close
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default StatisticsInfoModal;
