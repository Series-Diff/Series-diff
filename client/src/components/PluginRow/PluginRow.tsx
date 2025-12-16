// src/components/PluginRow/PluginRow.tsx
import React from 'react';
import { Badge as BootstrapBadge, Button, Form } from 'react-bootstrap';
import { Gear, InfoCircle, Pencil, Trash } from 'react-bootstrap-icons';

interface PluginRowProps {
    checkbox: boolean;
    currentlyActiveBadge: boolean;
    className?: string;
    text: string;
    description: string;
    onShowChange: () => void;
    category: string;
    showCheckbox?: boolean;
    isUser?: boolean;
    onEdit?: () => void;
    onDelete?: () => void;
}

export const PluginRow: React.FC<PluginRowProps> = ({
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
}) => {
    return (
        <div className={`plugin-row ${className || ''}`}>
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
            <div className="text-2 d-flex flex-column justify-content-between">
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
            {isUser && (
                <div className="buttons d-flex gap-2">
                    <Button variant="outline-secondary" size="sm" onClick={onEdit} aria-label="Edit metric">
                        <Pencil />
                    </Button>
                    <Button variant="outline-danger" size="sm" onClick={onDelete} aria-label="Delete metric">
                        <Trash />
                    </Button>
                </div>
            )}
        </div>
    );
};