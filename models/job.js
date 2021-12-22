"use strict";

const db = require("../db");
const {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for jobs. */

class Job {
  /** Add a job to db (from data), return new job data.
   *
   * data should be { title, salary, equity, companyHandle }
   *
   * Returns {id, title, salary, equity, companyHandle }
   * */
  static async create({ title, salary, equity, companyHandle }) {
    const result = await db.query(
      `INSERT INTO jobs
             (title, salary, equity, company_handle)
             VALUES ($1, $2, $3, $4)
             RETURNING id, title, salary, equity, company_handle AS "companyHandle"`,
      [title, salary, equity, companyHandle]
    );
    const job = result.rows[0];
    return job;
  }

  /** Find all jobs. (search filter is optional)
   *
   * Can apply filters
   * - title (case-insensitive)
   * - minSalary
   * - hasEquity (if true, filter to jobs that provide a non-zero amount of equity.)
   *
   * Returns [{ id, title, salary, equity, company {handle, name} }, ...]
   * */
  static async findAll(
    searchFilters = { title: null, minSalary: null, hasEquity: null }
  ) {
    let sql = [
      `SELECT j.id, j.title, j.salary, j.equity, c.handle, c.name
       FROM jobs AS j
       JOIN companies AS c ON c.handle = j.company_handle
       WHERE 1=1`,
    ];
    let values = [];
    let idx = 1;

    if (searchFilters.title) {
      sql.push(`AND title ILIKE $${idx++}`);
      values.push(`%${searchFilters.title}%`);
    }
    if (searchFilters.minSalary) {
      sql.push(`AND salary >= $${idx++}`);
      values.push(searchFilters.minSalary);
    }
    if (searchFilters.hasEquity) {
      sql.push(`AND equity > 0`);
    }
    sql.push(`ORDER BY title`);

    const jobs = await db.query(sql.join(" "), values);

    return jobs.rows.map((r) => {
      return {
        id: r.id,
        title: r.title,
        salary: r.salary,
        equity: r.equity,
        company: {
          handle: r.handle,
          name: r.name,
        },
      };
    });
  }

  /** Given a job id, return data about job.
   *
   * Returns { id, title, salary, equity, company {handle, name} }
   *
   * Throws NotFoundError if not found.
   */
  static async get(id) {
    const jobRes = await db.query(
      `SELECT j.id, j.title, j.salary, j.equity, c.handle, c.name
          FROM jobs AS j
          JOIN companies AS c ON c.handle = j.company_handle
          WHERE  j.id = $1`,
      [id]
    );
    const job = jobRes.rows[0];
    if (!job) throw new NotFoundError(`No job: ${id}`);

    return {
      id: job.id,
      title: job.title,
      salary: job.salary,
      equity: job.equity,
      company: {
        handle: job.handle,
        name: job.name,
      },
    };
  }

  /** Update job data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {title, salary, equity}
   *
   * Returns { id, title, salary, equity, companyHandle }
   *
   * Throws NotFoundError if not found.
   */
  static async update(id, data) {
    if ("companyHandle" in data || "company_handle" in data || "id" in data) {
      console.log("Helloooooo");
      throw new ForbiddenError("Don't allow update id or company");
    }

    const { setCols, values } = sqlForPartialUpdate(data, {});

    const idIdx = "$" + (values.length + 1);
    const querySql = `UPDATE jobs
                        SET ${setCols}
                        WHERE id = ${idIdx}
                        RETURNING id,
                                  title,
                                  salary,
                                  equity,
                                  company_handle AS "companyHandle"`;
    const result = await db.query(querySql, [...values, id]);
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job: ${id}`);
    return job;
  }

  /** Delete given job from database; returns undefined.
   *
   * Throws NotFoundError if job not found.
   **/

  static async remove(id) {
    const result = await db.query(
      `DELETE
             FROM jobs
             WHERE id = $1
             RETURNING id`,
      [id]
    );
    const job = result.rows[0];
    if (!job) throw new NotFoundError(`No job: ${id}`);
  }
}

module.exports = Job;
