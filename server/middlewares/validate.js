export default (schema, property = "body") => {
  return (req, res, next) => {
    const data = req[property];

    const { error, value } = schema.validate(data, {
      abortEarly: false, // get all errors, not just the first one
      stripUnknown: true, // remove any unknown fields
    });

    if (error) {
      return res.status(400).json({
        message: "Validation Error",
        errors: error.details.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        })),
      });
    }
    // Replace the original data with the validated and sanitized data
    req[property] = value;

    next();
  };
};