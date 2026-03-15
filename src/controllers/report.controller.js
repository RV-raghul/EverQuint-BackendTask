import reportService from '../services/report.service.js';

const getRoomUtilization = async (req, res, next) => {
  try {
    const { from, to } = req.query;

    // Both from and to are required
    if (!from || !to) {
      return res.status(400).json({
        error: 'ValidationError',
        message: '"from" and "to" query parameters are required',
      });
    }

    const report = await reportService.getRoomUtilization(from, to);
    res.json(report);
  } catch (err) {
    next(err);
  }
};

export default { getRoomUtilization };