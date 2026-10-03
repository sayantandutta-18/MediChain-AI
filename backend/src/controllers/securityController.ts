import { asyncHandler } from '../utils/asyncHandler';
import { currentUser } from '../middleware/auth';
import * as securityEventService from '../services/securityEventService';

export const getMySecurityEvents = asyncHandler(async (req, res) => {
  const user = currentUser(req);
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 20));
  const skip = (page - 1) * limit;

  const { events, total } = await securityEventService.listSecurityEvents(user.id, limit, skip);

  res.json({
    success: true,
    data: {
      items: events,
      total,
      page,
      pages: Math.ceil(total / limit),
    },
  });
});
