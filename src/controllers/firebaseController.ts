import express, { Request, Response, NextFunction } from 'express';
const firebaseService = require('../services/firebaseService');

exports.getUsers = async (req: Request, res: Response, next: NextFunction) => {
    firebaseService.getUsers()
        .then((users: any) => res.status(200).json(users))
        .catch((err: Error) => next(err));
};

exports.addUser = (req: Request, res: Response, next: NextFunction) => {
    firebaseService.addUser(req.body)
        .then((users: any) => res.status(200).json(users))
        .catch((err: Error) => next(err));
};
