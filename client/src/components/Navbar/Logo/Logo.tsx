import { JSX } from "react";
import { GraphUp } from "react-bootstrap-icons";

export const LogoPlaceHolder = (): JSX.Element => {
  return (
    <div className="d-inline-flex align-items-center gap-3 px-2 text-gray-900 me-5">
      <GraphUp size={24} />
      <div className="fs-5 fw-normal lh-base">SeriesDiff</div>
    </div>
  );
};
