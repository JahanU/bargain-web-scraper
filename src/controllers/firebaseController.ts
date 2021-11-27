const firebaseService = require('../services/firebaseService');
import express, { Request, Response, NextFunction } from 'express';

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
