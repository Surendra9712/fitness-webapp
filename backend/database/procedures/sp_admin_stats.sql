-- Dashboard KPI counts for GET /admin/stats.
--
-- Returns three result sets, in this order:
--   1. one row of scalar totals (counts + revenue sums)
--   2. order counts grouped by status
--   3. non-admin user counts grouped by status
--
-- Apply with:  python apply_procedures.py
-- (migrate.py only syncs tables, it does not touch routines.)
CREATE PROCEDURE sp_admin_stats()
    READS SQL DATA
BEGIN
    SELECT
        (SELECT COUNT(*) FROM users
          WHERE role = 'trainee' AND deleted_at IS NULL)            AS users_count,
        (SELECT COUNT(*) FROM users
          WHERE role = 'dietitian' AND deleted_at IS NULL)          AS dietitians_count,
        (SELECT COUNT(*) FROM users
          WHERE trainer_request_status = 'pending'
            AND deleted_at IS NULL)                                 AS pending_approvals,
        (SELECT COUNT(*) FROM products
          WHERE status = 'active' AND deleted_at IS NULL)           AS products_count,
        (SELECT COUNT(*) FROM orders
          WHERE deleted_at IS NULL)                                 AS orders_count,
        (SELECT COUNT(*) FROM product_requests
          WHERE status = 'pending')                                 AS pending_requests,
        (SELECT COUNT(*) FROM trainer_assignments
          WHERE status = 'pending_admin' AND deleted_at IS NULL)    AS pending_assignments,
        (SELECT COALESCE(SUM(total_amount), 0) FROM orders
          WHERE deleted_at IS NULL)                                 AS total_revenue,
        (SELECT COALESCE(SUM(total_amount), 0) FROM orders
          WHERE deleted_at IS NULL
            AND created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY))  AS revenue_30d;

    SELECT status, COUNT(*) AS count
      FROM orders
     WHERE deleted_at IS NULL
     GROUP BY status;

    SELECT status, COUNT(*) AS count
      FROM users
     WHERE role != 'admin' AND deleted_at IS NULL
     GROUP BY status;
END
