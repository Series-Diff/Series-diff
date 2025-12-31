import { JSX } from "react";
import { GraphUp } from "react-bootstrap-icons";
import { Stack } from "react-bootstrap";

export const LogoPlaceHolder = (): JSX.Element => {
  return (
    <Stack direction="horizontal" gap={3} className="px-2 text-gray-900 me-5">
      <GraphUp size={24} />
      <span className="fs-5 fw-normal lh-base">SeriesDiff</span>
    </Stack>
  );
};
