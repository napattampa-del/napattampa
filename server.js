const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path'); // เพิ่ม module path
const app = express();

// ใช้ PORT จากระบบ หรือ 3000 ถ้าอยู่ในเครื่องตัวเอง
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// **ส่วนที่เพิ่ม: ให้ Server อ่านไฟล์ HTML ในโฟลเดอร์เดียวกัน**
app.use(express.static(path.join(__dirname, 'public'))); 
// หมายเหตุ: คุณควรย้าย index.html ไปใส่ในโฟลเดอร์ชื่อ 'public'

// ตั้งค่า Database (รับค่าจาก Environment Variable)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // ใช้ตัวแปรนี้แทนการ Hardcode
  ssl: {
    rejectUnauthorized: false // จำเป็นสำหรับ Render Database
  }
});

// --- API ต่างๆ (เหมือนเดิม) ---
app.get('/api/available-months', async (req, res) => {
  try {
    const query = `SELECT DISTINCT year, month FROM public.dmcr_data WHERE year IS NOT NULL AND month IS NOT NULL ORDER BY year ASC, month ASC`;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) { console.error(err); res.status(500).send('Server Error'); }
});

app.get('/api/global-stats', async (req, res) => {
  try {
    const query = `
      SELECT 
        MIN(do_ctd_mg_l) as min_do_ctd_mg_l, MAX(do_ctd_mg_l) as max_do_ctd_mg_l,
        MIN(salinity_ctd_psu) as min_salinity_ctd_psu, MAX(salinity_ctd_psu) as max_salinity_ctd_psu,
        MIN(water_temperature_ctd_c) as min_water_temperature_ctd_c, MAX(water_temperature_ctd_c) as max_water_temperature_ctd_c,
        MIN(chl_a_ctd_ug_l) as min_chl_a_ctd_ug_l, MAX(chl_a_ctd_ug_l) as max_chl_a_ctd_ug_l,
        MIN(nitrate_um) as min_nitrate_um, MAX(nitrate_um) as max_nitrate_um,
        MIN(phosphate_um) as min_phosphate_um, MAX(phosphate_um) as max_phosphate_um,
        MIN(tss_mg_l) as min_tss_mg_l, MAX(tss_mg_l) as max_tss_mg_l
      FROM public.dmcr_data
    `;
    const result = await pool.query(query);
    res.json(result.rows[0]);
  } catch (err) { console.error(err); res.status(500).send('Server Error'); }
});

app.get('/api/stations', async (req, res) => {
  try {
    const { year, month } = req.query;
    let queryText = `SELECT * FROM public.dmcr_data WHERE lat IS NOT NULL AND lon IS NOT NULL`;
    const queryParams = [];
    if (year && month) {
      queryText += ` AND year = $1 AND month = $2`;
      queryParams.push(year, month);
    }
    const result = await pool.query(queryText, queryParams);
    res.json(result.rows);
  } catch (err) { console.error(err); res.status(500).send('Server Error'); }
});

app.get('/api/summary/rankings', async (req, res) => {
  try {
    const { param, cruise } = req.query;
    const allowed = ['do_ctd_mg_l', 'salinity_ctd_psu', 'water_temperature_ctd_c', 'chl_a_ctd_ug_l', 'nitrate_um', 'phosphate_um', 'tss_mg_l'];
    if(!allowed.includes(param)) return res.status(400).send("Invalid Parameter");

    let whereClause = `${param} IS NOT NULL`;
    const queryParams = [];
    if (cruise && cruise !== 'all') {
      whereClause += ` AND cruise = $1`;
      queryParams.push(cruise);
    }

    const stationQuery = `SELECT station, AVG(${param}) as avg_val FROM public.dmcr_data WHERE ${whereClause} GROUP BY station ORDER BY avg_val DESC`;
    const yearQuery = `SELECT year, AVG(${param}) as avg_val FROM public.dmcr_data WHERE ${whereClause} GROUP BY year ORDER BY avg_val DESC`;

    const stations = await pool.query(stationQuery, queryParams);
    const years = await pool.query(yearQuery, queryParams);

    res.json({ stations: stations.rows, years: years.rows });
  } catch (err) { console.error(err); res.status(500).send('Server Error'); }
});

app.get('/api/summary/correlation-data', async (req, res) => {
  try {
    const { cruise } = req.query;
    let queryText = `SELECT do_ctd_mg_l, salinity_ctd_psu, water_temperature_ctd_c, chl_a_ctd_ug_l, nitrate_um, phosphate_um, tss_mg_l FROM public.dmcr_data`;
    const queryParams = [];
    if (cruise && cruise !== 'all') {
      queryText += ` WHERE cruise = $1`;
      queryParams.push(cruise);
    }
    const result = await pool.query(queryText, queryParams);
    res.json(result.rows);
  } catch (err) { console.error(err); res.status(500).send('Server Error'); }
});

// **ส่วนที่เพิ่ม: ส่งหน้าเว็บ index.html เมื่อเปิดเข้ามา**
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});