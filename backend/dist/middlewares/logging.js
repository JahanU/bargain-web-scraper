"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
module.exports = (req, res, next) => {
    console.log(`Request was made at: ${new Date().toLocaleString()}`);
    next();
};
