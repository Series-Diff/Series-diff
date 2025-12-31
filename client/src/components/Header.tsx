import { JSX } from "react";
import { Container, Row, Col } from "react-bootstrap";

interface Props {
  title: string;
  subtitle: string;
}

export const Header = ({ title, subtitle }: Props): JSX.Element => {
  return (
    <Container fluid className="px-0">
      <Row className="w-100 text-start">
        <Col>
          <h1 className="display-4 fw-bold mb-0">{title}</h1>
          <p className="fs-6 fw-medium mb-0">{subtitle}</p>
        </Col>
      </Row>
    </Container>
  );
};
