import asyncHandler from "../../utils/asyncHandler.js";
import InitialSetupUseCase from '../../use-cases/setup/initial-setup.usecase.js';
import brandService from '../../services/core/brand.service.js';
import branchService from '../../services/core/branch.service.js';
import userService from '../../services/employees/user-account.service.js';
import { generateUniqueSlug } from "../../utils/generateUniqueSlug.js";

const initialSetupController = asyncHandler(async (req, res) => {
  const useCase = new InitialSetupUseCase({
    brandService,
    branchService,
    userService,
    generateUniqueSlug
  });

  const result = await useCase.execute(req.body);

  res.status(201).json(result);
});

export default initialSetupController;