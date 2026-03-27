import recipeModel from "../../models/menu/recipe.model.js";

class RecipeService {

  async create(data) {
    return await recipeModel.create(data);
  }

  async findAll(filter = {}) {
    return await recipeModel.find(filter);
  }

  async findById(id) {
    return await recipeModel.findById(id);
  }

  async update(id, data) {
    return await recipeModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await recipeModel.findByIdAndDelete(id);
  }

}

export default new RecipeService();