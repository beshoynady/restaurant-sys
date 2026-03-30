import Joi from "joi";
import { objectId, buildJoiSchema } from "../../utils/joiFactory.js";
import MenuCategoryModel from "../../models/menu/menu-category.model.js";

/* =========================
   Create Schema
========================= */
export const createMenuCategorySchema = buildJoiSchema(MenuCategoryModel.schema);

/* =========================
   Update Schema (all optional except _id & updatedBy)
========================= */
export const updateMenuCategorySchema = (function() {
  const schema = buildJoiSchema(MenuCategoryModel.schema);
  return schema.fork(Object.keys(MenuCategoryModel.schema.paths), (field) => field.optional())
               .keys({
                 _id: objectId().required(),
                 updatedBy: objectId().required()
               });
})();

/* =========================
   Params Schema
========================= */
export const menuCategoryParamsSchema = Joi.object({
  _id: objectId().required()
});

/* =========================
   Query Schema
========================= */
export const menuCategoryQuerySchema = Joi.object({
  limit: Joi.number().min(1).optional(),
  skip: Joi.number().min(0).optional(),
  search: Joi.string().optional()
});