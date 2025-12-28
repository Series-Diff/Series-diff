import React from 'react';
import { Form, Button, Table } from 'react-bootstrap';
import { DifferenceOption } from '../../../hooks/useDifferenceChart';

interface DifferenceSelectionPanelProps {
    differenceOptions: DifferenceOption[];
    selectedDifferences: string[];
    reversedDifferences: Record<string, boolean>;
    onDifferenceCheckboxChange: (diffFullName: string) => void;
    onReverseToggle: (diffFullName: string) => void;
    onSelectAllToggle: () => void;
    isLoading: boolean;
}

const DifferenceSelectionPanel: React.FC<DifferenceSelectionPanelProps> = ({
    differenceOptions,
    selectedDifferences,
    reversedDifferences,
    onDifferenceCheckboxChange,
    onReverseToggle,
    onSelectAllToggle,
    isLoading,
}) => {
    const allSelected = differenceOptions.length > 0 && 
        differenceOptions.every(opt => selectedDifferences.includes(opt.value));

    return (
        <div className="section-container group-menu d-flex flex-column align-items-center rounded">
            <h4>Difference Selection</h4>

            <div className="w-100 mt-3">
                {/* Selection controls */}
                <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="text-muted small">{selectedDifferences.length} selected</span>
                    <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={onSelectAllToggle}
                        disabled={isLoading || differenceOptions.length === 0}
                    >
                        {allSelected ? "Deselect All" : "Select All"}
                    </Button>
                </div>

                {/* Differences table */}
                {differenceOptions.length > 0 ? (
                    <div className="border rounded overflow-auto" style={{ maxHeight: '400px' }}>
                        <Table size="sm" className="mb-0" hover>
                            <thead className="table-light sticky-top">
                                <tr>
                                    <th className="text-center" style={{ width: '50px' }}>Show</th>
                                    <th className="text-center" style={{ width: '60px' }}>Reverse</th>
                                    <th>Series</th>
                                </tr>
                            </thead>
                            <tbody>
                                {differenceOptions.map(opt => (
                                    <tr key={opt.value}>
                                        <td className="text-center align-middle">
                                            <Form.Check
                                                type="checkbox"
                                                checked={selectedDifferences.includes(opt.value)}
                                                onChange={() => onDifferenceCheckboxChange(opt.value)}
                                                disabled={isLoading}
                                            />
                                        </td>
                                        <td className="text-center align-middle">
                                            <Form.Check
                                                type="checkbox"
                                                checked={!!reversedDifferences[opt.value]}
                                                onChange={() => onReverseToggle(opt.value)}
                                                disabled={isLoading || !selectedDifferences.includes(opt.value)}
                                            />
                                        </td>
                                        <td className="align-middle small">{opt.label}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>
                ) : (
                    <div className="text-center text-muted py-3">
                        {isLoading ? 'Loading differences...' : 'No differences available for this category.'}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DifferenceSelectionPanel;
