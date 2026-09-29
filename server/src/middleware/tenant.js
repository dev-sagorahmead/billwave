// Multi-tenant isolation helper & middleware

function enforceTenant(req, res, next) {
  if (req.user.role === 'super_admin') {
    // Super admin can access or specify any company
    return next();
  }

  if (!req.user.company_id) {
    return res.status(403).json({ error: 'No company association found for this user' });
  }

  // Always force tenant scope to the user's company
  req.tenantCompanyId = req.user.company_id;
  next();
}

function enforceCollectorArea(req, res, next) {
  if (req.user.role === 'collector') {
    if (!req.user.assignedAreaIds || req.user.assignedAreaIds.length === 0) {
      return res.status(403).json({ error: 'Collector is not assigned to any areas' });
    }
  }
  next();
}

module.exports = {
  enforceTenant,
  enforceCollectorArea
};
