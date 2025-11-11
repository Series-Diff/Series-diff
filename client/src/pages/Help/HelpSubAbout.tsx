import { JSX } from "react";
import { Github } from "react-bootstrap-icons";
import { Card, Alert, Row, Col, Badge, Button } from "react-bootstrap";

export const HelpAbout = (): JSX.Element => {
  return (
    <Card className="text-start">
      <Card.Header>
        <Card.Title as="h4" className="mb-0">About</Card.Title>
      </Card.Header>
      <Card.Body>
        <Card.Title as="h5">SeriesDiff</Card.Title>

        <Card.Text>
          This application was developed as a university project in collaboration with Rockwool, a leading manufacturer of stone wool insulation products. It enables engineers and data analysts to compare and analyze time series data from multiple sensors and predictive models.
        </Card.Text>

        {/* GitHub Repository */}
        {/* target="_blank" - Opens the link in a new tab to keep the app open */}
        {/* rel="noopener"  - Prevents the new tab from accessing the original tab for security */}
        {/* rel="noreferrer"- Hides the referrer URL to protect user privacy */}
        <Button href="https://github.com/Series-Diff/Series-Diff" target="_blank" rel="noopener noreferrer" variant="dark" size="sm" className="mb-3 d-inline-flex align-items-center">
          <Github className="me-2 align-middle" size={16} />
          View on GitHub
        </Button>

        <Row className="mb-3">
          {/* Project Goals */}
          <Col md={6}>
            <Alert variant="light" className="h-100">
              <Alert.Heading>Project Goals</Alert.Heading>
              <ul>
                <li>Enable easy comparison of multiple time series datasets</li>
                <li>Provide intuitive visualization tools for complex data</li>
                <li>Support extensible plugins for custom metrics</li>
                <li>Offer useful anomaly detection</li>
                <li>Generate comprehensive analysis reports</li>
              </ul>
            </Alert>
          </Col>

          {/* Key Features */}
          <Col md={6}>
            <Alert variant="light" className="h-100">
              <Alert.Heading>Key Features</Alert.Heading>
              <ul>
                <li><strong>Data Handling:</strong> Import data in CSV or flat JSON formats</li>
                <li><strong>Visualization:</strong> Interactive charts with primary and secondary axes</li>
                <li><strong>Analysis:</strong> Advanced metrics and anomaly detection algorithms</li>
                <li><strong>Extensibility:</strong> Support for custom plugins to define user-specified metrics</li>
                <li><strong>Reporting:</strong> Generate PDF reports for analysis results</li>
                <li><strong>Usability:</strong> Responsive web interface with real-time data processing</li>
              </ul>
            </Alert>
          </Col>
        </Row>

        {/* Development Details */}
        <Alert variant="light" className="p-3">
          <Alert.Heading>Development Details</Alert.Heading>
          <p>Developed by computer science students as part of their software engineering coursework.</p>
          <p className="mb-1">
            <strong>Frontend: </strong>
            <Badge bg="primary" className="ms-1">React</Badge>
            <Badge bg="primary" className="ms-2">TypeScript</Badge>
          </p>
          <p className="mb-1">
            <strong>Backend: </strong>
            <Badge bg="success" className="ms-1">Python</Badge>
            <Badge bg="success" className="ms-2">Flask</Badge>
          </p>
          <p>
            <strong>Additional Technologies: </strong>
            <Badge bg="secondary" className="ms-1">Bootstrap</Badge>
            <Badge bg="secondary" className="ms-2">Docker</Badge>
          </p>
        </Alert>

        {/* Acknowledgments */}
        <Alert variant="info" className="mb-3">
          <Alert.Heading>Acknowledgments</Alert.Heading>
          Special thanks to Rockwool for providing real-world use cases and to our university supervisor for guidance throughout the development process.
        </Alert>
      </Card.Body>
    </Card>
  );
};
