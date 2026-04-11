import systemSetupService from "../../services/defaults/system-setup.service";
class InitialSetupUseCase {
  constructor({
    brandService,
    branchService,
    userService,
    roleService,
    generateUniqueSlug,
  }) {
    this.brandService = brandService;
    this.branchService = branchService;
    this.userService = userService;
    this.roleService = roleService;
    this.generateSlug = generateUniqueSlug;
  }

  async execute(data) {
    const { brandName, countryCode, brandAddress, branchName, username, password, email, phone  } = data;

    const brandsCount = await this.brandService.count();
    if (brandsCount > 0) {
      throw new Error("System already initialized");
    }

    const session = await this.brandService.startSession();

    try {
      session.startTransaction();

      // ✅ Create Brand
      const brand = await this.brandService.create(
        {
          name: brandName,
          dashboardLanguage: ["EN", "AR"],
          defaultDashboardLanguage: "EN",
          slug: this.generateSlug(brandName.EN),
          countryCode,
          setupStatus: "basic", // Mark as basic after initial setup
          status: "active",
          createdBy: null,
        },
        { session },
      );

      // ✅ Create Branch
      const branch = await this.branchService.create(
        {
          brand: brand._id, 
          name: branchName,
          slug: this.generateSlug(branchName.EN),
          address: brandAddress,
          isMainBranch: true,
          createdBy: null,
        },
        { session },
      );

      await systemSetupService.setupBrand({ brandId: brand._id, session });

        const ownerRole = await this.roleService.findOne(
        { brand: brand._id, name: "Owner" },
        null,
        { session },
      );
      // hash password before saving
      const hashedPassword = await this.userService.hashPassword(
        password,
      );

      // ✅ Create Owner

      const ownerData = {
        brand: brand._id,
        branch: branch._id,
        username: username.toLowerCase().trim(),
        email: email?email.toLowerCase():null,
        phone: phone?phone.trim():null,
        role: ownerRole._id,
        password: hashedPassword, // Use the hashed password
      };
      const user = await this.userService.create(
        ownerData,
        { session },
      );

      const updatebrand = await this.brandService.update(
        brand._id,
        {
          createdBy: user._id,
        },
        { session },
      );

      const updateBranch = await this.branchService.update(
        branch._id,
        {
          createdBy: user._id,
        },
        { session },
      );

      await session.commitTransaction();

      return { brand, branch, user };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}

export default InitialSetupUseCase;
