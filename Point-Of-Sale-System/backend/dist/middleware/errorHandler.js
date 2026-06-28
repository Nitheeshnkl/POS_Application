export const errorHandler = (err, req, res, next) => {
    console.error(err.stack);
    let status = err.status || 500;
    let message = err.message || 'Internal Server Error';
    // Map Postgres errors
    if (err.code === '23505') { // unique_violation
        status = 400;
        message = 'Duplicate entry already exists.';
    }
    else if (err.code === '23502') { // not_null_violation
        status = 400;
        message = `Missing required field: ${err.column}`;
    }
    else if (err.code === '22P02') { // invalid_text_representation
        status = 400;
        message = 'Invalid data format provided.';
    }
    else if (err.code === '23503') { // foreign_key_violation
        status = 400;
        message = 'Related record does not exist or cannot be deleted.';
    }
    res.status(status).json({
        message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
};
