module.exports = (req, res, next) => {
    console.log(`Request was made at: ${new Date().toLocaleString()}`);
    next();
};
