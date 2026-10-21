/**
 * ProofingGroup.tsx — Review tab: Proofing group (layout only)
 */

import {
  ProofingGroupIcon3,
  ProofingGroupIcon2,
  ProofingGroupIcon1,
} from "@cyber-sheet/icons/react";
import React from "react";
import type { Workbook } from "@cyber-sheet/core";

interface ProofingGroupProps {
  workbook: Workbook;
  onCommand?: (command: any) => void;
}

export const ProofingGroup: React.FC<ProofingGroupProps> = ({
  onCommand,
}) => {
  const handleSpelling = () => {
    console.log("Spelling check (F7)");
    onCommand?.({ type: "checkSpelling" });
  };

  const handleThesaurus = () => {
    console.log("Thesaurus (Shift+F7)");
    onCommand?.({ type: "openThesaurus" });
  };

  const handleResearch = () => {
    console.log("Research pane");
    onCommand?.({ type: "openResearch" });
  };

  return (
    <div className="formulas-group review-proofing">
      <div className="formulas-group-body review-proofing-row">
        <button
          type="button"
          className="formulas-btn-large review-proofing-btn"
          onClick={handleSpelling}
          title="Spelling (F7)"
        >
          <ProofingGroupIcon1 />
          <span>Spelling</span>
        </button>

        <button
          type="button"
          className="formulas-btn-large review-proofing-btn"
          onClick={handleThesaurus}
          title="Thesaurus (Shift+F7)"
        >
          <ProofingGroupIcon2 />
          <span>Thesaurus</span>
        </button>

        <button
          type="button"
          className="formulas-btn-large review-proofing-btn"
          onClick={handleResearch}
          title="Research"
        >
          <ProofingGroupIcon3 />
          <span>Research</span>
        </button>
      </div>

      <div className="formulas-group-caption">Proofing</div>
    </div>
  );
};
