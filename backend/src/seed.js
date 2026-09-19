const bcrypt=require('bcryptjs');
const {pool}=require('./db');

// Seed ONLY authentication accounts. No demo routes, stops, buses or bookings.
(async()=>{
  try{
    const userHash=await bcrypt.hash('user123',10);
    await pool.query(
      'INSERT INTO users(name,email,password_hash,role) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name),role=VALUES(role)',
      ['Demo Passenger','user@example.com',userHash,'user']
    );
    const adminHash=await bcrypt.hash('admin123',10);
    await pool.query(
      'INSERT INTO users(name,email,password_hash,role) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name),role=VALUES(role)',
      ['Demo Admin','admin@example.com',adminHash,'admin']
    );
    console.log('Seed complete. No demo buses/routes/stops were created.');
    console.log('user@example.com / user123 ; admin@example.com / admin123');
  }catch(e){console.error(e);process.exitCode=1}
  finally{await pool.end()}
})();
