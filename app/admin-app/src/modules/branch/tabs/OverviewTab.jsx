/**
 * ==========================================
 * Overview Tab
 * ------------------------------------------
 * Main branch summary view.
 * ==========================================
 */

import BranchInfoCard from "./overview/BranchInfoCard";
import BranchAddressCard from "./overview/BranchAddressCard";
import BranchLocationCard from "./overview/BranchLocationCard";
import BranchManagerCard from "./overview/BranchManagerCard";
import BranchLegalCard from "./overview/BranchLegalCard";
import BranchStatusCard from "./overview/BranchStatusCard";

export default function OverviewTab({ branch }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <BranchInfoCard branch={branch} />
      <BranchStatusCard branch={branch} />
      <BranchAddressCard branch={branch} />
      <BranchLocationCard branch={branch} />
      <BranchManagerCard branch={branch} />
      <BranchLegalCard branch={branch} />
    </div>
  );
}