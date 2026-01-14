import React from 'react';
import { InfoCircle } from 'react-bootstrap-icons';
import { Badge as BootstrapBadge, Button, Form } from 'react-bootstrap';
import { Pencil, Trash } from 'react-bootstrap-icons';

interface MetricRowProps {
    checkbox: boolean;
    currentlyActiveBadge: boolean;
    className?: string;
    text: string;
    description: string;
    onShowChange?: () => void;
    category: string;
    showCheckbox?: boolean;
    isUser?: boolean;
    onEdit?: () => void;
    onDelete?: () => void;
    metricKey?: string;
    onShowInfo?: (metricKey: string) => void;
}

export const MetricRow: React.FC<MetricRowProps> = ({
    checkbox,
    currentlyActiveBadge,
    className,
    text,
    description,
    onShowChange,
    category,
    showCheckbox = true,
    isUser = false,
    onEdit,
    onDelete,
    metricKey,
    onShowInfo,
}) => {
    return (
        <div className={`metric-row ${className || ''}`}>
            {showCheckbox && (
                <div className="checkbox-margin">
                    <Form.Check
                        checked={checkbox}
                        onChange={onShowChange}
                        disabled={false}
                        className="design-component-instance-node"
                    />
                </div>
            )}
            <div className="text-2 d-flex flex-column justify-content-between flex-grow-1">
                <div className="metric-name d-flex align-items-center">
                    <div className="text-wrapper-2 fw-bold">{text}</div>
                    <BootstrapBadge className="design-component-instance-node ms-2" bg="secondary">{category}</BootstrapBadge>
                    {currentlyActiveBadge && (
                        <BootstrapBadge className="design-component-instance-node ms-2" bg="primary">Currently Added</BootstrapBadge>
                    )}
                </div>
                <div className="description d-flex align-items-center">
                    <p className="p text-muted mb-0">{description}</p>
                </div>
            </div>
            <div className="buttons d-flex gap-2 align-items-center">
                {metricKey && onShowInfo && (
                    <Button
                        variant="link"
                        size="sm"
                        onClick={() => onShowInfo(metricKey)} 
                        className="p-0 position-absolute top-50 end-0 translate-middle-y me-3"
                        title="Metric information"
                        aria-label="Show metric information"
                    >
                    <InfoCircle size={20} />
                    </Button>
                )}
                {isUser && (
                    <>
                        <Button variant="outline-secondary" size="sm" onClick={onEdit} aria-label="Edit metric">
                            <Pencil />
                        </Button>
                        <Button variant="outline-danger" size="sm" onClick={onDelete} aria-label="Delete metric">
                            <Trash />
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
};