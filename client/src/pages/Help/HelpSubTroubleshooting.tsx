import { JSX } from "react";
import { Card } from "react-bootstrap";

export const HelpTroubleshooting = (): JSX.Element => {
  return (
    <Card className="text-start">
      <Card.Header>
        <Card.Title as="h4" className="mb-0">Troubleshooting</Card.Title>
      </Card.Header>
      <Card.Body>
        <Card.Text>
          Troubleshooting
        </Card.Text>
      </Card.Body>
    </Card>
  );
};
