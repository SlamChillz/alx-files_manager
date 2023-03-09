/**
 * Transforms data from database into presentable outputs
 */
module.exports = (data) => {
  const transformed = [];
  for (const row of data) {
    const refined = {};
    refined.id = row._id.valueOf();
    refined.userId = row.userId.valueOf();
    refined.name = row.name;
    refined.type = row.type;
    refined.isPublic = row.isPublic;
    if (row.parentId === '0') {
      refined.parentId = '0';
    } else {
      refined.parentId = row.parentId.valueOf();
    }
    transformed.push(refined);
  }
  return transformed;
};
