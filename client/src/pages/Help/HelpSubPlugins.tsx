import { JSX } from "react";
import { Card, Alert } from "react-bootstrap";

export const HelpPlugins = (): JSX.Element => {
  return (
    <Card className="text-start">
      <Card.Header>
        <Card.Title as="h4" className="mb-0">Plugins and Extensions</Card.Title>
      </Card.Header>
      <Card.Body>
        <Card.Text>
          Plugins extend SeriesDiff functionality by adding custom analysis methods and calculations. 
          You can enable, disable, and configure plugins to suit your analysis needs.
        </Card.Text>

        <Alert variant="info">
          <Alert.Heading>About Plugins:</Alert.Heading>
          <ul>
            <li>Plugins are optional modules that add specialized analysis capabilities</li>
            <li>Each plugin performs specific calculations or data transformations</li>
            <li>All plugins are validated and executed in secure sandboxed environments</li>
            <li>Plugin results appear alongside built-in metrics on the Dashboard</li>
            <li>Custom plugins can be added and edited through the Metrics page</li>
          </ul>
        </Alert>

        <Alert variant="success">
          <Alert.Heading>Managing Plugins:</Alert.Heading>
          <ol>
            <li>Go to the <strong>Metrics</strong> page and <strong>User Metrics</strong> tab to view all available plugins</li>
            <li>Here you can search, filter by category, edit or delete all listed plugins</li>
            <li> You can also add new plugins by clicking the <strong>Add Your Custom Metric</strong> button</li>
            <li>Enabled plugins automatically run calculations on your data</li>
            <li>View plugin results on the <strong>Dashboard</strong> page</li>
          </ol>
        </Alert>

        <Alert variant="warning">
          <Alert.Heading>Plugin Performance:</Alert.Heading>
          <ul>
            <li>More enabled plugins may increase calculation time</li>
            <li>Large datasets with many plugins can consume more system resources</li>
            <li>Disable unused plugins for better performance</li>
            <li>Plugin results update whenever data or time range changes</li>
          </ul>
        </Alert>

        <Card.Text>
          For more information on creating and managing plugins, visit the <strong>Metrics</strong> page and explore the <strong>User Metrics</strong> tab.</Card.Text>
      </Card.Body>
    </Card>
  );
};
