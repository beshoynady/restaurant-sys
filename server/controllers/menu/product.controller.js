const ProductModel = require("../../models/menu/product.model.js");
const OrderModel = require("../../models/sales/order.model.js");
const EmployeeModel = require("../../models/empoyees/employee.model.js");
const BrandModel = require("../../models/core/brand.model.js");
const BranchModel = require("../../models/core/branch.model.js");
const CategoryModel = require("../../models/menu/menu-category.model.js");
const PreparationSectionModel = require("../../models/kitchen/preparation-section.model.js");
const Joi = required("joi");

const mongoose = require("mongoose");

// Validation schema for creating a new product
const createProductSchema = Joi.object({
  brand: Joi.string().hex().length(24).required(),
  branch: Joi.string().hex().length(24).allow(null),

  name: Joi.object().min(1).required(),
  description: Joi.object().optional(),
  image: Joi.string().allow("", null),

  sku: Joi.string().optional(),
  barcode: Joi.string().optional(),

  category: Joi.string().hex().length(24).required(),
  preparationSection: Joi.string().hex().length(24).required(),

  productType: Joi.string().valid("normal", "addon").default("normal"),

  parentProduct: Joi.string().hex().length(24).allow(null),
  isSizeGroup: Joi.boolean(),
  sizeLabel: Joi.object().optional(),
  sizeOrder: Joi.number().optional(),
  sizes: Joi.array().items(Joi.string().hex().length(24)),

  price: Joi.number().min(0).required(),
  discount: Joi.number().min(0).default(0),
  discountFrom: Joi.date().optional(),
  discountTo: Joi.date().optional(),

  isTaxable: Joi.boolean(),
  status: Joi.string().valid("active", "inactive", "out_of_stock"),
  isSellable: Joi.boolean(),
  displayOrder: Joi.number(),
  createdBy: Joi.string().hex().length(24).required(),
});

const updateProductSchema = Joi.object({
  brand: Joi.string().hex().length(24).optional(),
  branch: Joi.string().hex().length(24).allow(null).optional(),
  name: Joi.object({
    type: Map,
    of: String,
  })
    .min(1)
    .optional(),
  description: Joi.object({
    type: Map,
    of: String,
    default: "",
  }).optional(),
  image: Joi.string().allow("", null).optional(),
  sku: Joi.string().optional(),
  barcode: Joi.string().optional(),
  category: Joi.string().hex().length(24).optional(),
  preparationSection: Joi.string().hex().length(24).optional(),
  productType: Joi.string().valid("normal", "addon").optional(),
  parentProduct: Joi.string().hex().length(24).allow(null).optional(),
  isSizeGroup: Joi.boolean().optional(),
  sizeLabel: Joi.object({
    type: Map,
    of: String,
    default: null,
  }).optional(),
  sizeOrder: Joi.number().optional(),
  sizes: Joi.array().items(Joi.string().hex().length(24)).optional(),
  price: Joi.number().min(0).optional(),
  discount: Joi.number().min(0).optional(),
  discountFrom: Joi.date().optional(),
  discountTo: Joi.date().optional(),
  isTaxable: Joi.boolean().optional(),
  status: Joi.string().valid("active", "inactive", "out_of_stock").optional(),
  isSellable: Joi.boolean().optional(),
  displayOrder: Joi.number().optional(),
  updatedBy: Joi.string().hex().length(24).optional(),
});

const extrasSchema = Joi.array()
  .items(
    Joi.object({
      product: Joi.string().hex().length(24).required(),
      quantity: Joi.number().min(1).default(1),
      minQuantity: Joi.number().min(0).default(0),
      maxQuantity: Joi.number().min(0).default(0),
    })
  )
  .min(1)
  .required();

const comboSchema = Joi.array()
  .items(
    Joi.object({
      name: Joi.object().min(1).required(),
      required: Joi.boolean().default(false),
      minSelection: Joi.number().min(0).default(0),
      maxSelection: Joi.number().min(0).default(0),
      items: Joi.array()
        .items(
          Joi.object({
            product: Joi.string().hex().length(24).required(),
            quantity: Joi.number().min(1).default(1),
          })
        )
        .min(1)
        .required(),
    })
  )
  .min(1)
  .required();

const createProduct = async (req, res) => {
  try {
    const {
      brand,
      branch,
      name,
      description,
      image,
      sku,
      barcode,
      category,
      preparationSection,
      productType,
      parentProduct,
      isSizeGroup,
      sizeLabel,
      sizeOrder,
      price,
      discount,
      discountFrom,
      discountTo,
      isTaxable,
      status,
      isSellable,
      displayOrder,
    } = req.body;
    const createdBy = req.user._id;
    const { error, value } = createProductSchema.validate({
      ...req.body,
      createdBy,
    });
    if (error) return res.status(400).json({ message: error.message });

    if (name) {
      const languages = Object.keys(name);
      for (const lang of languages) {
        if (name[lang].trim() === "") {
          return res
            .status(400)
            .json({ message: `Product name in ${lang} cannot be empty` });
        }
        const existingProduct = await ProductModel.findOne({
          [`name.${lang}`]: name[lang].trim(),
          isDeleted: false,
        });
        if (existingProduct) {
          return res
            .status(400)
            .json({ message: `Product name in ${lang} must be unique` });
        }
      }
    }

    if (parentProduct) {
      const parent = await ProductModel.findById(parentProduct);
      if (!parent)
        return res.status(400).json({ message: "Parent product not found" });
      if (!parent.isSizeGroup) {
        return res
          .status(400)
          .json({ message: "Parent product is not a size group" });
      }
    }

    if (discount > 0) {
      value.priceAfterDiscount = price - discount;
    } else {
      value.priceAfterDiscount = price;
    }

    if (isSizeGroup) {
      value.parentProduct = null;
      value.comboGroups = [];
    }

    if (productType === "addon") {
      value.isSellable = false;
    }
    if (category) {
      const categoryExists = await CategoryModel.findById(category);
      if (!categoryExists) {
        return res.status(400).json({ message: "Category not found" });
      }
    }
    if (preparationSection) {
      const prepSectionExists = await PreparationSectionModel.findById(
        preparationSection
      );
      if (!prepSectionExists) {
        return res
          .status(400)
          .json({ message: "Preparation section not found" });
      }
    }
    if (brand) {
      const brandExists = await BrandModel.findById(brand);
      if (!brandExists) {
        return res.status(400).json({ message: "Brand not found" });
      }
    }
    if (branch) {
      const branchExists = await BranchModel.findById(branch);
      if (!branchExists) {
        return res.status(400).json({ message: "Branch not found" });
      }
    }

    const product = await ProductModel.create({
      brand,
      branch,
      name,
      description,
      image,
      sku,
      barcode,
      category,
      preparationSection,
      productType,
      parentProduct,
      isSizeGroup,
      sizeLabel,
      sizeOrder,
      price,
      discount,
      discountFrom,
      discountTo,
      isTaxable,
      status,
      isSellable,
      displayOrder,
    });

    res.status(201).json({
      message: "Product created successfully",
      product,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const setProductExtras = async (req, res) => {
  try {
    const productId = req.params.id;

    const { error, value } = extrasSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });
    const extras = value;
    const existingProduct = await ProductModel.findById(productId);
    if (!existingProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (existingProduct.isCombo || existingProduct.isSizeGroup) {
      return res.status(400).json({
        message: "Extras cannot be added to combo or size group products",
      });
    }

    const extraProductIds = extras.map((e) => e.product);

    const existingExtras = await ProductModel.find({
      _id: { $in: extraProductIds },
    });
    if (existingExtras.length !== extraProductIds.length) {
      return res
        .status(400)
        .json({ message: "One or more extra products not found" });
    }
    extras.forEach((extra) => {
      if (extra.maxQuantity > 0 && extra.minQuantity > extra.maxQuantity) {
        return res
          .status(400)
          .json({ message: "minQuantity cannot be greater than maxQuantity" });
      }
    });

    for (const p of existingExtras) {
      if (p.productType !== "addon") {
        return res.status(400).json({
          message: "Extra products must be of type addon",
        });
      }
    }

    const product = await ProductModel.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          hasExtras: true,
          extras,
        },
      },
      { new: true }
    );

    if (!product) return res.status(404).json({ message: "Product not found" });

    res.json({ data: product });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const addSizeToProduct = async (req, res) => {
  try {
    const { sizes } = req.body;
    const { product } = req.params;
    const existingProduct = await ProductModel.findById(product);
    if (!existingProduct) {
      return res.status(404).json({ message: " product not found" });
    }

    if (!existingProduct.isSizeGroup) {
      return res.status(400).json({ message: "Product is not a size group" });
    }
    const sizeProducts = await ProductModel.find({ _id: { $in: sizes } });

    for (const size of sizeProducts) {
      if (size.productType !== "normal") {
        return res.status(400).json({
          message: "Size product type must be normal",
        });
      }
      if (size.parentProduct?.toString() !== product) {
        return res.status(400).json({
          message: "Size parentProduct must reference size group",
        });
      }
    }

    const updatedProduct = await ProductModel.findByIdAndUpdate(
      product,
      { $addToSet: { sizes: { $each: sizes } } },
      { new: true }
    );

    res.status(200).json({ data: updatedProduct });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const setComboGroups = async (req, res) => {
  try {
    const { comboGroups } = req.body;
    const product = req.params.id;
    const { error, value } = comboSchema.validate({ comboGroups });
    if (error) return res.status(400).json({ message: error.message });
    const existingProduct = await ProductModel.findById(product);
    if (!existingProduct) {
      return res.status(404).json({ message: "Product not found" });
    }
    if (existingProduct.productType !== "normal") {
      return res
        .status(400)
        .json({ message: "Only normal products can be combos" });
    }
    if (existingProduct.isSizeGroup) {
      return res
        .status(400)
        .json({ message: "Size group products cannot be combos" });
    }

    for (const group of comboGroups) {
      for (const item of group.items) {
        const exists = await ProductModel.exists({ _id: item.product });
        if (!exists) {
          return res.status(400).json({ message: "Combo item not found" });
        }
      }
    }

    if (existingProduct.hasExtras) {
      return res.status(400).json({
        message: "Combo product cannot have extras",
      });
    }

    for (const group of comboGroups) {
      if (group.maxSelection > 0 && group.minSelection > group.maxSelection) {
        return res.status(400).json({
          message: "minSelection cannot be greater than maxSelection",
        });
      }
    }

    const updateProduct = await ProductModel.findByIdAndUpdate(
      req.params.id,
      {
        isCombo: true,
        comboGroups,
      },
      { new: true }
    );

    if (!updateProduct)
      return res.status(404).json({ message: "Product not found" });

    res.json({ data: updateProduct });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      image,
      price,
      discount,
      status,
      isSellable,
      displayOrder,
    } = req.body;
    const { error, value } = updateProductSchema.validate({
      name,
      description,
      image,
      price,
      discount,
      status,
      isSellable,
      displayOrder,
    });
    if (error) return res.status(400).json({ message: error.message });

    const product = await ProductModel.findByIdAndUpdate(
      req.params.id,
      {
        name,
        description,
        image,
        price,
        discount,
        status,
        isSellable,
        displayOrder,
        updatedBy: req.user._id,
      },
      { new: true }
    );

    if (!product) return res.status(404).json({ message: "Product not found" });

    res.json({ data: product });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getProductById = async (req, res) => {
  try {
    const product = await ProductModel.findById(req.params.id)
      .populate("category")
      .populate("preparationSection")
      .populate("extras.product")
      .populate("comboGroups.items.product")
      .populate("parentProduct");

    if (!product) return res.status(404).json({ message: "Product not found" });

    res.json({ data: product });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const searchProducts = async (req, res) => {
  const { q } = req.query;

  const products = await ProductModel.find({
    $expr: {
      $gt: [
        {
          $size: {
            $filter: {
              input: { $objectToArray: "$name" },
              as: "n",
              cond: {
                $regexMatch: {
                  input: "$$n.v",
                  regex: q,
                  options: "i",
                },
              },
            },
          },
        },
        0,
      ],
    },
    isDeleted: false,
  });

  res.json({ data: products });
};

const getProducts = async (req, res) => {
  const {
    brand,
    branch,
    page = 1,
    limit = 20,
    sort = "-createdAt",
    category,
    productType,
    status,
    isCombo,
    isDeleted,
  } = req.query;

  const filter = {};
  if (brand) filter.brand = brand;
  if (branch) filter.branch = branch;
  if (category) filter.category = category;
  if (productType) filter.productType = productType;
  if (status) filter.status = status;
  if (isCombo) filter.isCombo = isCombo === "true";
  if (isSellable) filter.isSellable = isSellable === "true";
  if (isDeleted) filter.isDeleted = isDeleted === "true";

  const products = await ProductModel.find(filter)
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await ProductModel.countDocuments(filter);

  res.json({ total, page: Number(page), data: products });
};

const getProductsForMenu = async (req, res) => {
  const { brand, branch } = req.query;

  const products = await ProductModel.find({
    brand,
    $or: [{ branch }, { branch: null }],
    status: "active",
    isSellable: true,
    isDeleted: false,
  })
    .populate("sizes", "name price")
    .populate("extras.product", "name price")
    .sort("displayOrder");

  res.json({ data: products });
};

const getProductsByCategory = async (req, res) => {
  const { categoryId } = req.params;

  const products = await ProductModel.find({
    category: categoryId,
    status: "active",
    isSellable: true,
    isDeleted: false,
  }).sort("displayOrder");

  res.json({ data: products });
};

const toggleProductStatus = async (req, res) => {
  const product = await ProductModel.findById(req.params.id);
  if (!product) return res.status(404).json({ message: "Product not found" });

  product.status = product.status === "active" ? "inactive" : "active";
  await product.save();

  res.json({ data: product });
};

const removeProductExtras = async (req, res) => {
  const product = await ProductModel.findByIdAndUpdate(
    req.params.id,
    { hasExtras: false, extras: [] },
    { new: true }
  );

  res.json({ data: product });
};

const duplicateProduct = async (req, res) => {
  try {
    const product = await ProductModel.findById(req.params.id).lean();
    if (!product)
      return res.status(404).json({ message: "Product not found" });

    // ❌ لا ننسخ منتجات محذوفة
    if (product.isDeleted) {
      return res
        .status(400)
        .json({ message: "Cannot duplicate deleted product" });
    }

    delete product._id;
    delete product.createdAt;
    delete product.updatedAt;

    if (product.name instanceof Map || typeof product.name === "object") {
      for (const lang in product.name) {
        product.name[lang] = `${product.name[lang]} (Copy)`;
      }
    }

    product.createdBy = req.user._id;
    product.updatedBy = undefined;

    product.sku = undefined;
    product.barcode = undefined;

    product.status = "inactive";
    product.isSellable = false;

    product.parentProduct = null;
    product.sizes = [];
    product.isSizeGroup = false;

    const newProduct = await ProductModel.create(product);

    res.status(201).json({ data: newProduct });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



const softDeleteProduct = async (req, res) => {
  const product = await ProductModel.findByIdAndUpdate(
    req.params.id,
    {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: req.user._id,
    },
    { new: true }
  );

  res.json({ data: product });
};

const deleteProductPermanently = async (req, res) => {
  const used = await OrderModel.exists({
    "products.productId": req.params.id,
  });

  if (used)
    return res.status(400).json({
      message: "Product cannot be deleted because it was used in orders",
    });

  await ProductModel.findByIdAndDelete(req.params.id);

  res.json({ message: "Product deleted permanently" });
};

module.exports = {
  createProduct,
  updateProduct,
  getProductById,
  getProducts,
  searchProducts,
  getProductsForMenu,
  getProductsByCategory,
  setProductExtras,
  removeProductExtras,
  addSizeToProduct,
  setComboGroups,
  toggleProductStatus,
  softDeleteProduct,
  deleteProductPermanently,
  duplicateProduct,
};
