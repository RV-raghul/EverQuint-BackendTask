const errorHandler = (err, req, res, next ) => {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        error: err.errorType || 'InternalServerError',
        message: err.message || 'Something went wrong',
    });
};

export default errorHandler