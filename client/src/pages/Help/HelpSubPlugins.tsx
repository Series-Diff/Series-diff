import { JSX } from "react";
import { Card } from "react-bootstrap";

export const HelpPlugins = (): JSX.Element => {
  return (
    <Card className="text-start">
      <Card.Header>
        <Card.Title as="h4" className="mb-0">Installing Plugins</Card.Title>
      </Card.Header>
      <Card.Body>
        <Card.Text>
          Installing Plugins
        </Card.Text>
      </Card.Body>
    </Card>
  );
};
