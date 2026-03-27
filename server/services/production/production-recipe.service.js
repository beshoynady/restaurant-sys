import production-recipeModel from "../../models/production/production-recipe.model.js";

class Production-recipeService {

  async create(data) {
    return await production-recipeModel.create(data);
  }

  async findAll(filter = {}) {
    return await production-recipeModel.find(filter);
  }

  async findById(id) {
    return await production-recipeModel.findById(id);
  }

  async update(id, data) {
    return await production-recipeModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await production-recipeModel.findByIdAndDelete(id);
  }

}

export default new Production-recipeService();