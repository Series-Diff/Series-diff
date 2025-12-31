import { JSX } from "react";
import { Card } from "react-bootstrap";

export const HelpReports = (): JSX.Element => {
  return (
    <Card className="text-start">
      <Card.Header>
        <Card.Title as="h4" className="mb-0">Generating Reports</Card.Title>
      </Card.Header>
      <Card.Body>
        <Card.Text>
          Generating Reports
        </Card.Text>
      </Card.Body>
    </Card>
  );
};
