app.get("/db-test", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() as now");
    res.json({
      ok: true,
      time: result.rows[0].now,
      hasDatabaseUrl: Boolean(process.env.DATABASE_URL)
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
      errorMessage: error?.message || null,
      errorCode: error?.code || null,
      errorName: error?.name || null,
      errorString: String(error)
    });
  }
});
