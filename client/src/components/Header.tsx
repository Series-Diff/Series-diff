import { JSX } from "react";

interface Props {
  title: string;
  subtitle: string;
}

export const Header = ({ title, subtitle }: Props): JSX.Element => {
  return (
    <div className="d-flex flex-column w-100 text-start">
      <h1 className="display-4 fw-bold mb-0">{title}</h1>
      <p className="fs-6 fw-medium mb-0">{subtitle}</p>
    </div>
  );
};
