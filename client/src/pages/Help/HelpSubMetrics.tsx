import { JSX } from "react";
import { Card } from "react-bootstrap";

export const HelpMetrics = (): JSX.Element => {
  return (
    <Card className="text-start">
      <Card.Header>
        <Card.Title as="h4" className="mb-0">Understanding Metrics</Card.Title>
      </Card.Header>
      <Card.Body>
        <Card.Text>
          Understanding Metrics
        </Card.Text>
      </Card.Body>
    </Card>
  );
};
