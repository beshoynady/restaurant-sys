import RoleSeedService from "./seeds/role-seed.service.js";
import DepartmentSeedService from "./seeds/department-seed.service.js";
import AccountSeedService from "./seeds/account-seed.service.js";
import jobTitleSeed from "./job-title.seed.js";

class SystemSetupService {
  async setupBrand({ brandId, session }) {
    try {
      // 1. Roles
      await RoleSeedService.seed(brandId, session);

      // 2. Departments
      await DepartmentSeedService.seed(brandId, session);
      // 3. Job Titles
      await jobTitleSeed.seed(brandId, session);
      // 4. Chart of Accounts
      await AccountSeedService.seed(brandId, session);

      return {
        success: true,
      };
    } catch (error) {
      throw error;
    }
  }
}

export default new SystemSetupService();
