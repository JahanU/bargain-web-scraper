const firebaseService = require('../services/firebaseService');

exports.getUsers = async (req, res, next) => {
    firebaseService.getUsers()
        .then((users) => res.status(200).json(users))
        .catch((err) => next(err));
};

exports.addUser = (req, res, next) => {
    firebaseService.addUser(req.body)
        .then((users) => res.status(200).json(users))
        .catch((err) => next(err));
};
