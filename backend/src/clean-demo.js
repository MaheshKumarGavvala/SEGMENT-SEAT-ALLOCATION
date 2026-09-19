const {pool}=require('./db');

// Removes the original seeded/demo transport data only.
// It does NOT remove user/admin accounts.
(async()=>{
  const conn=await pool.getConnection();
  try{
    await conn.beginTransaction();

    const demoServices=['ML-204','CL-118','SW-402','RR-071'];
    const placeholders=demoServices.map(()=>'?').join(',');
    const [demoBuses]=await conn.query(`SELECT id,route_id FROM buses WHERE service_number IN (${placeholders})`,demoServices);
    const busIds=demoBuses.map(x=>Number(x.id));
    const routeIds=[...new Set(demoBuses.map(x=>Number(x.route_id)))];

    if(busIds.length){
      const bp=busIds.map(()=>'?').join(',');
      // Delete only bookings belonging to the known demo buses.
      const [bookings]=await conn.query(`SELECT id FROM bookings WHERE bus_id IN (${bp})`,busIds);
      const bookingIds=bookings.map(x=>Number(x.id));
      if(bookingIds.length){
        const kp=bookingIds.map(()=>'?').join(',');
        await conn.query(`DELETE FROM payments WHERE booking_id IN (${kp})`,bookingIds);
        await conn.query(`DELETE FROM passengers WHERE booking_id IN (${kp})`,bookingIds);
        await conn.query(`DELETE FROM booking_segments WHERE booking_id IN (${kp})`,bookingIds);
        await conn.query(`DELETE FROM bookings WHERE id IN (${kp})`,bookingIds);
      }
      await conn.query(`DELETE FROM buses WHERE id IN (${bp})`,busIds);
    }

    // The old seed used this route code. Remove it only when no remaining bus uses it.
    const [routes]=await conn.query("SELECT id FROM routes WHERE code='HYD-VJA'");
    for(const route of routes){
      const [[usage]]=await conn.query('SELECT COUNT(*) count FROM buses WHERE route_id=?',[route.id]);
      if(Number(usage.count)===0) await conn.query('DELETE FROM routes WHERE id=?',[route.id]);
    }

    await conn.commit();
    console.log(`Demo transport cleanup complete. Removed ${busIds.length} seeded bus service(s).`);
    console.log('Only buses/routes/stops created by Admin remain.');
  }catch(e){
    await conn.rollback();
    console.error('Demo cleanup failed:',e);
    process.exitCode=1;
  }finally{conn.release();await pool.end()}
})();
