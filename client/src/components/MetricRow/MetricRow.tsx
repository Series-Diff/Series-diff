import React from 'react';
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
                        aria-label="Metric information"
                        className="p-0"
                        title="Metric information"
                    >
                        <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            width="20" 
                            height="20" 
                            fill="currentColor" 
                            className="bi bi-info-circle" 
                            viewBox="0 0 16 16"
                        >
                            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                            <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
                        </svg>
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