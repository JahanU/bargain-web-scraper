import { Request, Response, NextFunction } from "express";

module.exports = (req: Request, res: Response, next: NextFunction) => {
    console.log(`Request was made at: ${new Date().toLocaleString()}`);
    next();
};
