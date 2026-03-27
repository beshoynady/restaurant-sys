import BrandService from '../../services/core/brand.service.js';
import { createBrandSchema, updateBrandSchema } from '../../validations/core/brand.validation.js';
import asyncHandler from '../../utils/asyncHandler.js';


/*********************
 * Create Brand
 */

class BrandController {  
  create = asyncHandler( async (req, res) => {
      const userId = req.user._id; // Assuming user info is attached to the request
    const { error, value } = createBrandSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const brand = await BrandService.createBrand(value);
    res.status(201).json({ data: brand });
  });

  getById = asyncHandler( async (req, res) => {
    const { id } = req.params;
    const brand = await BrandService.getBrandById(id);
    res.status(200).json({ data: brand });
  });

  getAll = asyncHandler( async (req, res) => {
    const brands = await BrandService.getAllBrands();
    res.status(200).json({ data: brands });
  }
  );

  update = asyncHandler( async (req, res) => {
      const userId = req.user._id; // Assuming user info is attached to the request

    const { id } = req.params;
    const { error, value } = updateBrandSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    const updatedBrand = await BrandService.updateBrand(id, value, userId);
    res.status(200).json({ data: updatedBrand });
  });

  updateLogo = asyncHandler( async (req, res) => {
      const userId = req.user._id; // Assuming user info is attached to the request
    const { id } = req.params;
    if (!req.file) {
      return res.status(400).json({ error: "Logo file is required" });
    }
    const logoUrl = req.file.path; // Assuming file path is stored in req.file.path
    const updatedBrand = await BrandService.updateBrandLogo(id, logoUrl, userId);
    res.status(200).json({ data: updatedBrand });
  }
  );

  delete = asyncHandler( async (req, res) => {
      const userId = req.user._id; // Assuming user info is attached to the request

    const { id } = req.params;
    await BrandService.deleteBrand(id, userId);
    res.status(204).send();
  }
  );
}

export default new BrandController();