const { BadRequestError } = require("../expressError");

/** Create setting columns and values from data
 *
 * If field name not match with db column name (meaning the field is in the jsToSql),
 * change the name with same in the table. (take jsToSql value),
 * create with index number to update the value
 *
 * Returns { setCols: '"first_name"=$1, "last_name"=$2, "age"=$3',
 *          values: ["Ali", "Gel", 32]}
 *
 * Throw BadRequestError if there is no data to update
 */

function sqlForPartialUpdate(dataToUpdate, jsToSql) {
  const keys = Object.keys(dataToUpdate);
  if (keys.length === 0) throw new BadRequestError("No data");

  // {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
  const cols = keys.map(
    (colName, idx) => `"${jsToSql[colName] || colName}"=$${idx + 1}`
  );

  return {
    setCols: cols.join(", "),
    values: Object.values(dataToUpdate),
  };
}

module.exports = { sqlForPartialUpdate };
