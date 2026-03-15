const throwError = (message, status = 400, errors = []) => {
  const err = new Error(message);
  err.statusCode = status;
  err.errors = errors;
  throw err;
};

export default throwError;