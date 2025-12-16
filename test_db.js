const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'postgres',
  password: '0810778246',
  port: 5432,
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ เชื่อมต่อไม่ได้! สาเหตุ:', err.message);
  } else {
    console.log('✅ เชื่อมต่อสำเร็จ! เวลาปัจจุบัน:', res.rows[0].now);
  }
  pool.end();
});