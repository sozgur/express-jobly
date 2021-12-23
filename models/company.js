"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for companies. */

class Company {
  /** Create a company (from data), update db, return new company data.
   *
   * data should be { handle, name, description, numEmployees, logoUrl }
   *
   * Returns { handle, name, description, numEmployees, logoUrl }
   *
   * Throws BadRequestError if company already in database.
   * */

  static async create({ handle, name, description, numEmployees, logoUrl }) {
    const duplicateCheck = await db.query(
      `SELECT handle
           FROM companies
           WHERE handle = $1`,
      [handle]
    );

    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate company: ${handle}`);

    const result = await db.query(
      `INSERT INTO companies
           (handle, name, description, num_employees, logo_url)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"`,
      [handle, name, description, numEmployees, logoUrl]
    );
    const company = result.rows[0];

    return company;
  }

  /** Find all companies. (search filter is optional)
   *
   * Can apply filters
   * - name (case-insensitive)
   * - minEmployees
   * - maxEmployees
   *
   * Returns [{ handle, name, description, numEmployees, logoUrl }, ...]
   * */

  static async findAll(
    searchFilters = { name: null, minEmployees: null, maxEmployees: null }
  ) {
    let sql = [
      `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl" 
                  FROM companies
                  WHERE 1=1`,
    ];

    let values = [];
    let idx = 1;

    if (
      searchFilters.maxEmployees &&
      searchFilters.minEmployees &&
      searchFilters.maxEmployees < searchFilters.minEmployees
    ) {
      throw new BadRequestError("maxEmployees can't smaller than minEmployees");
    }

    if (searchFilters.name) {
      sql.push(`AND name ILIKE $${idx++}`);
      values.push(`%${searchFilters.name}%`);
    }

    if (searchFilters.minEmployees) {
      sql.push(`AND num_employees >= $${idx++}`);
      values.push(searchFilters.minEmployees);
    }

    if (searchFilters.maxEmployees) {
      sql.push(`AND num_employees <= $${idx++}`);
      values.push(searchFilters.maxEmployees);
    }

    sql.push(`ORDER BY name`);

    const companiesRes = await db.query(sql.join(" "), values);

    return companiesRes.rows;
  }

  /** Given a company handle, return data about company.
   *
   * Returns { handle, name, description, numEmployees, logoUrl, jobs }
   *   where jobs is [{ id, title, salary, equity, companyHandle }, ...]
   *
   * Throws NotFoundError if not found.
   **/

  static async get(handle) {
    const companyRes = await db.query(
      `SELECT c.handle,
            c.name,
            c.description,
            c.num_employees AS "numEmployees",
            c.logo_url AS "logoUrl",
            j.id, j.title, j.salary, j.equity
           FROM companies AS c
           LEFT JOIN jobs AS j ON c.handle = j.company_handle
           WHERE handle = $1`,
      [handle]
    );

    const company = companyRes.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    const jobs = companyRes.rows.map((j) => {
      if (j.id) {
        return {
          id: j.id,
          title: j.title,
          salary: j.salary,
          equity: j.equity,
        };
      }
    });

    if (!jobs[0]) {
      jobs.length = 0;
    }

    return {
      handle: company.handle,
      name: company.name,
      description: company.description,
      numEmployees: company.numEmployees,
      logoUrl: company.logoUrl,
      jobs: jobs,
    };
  }

  /** Update company data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {name, description, numEmployees, logoUrl}
   *
   * Returns {handle, name, description, numEmployees, logoUrl}
   *
   * Throws NotFoundError if not found.
   */

  static async update(handle, data) {
    const { setCols, values } = sqlForPartialUpdate(data, {
      numEmployees: "num_employees",
      logoUrl: "logo_url",
    });
    const handleVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE companies 
                      SET ${setCols} 
                      WHERE handle = ${handleVarIdx} 
                      RETURNING handle, 
                                name, 
                                description, 
                                num_employees AS "numEmployees", 
                                logo_url AS "logoUrl"`;
    const result = await db.query(querySql, [...values, handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Delete given company from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   **/

  static async remove(handle) {
    const result = await db.query(
      `DELETE
           FROM companies
           WHERE handle = $1
           RETURNING handle`,
      [handle]
    );
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);
  }
}

module.exports = Company;
