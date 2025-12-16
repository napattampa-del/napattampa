from flask import Flask, render_template, jsonify
import psycopg2
import psycopg2.extras

app = Flask(__name__)

# ตั้งค่าการเชื่อมต่อฐานข้อมูลตามที่คุณให้มา
DB_CONFIG = {
    'dbname': 'postgres',
    'user': 'postgres',
    'password': '0810778246',
    'host': 'localhost',
    'port': '5432'
}

def get_db_connection():
    conn = psycopg2.connect(**DB_CONFIG)
    return conn

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/data')
def get_data():
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    # Query ข้อมูล: เลือกเฉพาะ column สำคัญที่จะแสดงผลเพื่อความเร็ว
    # เราใช้ ST_AsGeoJSON เพื่อแปลง geom เป็น json ให้แผนที่อ่านได้ง่ายๆ
    sql = """
        SELECT 
            station, year, month, lat, lon,
            water_temperature_meter_c as temp,
            salinity_meter_psu as salinity,
            do_meter_mg_l as do,
            ph,
            chl_a_spectro_ug_l as chl_a,
            phosphate_um as phosphate,
            nitrate_um as nitrate,
            ST_AsGeoJSON(geom) as geometry
        FROM public.dmcr_data
        WHERE lat IS NOT NULL AND lon IS NOT NULL
        LIMIT 1000; 
    """
    # หมายเหตุ: ใส่ LIMIT ไว้ก่อนเพื่อทดสอบ ถ้าข้อมูลเยอะมากอาจต้องใช้วิธีอื่น
    
    try:
        cur.execute(sql)
        rows = cur.fetchall()
        
        # แปลงโครงสร้างให้เป็น GeoJSON Format มาตรฐาน
        features = []
        for row in rows:
            # ตรวจสอบค่า Null และใส่ค่า default หรือข้ามไป
            if row['geometry'] is None:
                continue
                
            features.append({
                "type": "Feature",
                "geometry":  psycopg2.extras.Json(row['geometry']), # หรือใช้ json.loads ถ้าจำเป็น
                "properties": {
                    "station": row['station'],
                    "date": f"{row['year']}-{row['month']}",
                    "temp": row['temp'],
                    "salinity": row['salinity'],
                    "do": row['do'],
                    "ph": row['ph'],
                    "chl_a": row['chl_a'],
                    "nitrate": row['nitrate'],
                    "phosphate": row['phosphate']
                }
            })
            
        geojson = {
            "type": "FeatureCollection",
            "features": features
        }
        
        return jsonify(geojson)
    except Exception as e:
        return jsonify({"error": str(e)})
    finally:
        cur.close()
        conn.close()

if __name__ == '__main__':
    app.run(debug=True)