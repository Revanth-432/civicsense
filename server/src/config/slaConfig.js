const slaCategories = {
  POTHOLE: 48,
  GARBAGE: 24,
  STREETLIGHT: 72,
  DRAINAGE: 24,
  ROAD_DAMAGE: 48,
};

const calculateDueDate = (category, createdAt) => {
  const hours = slaCategories[category] || 72; // Default to 72 if category not found
  const dueDate = new Date(createdAt);
  dueDate.setHours(dueDate.getHours() + hours);
  return dueDate;
};

module.exports = {
  slaCategories,
  calculateDueDate
};
