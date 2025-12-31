import { JSX } from "react";
import { Card } from "react-bootstrap";

export const HelpAnomalyDetection = (): JSX.Element => {
  return (
    <Card className="text-start">
      <Card.Header>
        <Card.Title as="h4" className="mb-0">Anomaly Detection</Card.Title>
      </Card.Header>
      <Card.Body>
        <Card.Text>
          Anomaly Detection
        </Card.Text>
      </Card.Body>
    </Card>
  );
};
