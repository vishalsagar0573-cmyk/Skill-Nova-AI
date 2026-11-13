import psycopg2

DATABASE_URL = "postgresql://postgres:Vishal%402004@localhost:5433/skillnova"

try:
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    # Drop tables to allow SQLAlchemy to recreate them with the new schema (columns added in previous steps)
    cur.execute("DROP TABLE IF EXISTS competency_profiles CASCADE;")
    cur.execute("DROP TABLE IF EXISTS resumes CASCADE;")
    
    conn.commit()
    print("Successfully dropped 'competency_profiles' and 'resumes' tables. They will be recreated with the new columns on server restart.")
    
except Exception as e:
    print(f"Error: {e}")
finally:
    if 'conn' in locals():
        cur.close()
        conn.close()
