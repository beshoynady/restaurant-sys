import CategoryStockmodel from "../../models/category-stock.model.js";

const CreateCategoryStock = async (req, res, next) => {
  try {
    const { categoryName, categoryCode, notes } = req.body;
    const createdBy = req.user.id;

    // Check if the categoryName or categoryCode already exists
    const existingCategory = await CategoryStockmodel.findOne({
      $or: [{ categoryName }, { categoryCode }],
    });
    if (existingCategory) {
      return res
        .status(400)
        .json({ error: "Category name or code already exists" });
    }

    // Create a new category stock entry
    const newCategoryStock = await CategoryStockmodel.create({
      categoryName,
      categoryCode,
      createdBy,
      notes,
    });

    res.status(201).json(newCategoryStock);
  } catch (error) {
    console.error(error);
    res
      .status(400)
      .json({ error: "An error occurred while creating the category stock" });
    next(error);
  }
};

const getallcategoryStock = async (req, res) => {
  try {
    const allCategoryStock = await CategoryStockmodel.find({}).populate(
      "createdBy",
      "_id fullname username role"
    ); // Populate to get employee details
    res.status(200).json(allCategoryStock);
  } catch (error) {
    console.error(error);
    res
      .status(400)
      .json({ error: "An error occurred while fetching all category stocks" });
  }
};

const getonecategoryStock = async (req, res) => {
  const { categoryStockId } = req.query;
  try {
    const stockCategory = await CategoryStockmodel.findById(
      categoryStockId
    ).populate("createdBy", "_id fullname username role");
    if (!stockCategory) {
      return res.status(404).json({ error: "Category stock not found" });
    }
    res.status(200).json(stockCategory);
  } catch (error) {
    console.error(error);
    res
      .status(404)
      .json({ error: "An error occurred while fetching the category stock" });
  }
};

const updatecategoryStock = async (req, res) => {
  const { categoryStockId } = req.params;
  const { categoryName, categoryCode, notes } = req.body;

  try {
    const updatedCategoryStock = await CategoryStockmodel.findByIdAndUpdate(
      categoryStockId,
      { categoryName, categoryCode, notes },
      { new: true, runValidators: true }
    ).populate("createdBy", "_id fullname username role");

    if (!updatedCategoryStock) {
      return res.status(404).json({ error: "Category stock not found" });
    }

    res.status(200).json(updatedCategoryStock);
  } catch (error) {
    console.error(error);
    res
      .status(400)
      .json({ error: "An error occurred while updating the category stock" });
  }
};

const deleteCategoryStock = async (req, res) => {
  const { categoryStockId } = req.params;

  try {
    const deletedCategoryStock = await CategoryStockmodel.findByIdAndDelete(
      categoryStockId
    );

    if (!deletedCategoryStock) {
      return res.status(404).json({ error: "Category stock not found" });
    }

    res.status(200).json({
      message: "Category stock deleted successfully",
      deletedCategoryStock,
    });
  } catch (error) {
    console.error(error);
    res
      .status(400)
      .json({ error: "An error occurred while deleting the category stock" });
  }
};

export  {
  CreateCategoryStock,
  getallcategoryStock,
  getonecategoryStock,
  updatecategoryStock,
  deleteCategoryStock,
};
