const jwt = require('jsonwebtoken');

exports.isLoggedIn = (req, res, next) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.redirect('/signin');

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    req.role = decoded.role;
    next();
  } catch {
    res.redirect('/signin');
  }
};

exports.isAdmin = (req, res, next) => {
  try {
    const token = req.cookies.token;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') return res.redirect('/signin');
    req.userId = decoded.id;
    next();
  } catch {
    res.redirect('/signin');
  }
};
